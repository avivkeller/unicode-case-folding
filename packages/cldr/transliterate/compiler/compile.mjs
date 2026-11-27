import * as cldr from "@internal/build/sources/cldr";
import {
  ANCHOR_END,
  ANCHOR_START,
  COMPOUND,
  INDEX_FIRST_VALUE,
  INDEX_HOLE,
  NORMALIZE,
  QUANTIFIER,
  RULES,
  SEGMENT,
  STRINGS,
  USE,
  WORD_BREAK,
} from "../format.mjs";
import { CodePointSet } from "./code-point-set.mjs";
import { scriptNames } from "./properties.mjs";
import { parseTransformRules } from "./rule-parser.mjs";

const NORMALIZATION_FORMS = new Set(["NFC", "NFD", "NFKC", "NFKD"]);
// Rules starting with larger sets are tried for every character instead
const MAX_INDEXED_SET = 1024;
// A gap costs a character each in a segment, a new segment about ten
const MAX_INDEX_GAP = 16;
const CURSOR_MARK = Symbol("cursor");

const registry = await loadRegistry();
const scriptNamesByCode = scriptNames();

export function canonicalId(id) {
  return lookup(id)?.id;
}

export function registeredIds() {
  return registry;
}

export class Compiler {
  constructor(shared) {
    this.shared = shared;
    this.cache = new Map();
  }

  compile(id) {
    const entry = lookup(id);
    if (entry === undefined) throw new Error(`Unknown transform: ${id}`);
    return this.compileEntry(entry);
  }

  compileEntry(entry) {
    const key = `${entry.file} ${entry.direction}`;
    if (!this.cache.has(key)) {
      this.cache.set(key, this.compileFile(entry));
    }
    return this.cache.get(key);
  }

  compileFile({ text, direction }) {
    const parsed = parseTransformRules(text, direction);
    // As in ICU, the global filter of rules without "::" transforms is unused
    const hasTransforms = parsed.steps.some((step) => step.kind !== "rules");
    const filter = hasTransforms && parsed.filter ? toSet(parsed.filter) : null;

    const children = [];
    for (const step of parsed.steps) {
      if (step.kind === "rules") {
        if (step.rules.length > 0)
          children.push(compileRules(step.rules, this));
        continue;
      }
      const block = this.compileBlock(step.ids);
      if (
        block.filter === null ||
        (filter !== null && parsed.steps.length === 1)
      ) {
        children.push(...block.children);
      } else {
        children.push([COMPOUND, block.filter, block.children]);
      }
    }
    if (children.length === 1 && filter === null) return children[0];
    return [COMPOUND, filter, children];
  }

  // As in ICU, the first filter of consecutive "::" rules applies to all
  compileBlock(ids) {
    const children = [];
    for (const id of ids) {
      const node = id === null ? null : this.reference(id);
      if (node === null) continue;
      if (node[0] === COMPOUND && node[1] === null) children.push(...node[2]);
      else children.push(node);
    }
    const filter = ids[0]?.filter ? toSet(ids[0].filter) : null;
    return { filter, children };
  }

  reference({ source, target, variant, filter }) {
    const set = filter && toSet(filter);
    if (source.toLowerCase() === "any" && variant === "") {
      const upper = target.toUpperCase();
      if (NORMALIZATION_FORMS.has(upper)) return [NORMALIZE, set, upper];
      if (upper === "NULL") return null;
      if (upper === "BREAKINTERNAL") return [WORD_BREAK, set];
    }
    const name = `${source}-${target}${variant ? `/${variant}` : ""}`;
    const entry = lookup(name);
    if (entry === undefined) throw new Error(`Unknown transform: ${name}`);
    if (this.shared.has(entry.id)) return [USE, set, entry.id];
    const node = this.compileEntry(entry);
    return set === null ? node : [node[0], set, ...node.slice(2)];
  }
}

function lookup(id) {
  const direct = registry.get(id.toLowerCase());
  if (direct !== undefined) return direct;
  const match = /^([^-/]+)-([^/]+)(\/.*)?$/.exec(id);
  if (match === null) return undefined;
  const [, source, target, variant = ""] = match;
  const name = (code) => scriptNamesByCode.get(code) ?? code;
  return registry.get(
    `${name(source)}-${name(target)}${variant}`.toLowerCase(),
  );
}

