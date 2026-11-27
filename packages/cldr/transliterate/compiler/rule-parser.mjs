import { CodePointSet } from "./code-point-set.mjs";
import {
  charAt,
  isPatternWhiteSpace,
  parseChar,
  parseIdentifier,
  skipWhiteSpace,
  unescapeAt,
} from "./syntax.mjs";
import {
  codePointsOnly,
  END_OF_TEXT,
  parseUnicodeSet,
  resemblesUnicodeSet,
} from "./unicode-set.mjs";
import { resolveProperty } from "./properties.mjs";

/**
 * @typedef {object} ParsedTransform
 * @property {import("./unicode-set.mjs").UnicodeSet | null} filter
 * @property {Step[]} steps
 */

/**
 * @typedef {{ kind: "transforms", ids: Array<TransformId | null> }
 *   | { kind: "rules", rules: Rule[] }} Step
 */

/**
 * @typedef {object} TransformId
 * @property {string} source
 * @property {string} target
 * @property {string} variant
 * @property {import("./unicode-set.mjs").UnicodeSet | null} filter
 */

/**
 * @typedef {object} Rule
 * @property {MatchElement[]} ante
 * @property {MatchElement[]} key
 * @property {MatchElement[]} post
 * @property {boolean} anchorStart
 * @property {boolean} anchorEnd
 * @property {OutputElement[]} output
 * @property {number} cursor
 * @property {string} source
 */

/**
 * @typedef {number
 *   | { kind: "set", set: import("./unicode-set.mjs").UnicodeSet }
 *   | { kind: "quantifier", min: number, max: number, pattern: MatchElement[] }
 *   | { kind: "segment", number: number, pattern: MatchElement[] }} MatchElement
 */

/**
 * @typedef {number
 *   | { kind: "segment", number: number }
 *   | { kind: "function", id: TransformId, output: OutputElement[] }} OutputElement
 */

const FORWARD_OPERATORS = new Set([">", "→"]);
const REVERSE_OPERATORS = new Set(["<", "←"]);
const BOTH_OPERATORS = new Set(["<>", "↔"]);
const HALF_ENDERS = "=><←→↔;";
const ILLEGAL_TOP = ")";
const ILLEGAL_SEGMENT = "{}|@";
const ILLEGAL_FUNCTION = "^(.*+?{}|@";
const UNLIMITED = 0x7fffffff;
const DOT = codePointsOnly(
  resolveProperty("Zp")
    .union(resolveProperty("Zl"))
    .union(CodePointSet.of(0x0a, 0x0d, END_OF_TEXT))
    .complement(),
);

// IDs whose inverse does not swap source and target
const SPECIAL_INVERSES = new Map([
  ["nfc", "NFD"],
  ["nfd", "NFC"],
  ["nfkc", "NFKD"],
  ["nfkd", "NFKC"],
  ["upper", "Lower"],
  ["lower", "Upper"],
  ["title", "Lower"],
  ["null", "Null"],
  ["remove", "Null"],
]);

export function parseTransformRules(text, direction) {
  return new RuleParser(text, direction).parse();
}

class RuleParser {
  constructor(text, direction) {
    this.text = text;
    this.direction = direction;
    /** @type {Map<string, MatchElement[]>} */
    this.variables = new Map();
    this.symbols = { lookup: (name) => this.variables.get(name) };
  }

