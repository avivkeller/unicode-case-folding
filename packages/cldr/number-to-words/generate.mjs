// Compiles CLDR's RBNF rules, as ICU4J's NFRuleSet/NFRule/NFSubstitution do,
// into the tuples layout.mjs names. A body is text, a part index or a list of
// them; fraction rules are [body, ...(decimal separator, body)].
import * as cldr from "@internal/build/sources/cldr";
import { encodeLocaleTable } from "@internal/helpers/locale";
import {
  ABSOLUTE,
  CARDINAL_PLURAL,
  DIGITS,
  FILE_DEFAULT,
  FILE_NAMES,
  FILE_SETS,
  FRACTIONAL,
  INTEGRAL,
  MODULUS,
  MULTIPLIER,
  NUMERATOR,
  ORDINAL_PLURAL,
  PART_KIND,
  PATTERN_GROUPING,
  PATTERN_MAX_FRACTION,
  PATTERN_MIN_FRACTION,
  PATTERN_MIN_INTEGER,
  PATTERN_SHOW_DECIMAL,
  PLURAL_FORMS,
  SAME,
  SET_BASES,
  SET_BODIES,
  SET_DEFAULT,
  SET_DIVISORS,
  SET_FRACTION_LCM,
  SET_IMPROPER,
  SET_INFINITY,
  SET_NAN,
  SET_NEGATIVE,
  SET_PARTS,
  SET_PROPER,
  SUBSTITUTION_OPTION,
  SUBSTITUTION_PATTERN,
  SUBSTITUTION_SET,
} from "./layout.mjs";

export const VERSION = await cldr.version();

const FILE_TYPES = ["SpelloutRules", "OrdinalRules", "NumberingSystemRules"];
const PREFIXES = [
  "<<",
  "<%",
  "<#",
  "<0",
  ">>",
  ">%",
  ">#",
  ">0",
  "=%",
  "=#",
  "=0",
];
const SPECIAL = { "-x": "negative", Inf: "infinity", NaN: "nan" };
const FRACTION_RULES = { 0: "proper", x: "improper" }; // "0.x", "x.x"

const { availableLocales } = await cldr.json(
  "cldr-core",
  "availableLocales.json",
);
const { parentLocale: parentLocales } = (
  await cldr.json("cldr-core", "supplemental/parentLocales.json")
).supplemental.parentLocales;
const likelySubtags = await cldr.likelySubtags();

const filesByLocale = new Map();
for (const locale of new Set(["und", ...availableLocales.full])) {
  if (!(await cldr.has("cldr-rbnf", `rbnf/${locale}.json`))) continue;
  const entry = await cldr.json("cldr-rbnf", `rbnf/${locale}.json`);
  const files = {};
  for (const [type, value] of Object.entries(entry.rbnf.rbnf ?? entry.rbnf)) {
    if (type === "identity") continue;
    if (!FILE_TYPES.includes(type)) {
      throw new Error(`Unknown RBNF file type ${type}`);
    }
    files[type] = value._rbnfRulesFile;
  }
  filesByLocale.set(locale, files);
}

function parentOf(locale) {
  if (locale === "und") return null;
  if (parentLocales[locale]) return parentLocales[locale];
  const subtags = locale.split("-");
  if (subtags.length === 2 && /^[A-Z][a-z]{3}$/.test(subtags[1])) {
    const likely = likelySubtags[subtags[0]]?.split("-")[1];
    if (likely && likely !== subtags[1]) return "und";
  }
  return subtags.length === 1 ? "und" : subtags.slice(0, -1).join("-");
}

function resolveFile(locale, type) {
  for (let l = locale; l !== null; l = parentOf(l)) {
    const file = filesByLocale.get(l)?.[type];
    if (file) return file;
  }
  throw new Error(`No ${type} for ${locale}`);
}

const compiledFiles = new Map();

async function compileFile(fileName) {
  if (!compiledFiles.has(fileName)) {
    const text = await cldr.text("cldr-rbnf", `rbnf/${fileName}`);
    compiledFiles.set(fileName, compileRules(text, fileName));
  }
  return compiledFiles.get(fileName);
}

