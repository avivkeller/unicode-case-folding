import { CodePointSet } from "./code-point-set.mjs";
import { resolveProperty } from "./properties.mjs";
import {
  charAt,
  isPatternWhiteSpace,
  parseIdentifier,
  unescapeAt,
} from "./syntax.mjs";

/** U+FFFF in a set matches at either end of the text (ICU's U_ETHER). */
export const END_OF_TEXT = 0xffff;

/**
 * @typedef {object} UnicodeSet
 * @property {CodePointSet} codePoints
 * @property {Set<string>} strings
 */

export function resemblesUnicodeSet(text, pos) {
  return text[pos] === "[" || isPropertyOpen(text, pos);
}

export function parseUnicodeSet(text, pos, symbols) {
  const reader = new PatternReader(text, pos, symbols);
  const set = parseSet(reader);
  return { set, end: reader.pos };
}

export function codePointsOnly(codePoints) {
  return { codePoints, strings: new Set() };
}

function parseSet(reader) {
  let codePoints = new CodePointSet();
  let strings = new Set();
  // mode: 0 = before "[", 1 = inside, 2 = after "]"
  let mode = 0;
  // lastItem: 0 = none, 1 = a character (lastChar), 2 = a set
  let lastItem = 0;
  let lastChar = 0;
  let operator = null;
  let invert = false;

  const addChar = (cp) => {
    codePoints = codePoints.union(CodePointSet.of(cp));
  };
  const flushLastChar = () => {
    if (lastItem === 1) addChar(lastChar);
  };

  while (mode !== 2 && !reader.atEnd()) {
    let nested = null;
    let char;
    let escaped = false;

    if (reader.resemblesProperty()) {
      nested = reader.parseProperty();
    } else {
      const backup = reader.mark();
      ({ char, escaped } = reader.next());
      if (char === "[" && !escaped) {
        if (mode === 1) {
          reader.reset(backup);
          nested = parseSet(reader);
        } else {
          mode = 1;
          let afterOpen = reader.mark();
          ({ char, escaped } = reader.next());
          if (char === "^" && !escaped) {
            invert = true;
            afterOpen = reader.mark();
            ({ char } = reader.next());
          }
          if (char === "-") {
            escaped = true; // A leading "-" is literal
          } else {
            reader.reset(afterOpen);
            continue;
          }
        }
      } else if (typeof char === "object") {
        if (char.kind !== "set") {
          throw new SyntaxError("Only sets may be used in a UnicodeSet");
        }
        nested = char.set;
      }
    }

    if (nested !== null) {
      if (lastItem === 1) {
        if (operator !== null) {
          throw new SyntaxError("Character expected after operator");
        }
        addChar(lastChar);
      }
      if (mode === 0) {
        reader.skipWhiteSpace();
        return nested;
      }
      if (operator === "-") {
        codePoints = codePoints.subtract(nested.codePoints);
        strings = new Set([...strings].filter((s) => !nested.strings.has(s)));
      } else if (operator === "&") {
        codePoints = codePoints.intersect(nested.codePoints);
        strings = new Set([...strings].filter((s) => nested.strings.has(s)));
      } else {
        codePoints = codePoints.union(nested.codePoints);
        strings = new Set([...strings, ...nested.strings]);
      }
      operator = null;
      lastItem = 2;
      continue;
    }

    if (mode === 0) throw new SyntaxError("Missing '[' in UnicodeSet");

    if (!escaped) {
      if (char === "]") {
        flushLastChar();
        if (operator === "-") {
          addChar(0x2d); // A trailing "-" is literal
        } else if (operator === "&") {
          throw new SyntaxError("Trailing '&' in UnicodeSet");
        }
        mode = 2;
        continue;
      }
      if (char === "-") {
        if (operator === null && lastItem !== 0) {
          operator = "-";
          continue;
        }
        if (operator === null) {
          addChar(0x2d);
          ({ char, escaped } = reader.next());
          if (char === "]" && !escaped) {
            mode = 2;
            continue;
          }
        }
        throw new SyntaxError("'-' not after a character or set");
      }
      if (char === "&") {
        if (lastItem === 2 && operator === null) {
          operator = "&";
          continue;
        }
        throw new SyntaxError("'&' not after a set");
      }
      if (char === "^") throw new SyntaxError("'^' not after '['");
      if (char === "{") {
        if (operator !== null) {
          throw new SyntaxError("Missing operand after operator");
        }
        flushLastChar();
        lastItem = 0;
        const string = reader.readString();
        if ([...string].length === 1) addChar(string.codePointAt(0));
        else strings.add(string);
        continue;
      }
      if (char === "$") {
        // "$]" is the end of text, as U+FFFF
        const afterDollar = reader.mark();
        ({ char, escaped } = reader.next());
        const isAnchor = char === "]" && !escaped;
        if (isAnchor && operator === null) {
          flushLastChar();
          addChar(END_OF_TEXT);
          mode = 2;
          continue;
        }
        if (isAnchor || reader.symbols !== null) {
          throw new SyntaxError("Unquoted '$' in UnicodeSet");
        }
        reader.reset(afterDollar);
        char = "$";
      }
    }

    const cp = typeof char === "number" ? char : char.codePointAt(0);
    if (lastItem === 0) {
      lastItem = 1;
      lastChar = cp;
    } else if (lastItem === 1) {
      if (operator === "-") {
        if (lastChar >= cp)
          throw new SyntaxError("Invalid range in UnicodeSet");
        codePoints = codePoints.union(CodePointSet.range(lastChar, cp));
        lastItem = 0;
        operator = null;
      } else {
        addChar(lastChar);
        lastChar = cp;
      }
    } else {
      if (operator !== null)
        throw new SyntaxError("Set expected after operator");
      lastChar = cp;
      lastItem = 1;
    }
  }

  if (mode !== 2) throw new SyntaxError("Missing ']' in UnicodeSet");
  reader.skipWhiteSpace();
  if (invert) return codePointsOnly(codePoints.complement());
  return { codePoints, strings };
}