  // Blocks are ordered as in ICU's TransliteratorRegistry::reget()
  parse() {
    const { text } = this;
    const reverse = this.direction === "reverse";
    const add = (list, item) =>
      reverse ? list.unshift(item) : list.push(item);
    const transformBlocks = [];
    const ruleBlocks = [];
    let transforms = []; // The "::" block being parsed, or null
    let rules = null; // The block of conversion rules being parsed, or null
    let filter = null;
    let filterStatement = -1;
    let statements = 0;

    let pos = 0;
    while (pos < text.length) {
      const char = text[pos];
      if (isPatternWhiteSpace(char) || char === ";") {
        pos++;
        continue;
      }
      if (char === "#") {
        const newline = text.indexOf("\n", pos);
        pos = newline < 0 ? text.length : newline + 1;
        continue;
      }
      statements++;

      if (text.startsWith("::", pos)) {
        if (rules !== null) {
          add(ruleBlocks, rules);
          rules = null;
          transforms = [];
        }
        pos += 2;
        const single = parseSingleId(text, pos, this.direction);
        const afterId = single && parseChar(text, single.end, ";");
        if (single !== null && afterId >= 0) {
          add(transforms, single.id);
          pos = afterId;
          continue;
        }
        const global = parseGlobalFilter(text, pos);
        const afterFilter = global && parseChar(text, global.end, ";");
        if (global === null || afterFilter < 0) {
          throw this.error("Invalid transform rule", pos);
        }
        // "::[set];" filters the forward transform, "::([set]);" the reverse
        if ((this.direction === "forward") === !global.withParens) {
          if (filter !== null) throw this.error("Multiple global filters", pos);
          filter = global.filter;
          filterStatement = statements;
        }
        pos = afterFilter;
        continue;
      }

      if (text.startsWith("use ", pos)) {
        throw this.error("Unsupported pragma", pos);
      }
      if (rules === null) {
        add(transformBlocks, transforms);
        transforms = null;
        rules = [];
      }
      pos = this.parseRule(pos, rules);
    }
    if (rules !== null) add(ruleBlocks, rules);
    else if (transforms.length > 0) add(transformBlocks, transforms);
    if (transformBlocks.length === 1 && transformBlocks[0].length === 0) {
      transformBlocks.pop();
    }

    // The forward filter must come first, and the reverse filter last
    if (filter !== null && filterStatement !== (reverse ? statements : 1)) {
      throw new SyntaxError("Misplaced global filter");
    }
    const steps = [];
    const count = Math.max(transformBlocks.length, ruleBlocks.length);
    for (let i = 0; i < count; i++) {
      if (transformBlocks[i]?.length > 0) {
        steps.push({ kind: "transforms", ids: transformBlocks[i] });
      }
      if (i < ruleBlocks.length)
        steps.push({ kind: "rules", rules: ruleBlocks[i] });
    }
    return { filter, steps };
  }

  parseRule(start, rules) {
    const { text } = this;
    const context = { segments: new Map(), undefinedVariable: null };
    const left = new RuleHalf(this, context);
    let pos = left.parse(start);

    let operator = text[pos - 1];
    if (pos > text.length || !"=><←→↔".includes(operator)) {
      throw this.error("Missing operator", start);
    }
    if (operator === "<" && text[pos] === ">") {
      operator = "<>";
      pos++;
    }
    const right = new RuleHalf(this, context);
    pos = right.parse(pos);
    if (pos <= text.length && text[pos - 1] !== ";") {
      throw this.error("Unquoted special character", start);
    }
    const source = text.slice(start, pos).trim();

    if (operator === "=") {
      this.defineVariable(left, right, context, source);
      return pos;
    }
    if (context.undefinedVariable !== null) {
      throw new SyntaxError(
        `Undefined variable $${context.undefinedVariable}: ${source}`,
      );
    }

    const both = BOTH_OPERATORS.has(operator);
    const applies =
      both ||
      (this.direction === "forward"
        ? FORWARD_OPERATORS.has(operator)
        : REVERSE_OPERATORS.has(operator));
    if (!applies) return pos;

    const [input, output] =
      this.direction === "forward" ? [left, right] : [right, left];
    if (both) {
      // Output contexts and input cursors are only for the other direction
      output.removeContext();
      input.cursor = -1;
      input.cursorOffset = 0;
    }
    if (
      output.ante >= 0 ||
      output.post >= 0 ||
      input.cursor >= 0 ||
      (output.cursorOffset !== 0 && output.cursor < 0) ||
      output.anchorStart ||
      output.anchorEnd
    ) {
      throw new SyntaxError(`Malformed rule: ${source}`);
    }

    const ante = input.ante < 0 ? 0 : input.ante;
    const post = input.post < 0 ? input.elements.length : input.post;
    if (ante > post) throw new SyntaxError(`Malformed rule: ${source}`);
    const matchElements = input.elements.map((element) =>
      resolveSegments(element, context, "match", source),
    );
    const outputElements = output.elements.map((element) =>
      resolveSegments(element, context, "output", source),
    );
    const cursor =
      (output.cursor < 0 ? outputElements.length : output.cursor) +
      output.cursorOffset;

    rules.push({
      ante: matchElements.slice(0, ante),
      key: matchElements.slice(ante, post),
      post: matchElements.slice(post),
      anchorStart: input.anchorStart,
      anchorEnd: input.anchorEnd,
      output: outputElements,
      cursor,
      source,
    });
    return pos;
  }

