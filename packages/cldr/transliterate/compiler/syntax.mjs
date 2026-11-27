const PATTERN_WHITE_SPACE = /[\t-\r \x85\u200e\u200f\u2028\u2029]/u;

// ICU's u_isIDStart() and u_isIDPart(), without its ignorable controls
const ID_START = /[\p{L}\p{Nl}]/u;
const ID_PART = /[\p{L}\p{Nl}\p{Mn}\p{Mc}\p{Nd}\p{Pc}\p{Cf}]/u;

const CONTROL_ESCAPES = {
  a: 7,
  b: 8,
  e: 0x1b,
  f: 0xc,
  n: 0xa,
  r: 0xd,
  t: 9,
  v: 0xb,
};

export function isPatternWhiteSpace(char) {
  return PATTERN_WHITE_SPACE.test(char);
}

export function charAt(text, pos) {
  return String.fromCodePoint(text.codePointAt(pos));
}

export function skipWhiteSpace(text, pos) {
  while (pos < text.length && isPatternWhiteSpace(text[pos])) pos++;
  return pos;
}

export function parseChar(text, pos, char) {
  pos = skipWhiteSpace(text, pos);
  return text[pos] === char ? pos + 1 : -1;
}

export function parseIdentifier(text, pos) {
  let end = pos;
  while (end < text.length) {
    const char = charAt(text, end);
    if (end === pos ? !ID_START.test(char) : !ID_PART.test(char)) break;
    end += char.length;
  }
  return { name: text.slice(pos, end), end };
}

export function unescapeAt(text, pos) {
  const char = text[pos];
  let minDigits = 0;
  let maxDigits = 0;
  let radix = 16;
  let braces = false;
  let end = pos + 1;
  if (char === "u") {
    minDigits = maxDigits = 4;
  } else if (char === "U") {
    minDigits = maxDigits = 8;
  } else if (char === "x") {
    minDigits = 1;
    braces = text[end] === "{";
    if (braces) end++;
    maxDigits = braces ? 8 : 2;
  } else if (char >= "0" && char <= "7") {
    minDigits = 1;
    maxDigits = 3;
    radix = 8;
    end = pos;
  }

  if (minDigits > 0) {
    let digits = "";
    while (digits.length < maxDigits && isDigit(text[end], radix)) {
      digits += text[end++];
    }
    if (digits.length < minDigits || (braces && text[end++] !== "}")) {
      throw new SyntaxError(`Malformed escape: ${text.slice(pos - 1, end)}`);
    }
    const codePoint = parseInt(digits, radix);
    if (codePoint > 0x10ffff) {
      throw new SyntaxError(`Escape out of range: ${text.slice(pos - 1, end)}`);
    }
    return { codePoint, end };
  }
  if (Object.hasOwn(CONTROL_ESCAPES, char)) {
    return { codePoint: CONTROL_ESCAPES[char], end };
  }
  if (char === "c" && end < text.length) {
    return { codePoint: text.codePointAt(end) & 0x1f, end: end + 1 };
  }
  const escaped = charAt(text, pos);
  return { codePoint: escaped.codePointAt(0), end: pos + escaped.length };
}

function isDigit(char, radix) {
  if (char === undefined) return false;
  return radix === 8 ? /[0-7]/.test(char) : /[0-9A-Fa-f]/.test(char);
}