async function loadRegistry() {
  const { available } = (await cldr.json("cldr-transforms", "transforms.json"))
    .transforms;
  const entries = new Map();
  for (const name of available) {
    // A few listed IDs (such as "Lao-Latin") have no rules
    const metadata = await cldr
      .json("cldr-transforms", `transforms/${name}.json`)
      .catch(() => null);
    if (metadata === null) continue;
    const text = await cldr.text(
      "cldr-transforms",
      `transforms/${metadata._rulesFile}`,
    );
    const variant = metadata._variant ? `/${metadata._variant}` : "";
    const register = (direction, ids) => {
      const aliases = ids.filter(Boolean);
      // Prefer script names to codes: "Han-Latin", not "Hans-Latn"
      const names = aliases.filter((alias) => !alias.includes("-t-"));
      const id =
        names.find((alias) => !/^[A-Z][a-z]{3}-[A-Z][a-z]{3}$/.test(alias)) ??
        names[0];
      const entry = { id, file: metadata._rulesFile, text, direction };
      for (const alias of aliases) {
        const key = alias.toLowerCase();
        if (!entries.has(key)) entries.set(key, entry);
      }
    };
    const split = (aliases) => aliases?.split(" ") ?? [];
    register("forward", [
      ...split(metadata._alias),
      `${metadata._source}-${metadata._target}${variant}`,
      ...split(metadata._aliasBcp47),
    ]);
    if (metadata._direction === "both") {
      register("reverse", [
        ...split(metadata._backwardAlias),
        `${metadata._target}-${metadata._source}${variant}`,
        ...split(metadata._backwardAliasBcp47),
      ]);
    }
  }
  return entries;
}

function toSet(unicodeSet) {
  return unicodeSet.codePoints.boundaries;
}

function compileRules(parsedRules, compiler) {
  for (const rule of parsedRules) {
    if (rule.cursor < 0 || rule.cursor > rule.output.length) {
      throw new Error(`Unsupported cursor offset (@): ${rule.source}`);
    }
  }
  const firstSets = parsedRules.map(firstSet);
  const wide = [];
  const candidates = new Map();
  firstSets.forEach((first, ruleIndex) => {
    if (first === null || first.size > MAX_INDEXED_SET) {
      wide.push(ruleIndex);
      return;
    }
    for (const codePoint of first.codePoints()) {
      if (!candidates.has(codePoint)) candidates.set(codePoint, []);
      candidates.get(codePoint).push(ruleIndex);
    }
  });

  const used = new Set(wide);
  const values = new Map();
  for (const [codePoint, list] of candidates) {
    for (const ruleIndex of wide) {
      const first = firstSets[ruleIndex];
      if (first === null || first.has(codePoint)) list.push(ruleIndex);
    }
    list.sort((a, b) => a - b);
    const output = simpleOutput(parsedRules[list[0]]);
    if (output !== null) {
      values.set(codePoint, output);
    } else {
      for (const ruleIndex of list) used.add(ruleIndex);
      values.set(codePoint, list);
    }
  }

  const usedRules = [...used].sort((a, b) => a - b);
  const renumber = new Map(usedRules.map((ruleIndex, i) => [ruleIndex, i]));
  const { distinctValues, segments } = buildIndex(values, (value) =>
    typeof value === "string" ? value : value.map((i) => renumber.get(i)),
  );

  const sets = [];
  const setIndexes = new Map();
  const functions = [];
  const internSet = (unicodeSet) => {
    const boundaries = unicodeSet.codePoints.boundaries;
    const key = boundaries.join();
    if (!setIndexes.has(key)) setIndexes.set(key, sets.push(boundaries) - 1);
    const reference = -1 - setIndexes.get(key);
    if (unicodeSet.strings.size === 0) return reference;
    const strings = [...unicodeSet.strings].filter(Boolean);
    strings.sort((a, b) => [...b].length - [...a].length);
    return [STRINGS, reference, strings];
  };
  const addFunction = (id) => functions.push(compiler.reference(id)) - 1;
  const rules = usedRules.map((ruleIndex) =>
    compileRule(parsedRules[ruleIndex], internSet, addFunction),
  );

  const node = [
    RULES,
    null,
    rules,
    distinctValues,
    segments,
    wide.map((ruleIndex) => renumber.get(ruleIndex)),
    sets,
  ];
  if (functions.length > 0) node.push(functions);
  return node;
}