function compileRules(text, fileName) {
  const fail = (message) => {
    throw new Error(`${fileName}: ${message}`);
  };

  const descriptions = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const header = /^%(%?[\w-]+):$/.exec(line);
    if (header) {
      descriptions.push({ name: header[1], rules: [] });
    } else if (!descriptions.length || !line.endsWith(";")) {
      fail(`unexpected line: ${line}`);
    } else {
      descriptions.at(-1).rules.push(line.slice(0, -1));
    }
  }
  const names = new Set(descriptions.map(({ name }) => name));
  const nameOf = (token) => {
    const name = token.slice(1);
    if (!names.has(name)) fail(`unknown rule set ${token}`);
    return name;
  };

  // The default rule set, as ICU chooses it
  const publicNames = descriptions
    .map(({ name }) => name)
    .filter((n) => !n.startsWith("%"));
  const defaultSet =
    publicNames.find((n) =>
      ["spellout-numbering", "digits-ordinal", "duration"].includes(n),
    ) ??
    publicNames.at(-1) ??
    fail("no public rule sets");

  // A set that a fraction rule formats the fraction with is a fraction rule set
  const fractionSets = new Set();
  for (const { name, rules } of descriptions) {
    for (const line of rules) {
      const { kind } = parseDescriptor(line.slice(0, line.indexOf(":")), fail);
      if (kind !== "proper" && kind !== "improper" && kind !== "default")
        continue;
      for (const { token } of extractSubstitutions(
        line.slice(line.indexOf(":") + 1),
      ).subs) {
        const inner = token.slice(1, -1);
        if (
          token[0] === ">" &&
          inner.startsWith("%") &&
          inner.slice(1) !== name
        ) {
          fractionSets.add(nameOf(inner));
        }
      }
    }
  }

  const sets = new Map();
  for (const { name, rules } of descriptions) {
    sets.set(
      name,
      compileRuleSet(name, rules, fractionSets.has(name), {
        nameOf,
        defaultSet,
        fail: (message) => fail(`%${name}: ${message}`),
      }),
    );
  }
  return { sets, defaultSet };
}

function parseDescriptor(descriptor, fail) {
  if (SPECIAL[descriptor]) return { kind: SPECIAL[descriptor] };
  const fraction = /^([0x])([.,])([0x])$/.exec(descriptor);
  if (fraction) {
    const [, first, decimal, last] = fraction;
    if (last === "x") return { kind: FRACTION_RULES[first], decimal };
    if (first === "x") return { kind: "default", decimal };
  }
  const normal = /^([\d,. ]+)(?:\/([\d,. ]+))?(>*)$/.exec(descriptor);
  if (!normal) fail(`unsupported rule descriptor "${descriptor}"`);
  const digits = (text) => BigInt(text.replace(/[,. ]/g, ""));
  return {
    kind: "normal",
    base: digits(normal[1]),
    radix: normal[2] === undefined ? 10n : digits(normal[2]),
    decrements: normal[3].length,
  };
}

function expectedExponent(base, radix) {
  if (base < 1n) return 0;
  let exponent = 0;
  while (radix ** BigInt(exponent + 1) <= base) exponent++;
  return exponent;
}

function extractSubstitutions(text) {
  const subs = [];
  while (subs.length < 2) {
    let start = -1;
    for (const prefix of PREFIXES) {
      const i = text.indexOf(prefix);
      if (i !== -1 && (start === -1 || i < start)) start = i;
    }
    if (start === -1) break;
    let end;
    if (text.startsWith(">>>", start)) {
      end = start + 2;
    } else {
      const char = text[start];
      end = text.indexOf(char, start + 1);
      if (
        char === "<" &&
        end !== -1 &&
        end < text.length - 1 &&
        text[end + 1] === "<"
      )
        end++;
    }
    if (end === -1) break;
    subs.push({ pos: start, token: text.slice(start, end + 1) });
    text = text.slice(0, start) + text.slice(end + 1);
  }
  return { text, subs };
}