  defineVariable(left, right, context, source) {
    const name = context.undefinedVariable;
    if (
      name === null ||
      left.elements.length !== 1 ||
      left.elements[0].kind !== "undefined" ||
      [left, right].some((half) => half.anchorStart || half.anchorEnd) ||
      right.ante >= 0 ||
      right.post >= 0 ||
      right.cursor >= 0 ||
      context.segments.size > 0
    ) {
      throw new SyntaxError(`Malformed variable definition: ${source}`);
    }
    this.variables.set(name, right.elements);
  }

  error(message, pos) {
    const line = this.text.slice(pos).split("\n", 1)[0];
    return new SyntaxError(`${message}: ${line}`);
  }
}

class RuleHalf {
  constructor(parser, context) {
    this.parser = parser;
    this.context = context;
    this.elements = [];
    this.ante = -1;
    this.post = -1;
    this.cursor = -1;
    this.cursorOffset = 0;
    this.cursorOffsetPos = 0;
    this.anchorStart = false;
    this.anchorEnd = false;
    this.nextSegment = 1;
  }

  parse(pos) {
    pos = this.parseSection(pos, this.elements, ILLEGAL_TOP, false);
    if (this.cursorOffset > 0 && this.cursor !== this.cursorOffsetPos) {
      throw new SyntaxError("Misplaced cursor offset");
    }
    return pos;
  }

  removeContext() {
    if (this.post >= 0) this.elements.length = this.post;
    if (this.ante >= 0) this.elements.splice(0, this.ante);
    this.ante = this.post = -1;
    this.anchorStart = this.anchorEnd = false;
  }