// The most frequent values come first, for the shortest UTF-8
function buildIndex(values, compile) {
  const keys = new Map();
  const counts = new Map();
  for (const value of values.values()) {
    const key = JSON.stringify(compile(value));
    keys.set(value, key);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const ranked = [...counts.keys()].sort(
    (a, b) => counts.get(b) - counts.get(a),
  );
  if (INDEX_FIRST_VALUE + ranked.length > 0xd800) {
    throw new Error("Too many distinct values for an index");
  }
  const ranks = new Map(ranked.map((key, i) => [key, i]));

  const segments = [];
  let previous = -Infinity;
  for (const [codePoint, value] of [...values].sort((a, b) => a[0] - b[0])) {
    const gap = codePoint - previous - 1;
    if (gap > MAX_INDEX_GAP) {
      segments.push(codePoint, "");
    } else {
      segments[segments.length - 1] +=
        String.fromCharCode(INDEX_HOLE).repeat(gap);
    }
    segments[segments.length - 1] += String.fromCharCode(
      INDEX_FIRST_VALUE + ranks.get(keys.get(value)),
    );
    previous = codePoint;
  }
  return { distinctValues: ranked.map((key) => JSON.parse(key)), segments };
}

function compileRule(rule, internSet, addFunction) {
  const pattern = (elements) =>
    elements.map((element) => compileMatcher(element, internSet));
  const { output, cursor } = compileOutput(
    rule.output,
    rule.cursor,
    addFunction,
  );
  const tuple = [
    pattern(rule.key),
    output,
    rule.post.length > 0 ? pattern(rule.post) : 0,
    rule.ante.length > 0 ? pattern(rule.ante) : 0,
    (rule.anchorStart ? ANCHOR_START : 0) | (rule.anchorEnd ? ANCHOR_END : 0),
  ];
  if (rule.cursor !== rule.output.length) tuple.push(cursor);
  else while (tuple.length > 2 && tuple.at(-1) === 0) tuple.pop();
  return tuple;
}

function simpleOutput(rule) {
  const [key] = rule.key;
  const isSingle =
    rule.key.length === 1 &&
    (typeof key === "number" ||
      (key.kind === "set" && key.set.strings.size === 0));
  const isPlain =
    rule.ante.length === 0 &&
    rule.post.length === 0 &&
    !rule.anchorStart &&
    !rule.anchorEnd &&
    rule.cursor === rule.output.length &&
    rule.output.every((element) => typeof element === "number");
  return isSingle && isPlain ? String.fromCodePoint(...rule.output) : null;
}

function compileMatcher(element, internSet) {
  if (typeof element === "number") return element;
  switch (element.kind) {
    case "set":
      return internSet(element.set);
    case "quantifier":
      return [
        QUANTIFIER,
        element.min,
        element.max,
        element.pattern.map((e) => compileMatcher(e, internSet)),
      ];
    case "segment":
      return [
        SEGMENT,
        element.number,
        element.pattern.map((e) => compileMatcher(e, internSet)),
      ];
  }
  throw new Error(`Unexpected matcher ${element.kind}`);
}

function compileOutput(elements, cursor, addFunction) {
  if (elements.every((element) => typeof element === "number")) {
    return { output: String.fromCodePoint(...elements), cursor };
  }
  const parts = compileParts(elements, cursor, addFunction);
  const cursorPart = parts.indexOf(CURSOR_MARK);
  if (cursorPart >= 0) parts.splice(cursorPart, 1);
  return { output: parts, cursor: cursorPart < 0 ? parts.length : cursorPart };
}

function compileParts(elements, cursor, addFunction) {
  const parts = [];
  elements.forEach((element, i) => {
    if (i === cursor) parts.push(CURSOR_MARK);
    if (typeof element === "number") {
      const char = String.fromCodePoint(element);
      if (typeof parts.at(-1) === "string") parts[parts.length - 1] += char;
      else parts.push(char);
    } else if (element.kind === "segment") {
      parts.push(element.number);
    } else {
      parts.push([
        addFunction(element.id),
        compileParts(element.output, -1, addFunction),
      ]);
    }
  });
  return parts;
}

function firstSet(rule) {
  const pattern = rule.key.length > 0 ? rule.key : rule.post;
  return pattern.length > 0 ? elementFirstSet(pattern[0]) : null;
}

function elementFirstSet(element) {
  if (typeof element === "number") return CodePointSet.of(element);
  switch (element.kind) {
    case "set": {
      const starts = [...element.set.strings]
        .filter(Boolean)
        .map((string) => string.codePointAt(0));
      return element.set.codePoints.union(CodePointSet.of(...starts));
    }
    case "segment":
      return element.pattern.length > 0
        ? elementFirstSet(element.pattern[0])
        : null;
    case "quantifier":
      // A pattern that can match nothing could match at any character
      return element.min > 0 && element.pattern.length > 0
        ? elementFirstSet(element.pattern[0])
        : null;
  }
  return null;
}