function compileRuleSet(name, lines, isFraction, { nameOf, defaultSet, fail }) {
  const normal = [];
  const special = {
    negative: [],
    infinity: [],
    nan: [],
    proper: [],
    improper: [],
    default: [],
  };

  for (const line of lines) {
    const colon = line.indexOf(":");
    if (colon === -1) fail(`rule without descriptor: ${line}`);
    const descriptor = parseDescriptor(line.slice(0, colon), fail);
    let body = line.slice(colon + 1).replace(/^\s+/, "");
    if (body.startsWith("'")) body = body.slice(1); // Keeps leading spaces

    const predecessor = normal.length - 1;

    let base = descriptor.base ?? 0n;
    const radix = descriptor.radix ?? 10n;
    let exponent =
      descriptor.kind === "normal" ? expectedExponent(base, radix) : 0;
    exponent = Math.max(0, exponent - (descriptor.decrements ?? 0));

    // Text in brackets makes two rules: one with it and one without
    const open = body.indexOf("[");
    const close = open < 0 ? -1 : body.indexOf("]");
    const variants = [];
    if (
      close < 0 ||
      open > close ||
      ["proper", "negative", "infinity", "nan"].includes(descriptor.kind)
    ) {
      variants.push({ kind: descriptor.kind, base, text: body });
    } else {
      const orElse = body.indexOf("|");
      const before = body.slice(0, open);
      const after = body.slice(close + 1);
      const withText =
        before + body.slice(open + 1, orElse >= 0 ? orElse : close) + after;
      const withoutText =
        before + (orElse >= 0 ? body.slice(orElse + 1, close) : "") + after;
      const divisor = radix ** BigInt(exponent);
      if (
        (base > 0n && base % divisor === 0n) ||
        descriptor.kind === "improper" ||
        descriptor.kind === "default"
      ) {
        if (descriptor.kind === "normal") {
          variants.push({ kind: "normal", base, text: withoutText });
          if (!isFraction) base++;
          variants.push({ kind: "normal", base, text: withText });
        } else if (descriptor.kind === "improper") {
          variants.push({ kind: "proper", text: withoutText });
          variants.push({ kind: "improper", text: withText });
        } else {
          variants.push({ kind: "default", text: withoutText });
          variants.push({ kind: "improper", text: withText });
        }
      } else {
        variants.push({ kind: descriptor.kind, base, text: withText });
      }
    }

    for (const variant of variants) {
      const rule = {
        kind: variant.kind,
        base: variant.base,
        radix,
        exponent,
        decimal:
          variant.kind === descriptor.kind ? descriptor.decimal : undefined,
        ...compileBody(variant.text, predecessor),
      };
      if (rule.kind === "normal") normal.push(rule);
      else special[rule.kind].push(rule);
    }
  }

  // A base of 0 means the preceding base + 1 (the same base in fraction sets)
  let next = 0n;
  for (const rule of normal) {
    if (rule.base === 0n) {
      rule.base = next;
      rule.radix = 10n;
      rule.exponent = expectedExponent(next, 10n);
    } else if (rule.base < next) {
      fail(`rules are out of order at ${rule.base}`);
    } else {
      next = rule.base;
    }
    if (!isFraction) next++;
  }

  const finishParts = (rule) =>
    rule.parts.map((part) => {
      if (typeof part === "string" || part.forms) return part;
      return finishSubstitution(part, rule);
    });

  const finishSubstitution = (sub, rule) => {
    const { token } = sub;
    const char = token[0];
    let inner = token.slice(1, -1);
    let kind;
    let option;
    if (char === "=" && inner === "") fail("== is not allowed");

    if (char === "<") {
      if (rule.kind === "negative") fail("<< is not allowed in negative rules");
      if (["proper", "improper", "default"].includes(rule.kind)) {
        kind = INTEGRAL;
      } else if (isFraction) {
        kind = NUMERATOR;
        if (inner.endsWith("<")) {
          option = true; // Spell out leading zeros
          inner = inner.slice(0, -1);
        }
        if (inner === "") inner = `%${defaultSet}`;
      } else {
        kind = MULTIPLIER;
      }
    } else if (char === ">") {
      if (rule.kind === "negative") {
        kind = ABSOLUTE;
      } else if (["proper", "improper", "default"].includes(rule.kind)) {
        if (inner === "" || inner === ">" || inner === `%${name}`) {
          kind = DIGITS;
          if (token === ">>>") option = false; // Without spaces
        } else {
          kind = FRACTIONAL;
        }
      } else if (isFraction) {
        fail(">> is not allowed in fraction rule sets");
      } else {
        kind = MODULUS;
        if (token === ">>>") {
          if (sub.predecessor < 0) fail(">>> without a preceding rule");
          option = sub.predecessor;
        }
      }
    } else {
      kind = SAME;
    }

    const substitution = { kind, option };
    if (inner === "" || inner === ">") substitution.set = name;
    else if (inner.startsWith("%")) substitution.set = nameOf(inner);
    else if (inner[0] === "#" || inner[0] === "0")
      substitution.pattern = parsePattern(inner, fail);
    else fail(`unsupported substitution ${token}`);
    return substitution;
  };

  const compiled = {
    rules: normal.map((rule) => ({
      base: rule.base,
      divisor: rule.radix ** BigInt(rule.exponent),
      parts: finishParts(rule),
    })),
    isFraction,
  };
  for (const kind of ["negative", "infinity", "nan"]) {
    if (special[kind].length) {
      compiled[kind] = finishParts(special[kind].at(-1));
    }
  }
  for (const kind of ["proper", "improper", "default"]) {
    if (special[kind].length) {
      compiled[kind] = special[kind].map((rule) => ({
        decimal: rule.decimal ?? "",
        parts: finishParts(rule),
      }));
    }
  }
  return compiled;
}