function isPropertyOpen(text, pos) {
  return (
    (text[pos] === "[" && text[pos + 1] === ":") ||
    (text[pos] === "\\" && "pPN".includes(text[pos + 1]))
  );
}

class PatternReader {
  constructor(text, pos, symbols) {
    this.text = text;
    this.pos = pos;
    this.symbols = symbols;
    this.buffer = null;
    this.bufferPos = 0;
  }

  atEnd() {
    return this.buffer === null && this.pos >= this.text.length;
  }

  mark() {
    return [this.pos, this.buffer, this.bufferPos];
  }

  reset([pos, buffer, bufferPos]) {
    this.pos = pos;
    this.buffer = buffer;
    this.bufferPos = bufferPos;
  }

  next({ skipWhiteSpace = true } = {}) {
    for (;;) {
      if (this.buffer !== null) {
        const item = this.buffer[this.bufferPos++];
        if (this.bufferPos === this.buffer.length) this.buffer = null;
        if (typeof item === "number" && !isLiteral(item)) {
          // ICU would read it as syntax; no CLDR rule relies on that
          throw new SyntaxError(
            `Unsupported character U+${item.toString(16)} from a variable in a UnicodeSet`,
          );
        }
        return { char: item, escaped: true };
      }
      if (this.pos >= this.text.length) {
        throw new SyntaxError("Unterminated UnicodeSet");
      }
      const char = charAt(this.text, this.pos);
      this.pos += char.length;
      if (char === "$" && this.symbols !== null) {
        const { name, end } = parseIdentifier(this.text, this.pos);
        if (name !== "") {
          const value = this.symbols.lookup(name);
          if (value === undefined) {
            throw new SyntaxError(`Undefined variable $${name}`);
          }
          this.pos = end;
          if (value.length > 0) {
            this.buffer = value;
            this.bufferPos = 0;
          }
          continue;
        }
      }
      if (skipWhiteSpace && isPatternWhiteSpace(char)) continue;
      if (char === "\\") {
        const { codePoint, end } = unescapeAt(this.text, this.pos);
        this.pos = end;
        return { char: codePoint, escaped: true };
      }
      return { char, escaped: false };
    }
  }

  skipWhiteSpace() {
    while (
      this.buffer === null &&
      this.pos < this.text.length &&
      isPatternWhiteSpace(this.text[this.pos])
    ) {
      this.pos++;
    }
  }

  resemblesProperty() {
    if (this.buffer !== null) return false;
    let pos = this.pos;
    while (pos < this.text.length && isPatternWhiteSpace(this.text[pos])) pos++;
    return isPropertyOpen(this.text, pos);
  }

  parseProperty() {
    this.skipWhiteSpace();
    const { text } = this;
    let pos = this.pos;
    const posix = text[pos] === "[";
    let invert = false;
    pos += 2;
    if (posix) {
      while (isPatternWhiteSpace(text[pos] ?? "")) pos++;
      if (text[pos] === "^") {
        invert = true;
        pos++;
      }
    } else {
      invert = text[pos - 1] === "P";
      if (text[pos - 1] === "N") {
        throw new SyntaxError("Unsupported UnicodeSet pattern: \\N{…}");
      }
      while (isPatternWhiteSpace(text[pos] ?? "")) pos++;
      if (text[pos++] !== "{") throw new SyntaxError("Expected '{' after \\p");
    }
    const close = text.indexOf(posix ? ":]" : "}", pos);
    if (close < 0) throw new SyntaxError("Unterminated property pattern");
    const body = text.slice(pos, close);
    const equals = body.indexOf("=");
    const set =
      equals < 0
        ? resolveProperty(body.trim())
        : resolveProperty(
            body.slice(0, equals).trim(),
            body.slice(equals + 1).trim(),
          );
    this.pos = close + (posix ? 2 : 1);
    return codePointsOnly(invert ? set.complement() : set);
  }

  readString() {
    let string = "";
    for (;;) {
      const { char, escaped } = this.next();
      if (char === "}" && !escaped) return string;
      if (typeof char === "object") {
        throw new SyntaxError("A set in a UnicodeSet string");
      }
      string += typeof char === "number" ? String.fromCodePoint(char) : char;
    }
  }
}

function isLiteral(codePoint) {
  const char = String.fromCodePoint(codePoint);
  return !"[]-^&{}$\\".includes(char) && !isPatternWhiteSpace(char);
}