  parseSection(pos, elements, illegal, isSegment) {
    const { text } = this.parser;
    const sectionStart = elements.length;
    let quoteStart = -1;
    let quoteLimit = -1;
    let variableStart = -1;
    let variableLimit = -1;

    while (pos < text.length) {
      const char = charAt(text, pos);
      pos += char.length;
      if (isPatternWhiteSpace(char)) continue;
      if (HALF_ENDERS.includes(char)) {
        if (isSegment) throw new SyntaxError("Unclosed segment");
        return pos;
      }
      if (this.anchorEnd) {
        throw new SyntaxError("Text after the end anchor '$'");
      }
      if (resemblesUnicodeSet(text, pos - 1)) {
        const { set, end } = parseUnicodeSet(
          text,
          pos - 1,
          this.parser.symbols,
        );
        elements.push({ kind: "set", set });
        pos = end;
        continue;
      }
      if (char === "\\") {
        const { codePoint, end } = unescapeAt(text, pos);
        elements.push(codePoint);
        pos = end;
        continue;
      }
      if (char === "'") {
        let close = text.indexOf("'", pos);
        if (close === pos) {
          elements.push(0x27);
          pos++;
          continue;
        }
        quoteStart = elements.length;
        for (;;) {
          if (close < 0) throw new SyntaxError("Unterminated quote");
          pushString(elements, text.slice(pos, close));
          pos = close + 1;
          if (text[pos] !== "'") break;
          close = text.indexOf("'", pos + 1);
        }
        quoteLimit = elements.length;
        continue;
      }
      if (illegal.includes(char)) {
        throw new SyntaxError(`Illegal character '${char}' in rule`);
      }

      switch (char) {
        case "^":
          if (elements.length !== 0 || this.anchorStart) {
            throw new SyntaxError("Misplaced start anchor '^'");
          }
          this.anchorStart = true;
          break;
        case "(": {
          const number = this.nextSegment++;
          const contentStart = elements.length;
          pos = this.parseSection(pos, elements, ILLEGAL_SEGMENT, true);
          const pattern = elements.splice(contentStart);
          if (this.context.segments.has(number)) {
            throw new SyntaxError(`Segment ${number} defined twice`);
          }
          const segment = { kind: "segment", number, pattern };
          this.context.segments.set(number, segment);
          elements.push(segment);
          break;
        }
        case "&":
        case "∆": {
          const parsed = parseFilterId(text, pos);
          const open = parsed && parseChar(text, parsed.end, "(");
          if (parsed === null || open < 0) {
            throw new SyntaxError("Invalid function call");
          }
          const contentStart = elements.length;
          pos = this.parseSection(open, elements, ILLEGAL_FUNCTION, true);
          elements.push({
            kind: "function",
            id: specsToId(parsed.specs, "forward"),
            output: elements.splice(contentStart),
          });
          break;
        }
        case "$": {
          const digits = /^[1-9]\d*/.exec(text.slice(pos))?.[0];
          if (digits !== undefined) {
            elements.push({ kind: "segmentRef", number: Number(digits) });
            pos += digits.length;
            break;
          }
          const { name, end } = parseIdentifier(text, pos);
          if (name === "") {
            this.anchorEnd = true;
            break;
          }
          pos = end;
          variableStart = elements.length;
          const value = this.parser.variables.get(name);
          if (value !== undefined) {
            elements.push(...value);
          } else if (this.context.undefinedVariable === null) {
            // Allowed once per rule, for the name being defined
            this.context.undefinedVariable = name;
            elements.push({ kind: "undefined" });
          } else {
            throw new SyntaxError(`Undefined variable $${name}`);
          }
          variableLimit = elements.length;
          break;
        }
        case ".":
          elements.push({ kind: "set", set: DOT });
          break;
        case "*":
        case "+":
        case "?": {
          if (isSegment && elements.length === sectionStart) {
            throw new SyntaxError("Misplaced quantifier");
          }
          let start = elements.length - 1;
          if (elements.length === quoteLimit) start = quoteStart;
          else if (elements.length === variableLimit) start = variableStart;
          if (start < 0) throw new SyntaxError("Misplaced quantifier");
          const pattern = elements.splice(start);
          elements.push({
            kind: "quantifier",
            min: char === "+" ? 1 : 0,
            max: char === "?" ? 1 : UNLIMITED,
            pattern,
          });
          break;
        }
        case ")":
          return pos;
        case "{":
          if (this.ante >= 0) throw new SyntaxError("Multiple ante contexts");
          this.ante = elements.length;
          break;
        case "}":
          if (this.post >= 0) throw new SyntaxError("Multiple post contexts");
          this.post = elements.length;
          break;
        case "|":
          if (this.cursor >= 0) throw new SyntaxError("Multiple cursors");
          this.cursor = elements.length;
          break;
        case "@":
          this.parseCursorOffset(elements);
          break;
        default:
          if (/^[!-/:-@[-`{-~]$/.test(char)) {
            throw new SyntaxError(`Unquoted special character '${char}'`);
          }
          elements.push(char.codePointAt(0));
      }
    }
    if (isSegment) throw new SyntaxError("Unclosed segment");
    return pos + 1;
  }

  parseCursorOffset(elements) {
    if (this.cursorOffset < 0) {
      if (elements.length > 0) throw new SyntaxError("Misplaced cursor offset");
      this.cursorOffset--;
    } else if (this.cursorOffset > 0) {
      if (elements.length !== this.cursorOffsetPos || this.cursor >= 0) {
        throw new SyntaxError("Misplaced cursor offset");
      }
      this.cursorOffset++;
    } else if (this.cursor === 0 && elements.length === 0) {
      this.cursorOffset = -1;
    } else if (this.cursor < 0) {
      this.cursorOffsetPos = elements.length;
      this.cursorOffset = 1;
    } else {
      throw new SyntaxError("Misplaced cursor offset");
    }
  }
}

function pushString(elements, string) {
  for (const char of string) elements.push(char.codePointAt(0));
}

function resolveSegments(element, context, side, source) {
  if (typeof element === "number") return element;
  switch (element.kind) {
    case "set":
      if (side === "output") {
        throw new SyntaxError(`A set in the output of a rule: ${source}`);
      }
      return element;
    case "quantifier":
      if (side === "output") {
        throw new SyntaxError(`A quantifier in the output: ${source}`);
      }
      return {
        ...element,
        pattern: element.pattern.map((e) =>
          resolveSegments(e, context, side, source),
        ),
      };
    case "function":
      if (side !== "output") {
        throw new SyntaxError(`A function in the input of a rule: ${source}`);
      }
      return {
        ...element,
        output: element.output.map((e) =>
          resolveSegments(e, context, side, source),
        ),
      };
    case "segment":
    case "segmentRef": {
      const segment = context.segments.get(element.number);
      if (segment === undefined) {
        throw new SyntaxError(
          `Undefined segment $${element.number}: ${source}`,
        );
      }
      if (side === "output") return { kind: "segment", number: segment.number };
      if (element.kind === "segmentRef") {
        throw new SyntaxError(
          `Unsupported segment reference in input: ${source}`,
        );
      }
      return {
        kind: "segment",
        number: segment.number,
        pattern: segment.pattern.map((e) =>
          resolveSegments(e, context, side, source),
        ),
      };
    }
  }
  throw new Error(`Unexpected element ${element.kind}`);
}

// Returns null if this is not an ID, or a null `id` if none in this direction
function parseSingleId(text, pos, direction) {
  let forward = null;
  let reverse = null;
  let sawParentheses = false;
  for (let pass = 1; pass <= 2; pass++) {
    if (pass === 2) {
      const parsed = parseFilterId(text, pos);
      if (parsed === null) return null;
      forward = parsed.specs;
      pos = parsed.end;
    }
    const open = parseChar(text, pos, "(");
    if (open >= 0) {
      sawParentheses = true;
      pos = open;
      const close = parseChar(text, pos, ")");
      if (close >= 0) {
        pos = close;
      } else {
        const parsed = parseFilterId(text, pos);
        const end = parsed && parseChar(text, parsed.end, ")");
        if (parsed === null || end < 0) return null;
        reverse = parsed.specs;
        pos = end;
      }
      break;
    }
  }

  let id;
  if (sawParentheses) {
    const specs = direction === "forward" ? forward : reverse;
    id = specs === null ? null : specsToId(specs, "forward");
  } else if (direction === "forward") {
    id = specsToId(forward, "forward");
  } else {
    id = specialInverse(forward) ?? specsToId(forward, "reverse");
  }
  return { id, end: pos };
}

function parseFilterId(text, pos) {
  let first = "";
  let target = "";
  let variant = "";
  let filter = null;
  let delimiter = null;
  let specCount = 0;
  for (;;) {
    pos = skipWhiteSpace(text, pos);
    if (pos === text.length) break;
    if (filter === null && resemblesUnicodeSet(text, pos)) {
      const parsed = parseUnicodeSet(text, pos, null);
      filter = parsed.set;
      pos = parsed.end;
      continue;
    }
    if (delimiter === null) {
      const char = text[pos];
      if ((char === "-" && target === "") || (char === "/" && variant === "")) {
        delimiter = char;
        pos++;
        continue;
      }
    }
    if (delimiter === null && specCount > 0) break;
    const { name, end } = parseIdentifier(text, pos);
    if (name === "") break;
    pos = end;
    if (delimiter === null) first = name;
    else if (delimiter === "-") target = name;
    else variant = name;
    specCount++;
    delimiter = null;
  }

  // A lone name is the target ("NFD" is "Any-NFD")
  let source = "";
  if (first !== "") {
    if (target === "") target = first;
    else source = first;
  }
  if (source === "" && target === "") return null;
  return {
    specs: {
      source: source === "" ? "Any" : source,
      target: target === "" ? "Any" : target,
      variant,
      filter,
    },
    end: pos,
  };
}

function specsToId(specs, direction) {
  const [source, target] =
    direction === "forward"
      ? [specs.source, specs.target]
      : [specs.target, specs.source];
  return { source, target, variant: specs.variant, filter: specs.filter };
}

function specialInverse(specs) {
  if (specs.source.toLowerCase() !== "any") return null;
  const inverse = SPECIAL_INVERSES.get(specs.target.toLowerCase());
  if (inverse === undefined) return null;
  return {
    source: "Any",
    target: inverse,
    variant: specs.variant,
    filter: specs.filter,
  };
}

function parseGlobalFilter(text, pos) {
  const open = parseChar(text, pos, "(");
  const withParens = open >= 0;
  if (withParens) pos = open;
  pos = skipWhiteSpace(text, pos);
  if (!resemblesUnicodeSet(text, pos)) return null;
  const { set, end } = parseUnicodeSet(text, pos, null);
  pos = end;
  if (withParens) {
    pos = parseChar(text, pos, ")");
    if (pos < 0) return null;
  }
  return { filter: set, withParens, end: pos };
}