function compileBody(text, predecessor) {
  const { text: rest, subs } = extractSubstitutions(text);
  for (const prefix of PREFIXES) {
    if (rest.includes(prefix))
      throw new Error(`Too many substitutions in "${text}"`);
  }

  const pluralStart = rest.indexOf("$(");
  const pluralEnd = pluralStart >= 0 ? rest.indexOf(")$", pluralStart) : -1;
  let plural = null;
  if (pluralStart >= 0) {
    if (pluralEnd < 0) throw new Error(`Unterminated plural in "${text}"`);
    plural = parsePlural(rest.slice(pluralStart + 2, pluralEnd));
    for (const { pos } of subs) {
      if (pos > pluralStart && pos < pluralEnd + 2) {
        throw new Error(`Substitution inside a plural in "${text}"`);
      }
    }
  }

  const parts = [];
  let cursor = 0;
  const literal = (end) => {
    if (end > cursor) parts.push(rest.slice(cursor, end));
    cursor = Math.max(cursor, end);
  };
  const events = subs.map((sub, i) => ({ pos: sub.pos, order: i, sub }));
  if (plural) events.push({ pos: pluralStart, order: 2, plural });
  events.sort((a, b) => a.pos - b.pos || a.order - b.order);
  for (const event of events) {
    literal(event.pos);
    if (event.plural) {
      parts.push(event.plural);
      cursor = pluralEnd + 2;
    } else {
      parts.push({ token: event.sub.token, predecessor });
    }
  }
  literal(rest.length);

  return { parts };
}

function parsePlural(source) {
  const comma = source.indexOf(",");
  const type = source.slice(0, comma);
  if (type !== "cardinal" && type !== "ordinal") {
    throw new Error(`Unknown plural type "${type}"`);
  }
  const forms = {};
  const pattern = /\s*([a-z]+)\{([^{}]*)\}\s*/y;
  let match;
  let consumed = comma + 1;
  pattern.lastIndex = consumed;
  while ((match = pattern.exec(source))) {
    if (match[2].includes("#"))
      throw new Error(`Unsupported "#" in plural "${source}"`);
    forms[match[1]] = match[2];
    consumed = pattern.lastIndex;
  }
  if (consumed !== source.length || !("other" in forms)) {
    throw new Error(`Unsupported plural "${source}"`);
  }
  return {
    kind: type === "cardinal" ? CARDINAL_PLURAL : ORDINAL_PLURAL,
    forms,
  };
}

function parsePattern(pattern, fail) {
  const match = /^([#,]*)(0+)(?:(\.)(0*)(#*))?$/.exec(pattern);
  if (!match) fail(`unsupported number pattern "${pattern}"`);
  const [, hashes, zeros, point, minFraction = "", optional = ""] = match;
  const integer = (hashes + zeros).split(",");
  if (integer.slice(1).some((group) => group === ""))
    fail(`bad grouping in "${pattern}"`);
  let grouping = null;
  if (integer.length > 1) {
    const primary = integer.at(-1).length;
    const secondary = integer.length > 2 ? integer.at(-2).length : primary;
    grouping = [primary, secondary];
  }
  const maxFraction = minFraction.length + optional.length;
  const result = [];
  result[PATTERN_MIN_INTEGER] = zeros.length;
  result[PATTERN_MIN_FRACTION] = minFraction.length;
  result[PATTERN_MAX_FRACTION] = maxFraction;
  result[PATTERN_GROUPING] = grouping;
  result[PATTERN_SHOW_DECIMAL] = Boolean(point) && maxFraction === 0;
  return result;
}

const numberingFile = resolveFile("und", "NumberingSystemRules");
await compileFile(numberingFile);
const fileNamesByLocale = new Map();
for (const locale of new Set([
  "und",
  ...availableLocales.full,
  ...filesByLocale.keys(),
])) {
  const pair = [
    resolveFile(locale, "SpelloutRules"),
    resolveFile(locale, "OrdinalRules"),
  ];
  const seen = new Set();
  for (const fileName of [...pair, numberingFile]) {
    for (const name of (await compileFile(fileName)).sets.keys()) {
      if (!name.startsWith("%") && seen.has(name)) {
        throw new Error(`${locale}: rule set ${name} is defined twice`);
      }
      seen.add(name);
    }
  }
  fileNamesByLocale.set(locale, pair);
}

const definitions = new Map();
for (const { sets } of compiledFiles.values()) {
  for (const name of sets.keys()) {
    definitions.set(name, (definitions.get(name) ?? 0) + 1);
  }
}
const byDefinitions = (a, b) =>
  definitions.get(b) - definitions.get(a) || (a < b ? -1 : 1);

const ruleFiles = [];
const ruleSets = [];
const patterns = [];

const internedIndexes = new WeakMap(); // List → Map(JSON → index)
function intern(list, value) {
  const indexes = internedIndexes.getOrInsertComputed(list, () => new Map());
  const key = JSON.stringify(value);
  if (!indexes.has(key)) indexes.set(key, list.push(value) - 1);
  return indexes.get(key);
}

function linkFile({ sets, defaultSet }) {
  const order = [...sets.keys()].sort(byDefinitions);
  const positions = new Map(order.map((name, position) => [name, position]));
  const file = [];
  file[FILE_SETS] = order.map((name) =>
    intern(ruleSets, linkRuleSet(sets.get(name), positions)),
  );
  file[FILE_NAMES] = {};
  for (const name of sets.keys()) {
    if (!name.startsWith("%")) file[FILE_NAMES][name] = positions.get(name);
  }
  file[FILE_DEFAULT] = positions.get(defaultSet);
  return intern(ruleFiles, file);
}

function linkRuleSet(set, positions) {
  const parts = [];
  const linkBody = (body) => {
    const linked = body.map((part) =>
      typeof part === "string"
        ? part
        : intern(parts, linkPart(part, positions)),
    );
    return linked.length === 1 ? linked[0] : linked;
  };
  const linkFractionRules = ([first, ...others]) => [
    linkBody(first.parts),
    ...others.flatMap((rule) => [rule.decimal, linkBody(rule.parts)]),
  ];

  const tuple = [];
  tuple[SET_BASES] = set.rules.map(({ base }) => exactNumber(base));
  tuple[SET_BODIES] = set.rules.map((rule) => linkBody(rule.parts));
  const divisors = [];
  set.rules.forEach((rule, i) => {
    if (rule.parts.some((part) => typeof part !== "string")) {
      divisors[i] = exactNumber(rule.divisor);
    }
  });
  if (divisors.length) tuple[SET_DIVISORS] = divisors;
  if (set.negative) tuple[SET_NEGATIVE] = linkBody(set.negative);
  if (set.improper) tuple[SET_IMPROPER] = linkFractionRules(set.improper);
  if (set.infinity) tuple[SET_INFINITY] = linkBody(set.infinity);
  if (set.proper) tuple[SET_PROPER] = linkFractionRules(set.proper);
  if (set.nan) tuple[SET_NAN] = linkBody(set.nan);
  if (set.default) tuple[SET_DEFAULT] = linkFractionRules(set.default);
  if (set.isFraction) {
    let lcm = set.rules[0].base;
    for (const { base } of set.rules) lcm = leastCommonMultiple(lcm, base);
    tuple[SET_FRACTION_LCM] = exactNumber(lcm);
  }
  if (parts.length) tuple[SET_PARTS] = parts;
  return tuple;
}

function linkPart(part, positions) {
  const tuple = [];
  tuple[PART_KIND] = part.kind;
  if (part.forms) {
    for (const [category, form] of Object.entries(part.forms)) {
      tuple[PLURAL_FORMS[category]] = form;
    }
  } else if (part.set !== undefined) {
    tuple[SUBSTITUTION_SET] = positions.get(part.set);
  } else {
    tuple[SUBSTITUTION_PATTERN] = intern(patterns, part.pattern);
  }
  if (part.option !== undefined) tuple[SUBSTITUTION_OPTION] = part.option;
  return tuple;
}

function leastCommonMultiple(a, b) {
  let x = a;
  let y = b;
  while (y !== 0n) [x, y] = [y, x % y];
  return (a / x) * b;
}

/** A number, or a decimal string when a double cannot represent the value */
function exactNumber(value) {
  return BigInt(Number(value)) === value ? Number(value) : String(value);
}

const fileIndexes = new Map();
for (const [fileName, file] of compiledFiles) {
  fileIndexes.set(fileName, linkFile(file));
}
const byLocale = new Map();
for (const [locale, pair] of fileNamesByLocale) {
  byLocale.set(
    locale,
    pair.map((fileName) => fileIndexes.get(fileName)),
  );
}

export const RULE_SETS = ruleSets;

export const RULE_FILES = ruleFiles;

export const NUMBERING_FILE = fileIndexes.get(numberingFile);

export const NUMBER_PATTERNS = patterns;

export const LOCALES = encodeLocaleTable(byLocale, likelySubtags);
