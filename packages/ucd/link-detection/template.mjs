import { assertString } from "@internal/helpers/assert";
import { directLookup } from "@internal/helpers/tables";
import { BRACKETS, FLAGS, VERSION } from "#generated";
import {
  CLOSE,
  EMAIL,
  HARD,
  LABEL,
  OPEN,
  SEPARATOR,
  SOFT,
  TERM,
  TOP_LEVEL,
} from "./flags.mjs";

export { VERSION };

const NONE = 0;
const PATH = 1;
const QUERY = 2;
const FRAGMENT = 3;
const DIRECTIVE = 4;
const INITIATORS = ["", "/", "?", "#", ":~:"];

const STACK_LIMIT = 125;

const SLASH = 0x2f;
const QUESTION = 0x3f;
const HASH = 0x23;
const COLON = 0x3a;
const TILDE = 0x7e;
const AMPERSAND = 0x26;
const EQUALS = 0x3d;
const COMMA = 0x2c;
const PLUS = 0x2b;
const PERCENT = 0x25;
const DOT = 0x2e;
const AT = 0x40;
const HYPHEN = 0x2d;
const BACKSLASH = 0x5c;
const UNDERSCORE = 0x5f;

// Token flags of formatLink, above the code point
const LITERAL = 0x200000;
const ESCAPED = 0x400000;
const CODE_POINT = 0x1fffff;

const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;
const BASE = /^(?:[a-z][a-z0-9+.-]*:)?(?:\/\/)?[^/?#]*/i;

const flagsOf = /* @__PURE__ */ directLookup(FLAGS);

let brackets;
function openingBracket(codePoint) {
  if (brackets === undefined) {
    brackets = new Map();
    for (let i = 0; i < BRACKETS.length; i += 2) {
      brackets.set(BRACKETS[i], BRACKETS[i + 1]);
    }
  }
  return brackets.get(codePoint);
}

/**
 * Finds the URLs and email addresses of a text (UTS #58)
 * @param {string} text
 * @param {FindLinksOptions} [options]
 * @returns {Link[]} In order, without overlaps
 */
export function findLinks(text, options = {}) {
  assertString(text);
  const { acceptDomain } = options;

  const links = [];
  const length = text.length;
  for (let i = 0; i < length; ) {
    const unit = text.charCodeAt(i);
    if (unit === AT) {
      const runEnd = hostRunEnd(text, i + 1);
      const end = domainEnd(text, i + 1, runEnd, acceptDomain);
      const start =
        end === -1 || text.charCodeAt(runEnd) === AT ? -1 : emailStart(text, i);
      if (start !== -1 && text.charCodeAt(start - 1) !== AT) {
        while (links.length > 0 && links.at(-1).end > start) links.pop();
        links.push({ type: "email", start, end });
      }
      i = runEnd;
      continue;
    }
    const codePoint = unit < 0xd800 ? unit : text.codePointAt(i);
    if (!(flagsOf(codePoint) & (LABEL | SEPARATOR))) {
      i += codePoint > 0xffff ? 2 : 1;
      continue;
    }

    const runEnd = hostRunEnd(text, i);
    const next = text.charCodeAt(runEnd);
    if (next === AT) {
      i = runEnd;
      continue;
    }

    let hostStart = i;
    let hostRun = runEnd;
    let linkable = true;
    if (next === COLON && text.startsWith("//", runEnd + 1)) {
      hostStart = runEnd + 3;
      const scheme = text.slice(i, runEnd).toLowerCase();
      linkable = scheme === "http" || scheme === "https";
      const userinfo = userinfoEnd(text, hostStart);
      hostRun = hostRunEnd(text, userinfo === -1 ? hostStart : userinfo);
      if (userinfo !== -1) linkable = false;
    } else if (i > 0) {
      const before = text.charCodeAt(i - 1);
      linkable =
        before !== SLASH && before !== BACKSLASH && before !== UNDERSCORE;
    }

    const host = linkable
      ? hostEnd(text, hostStart, hostRun, hostStart !== i, acceptDomain)
      : -1;
    if (host === -1) {
      i = hostRun;
      continue;
    }
    const end = linkEnd(text, host);
    links.push({ type: "url", start: i, end });
    i = end > hostRun ? end : hostRun;
  }
  return links;
}

/**
 * Finds where a URL ends in a text: the UTS #58 termination algorithm
 * @param {string} text
 * @param {number} start - UTF-16 offset just after the host and port
 * @returns {number} UTF-16 offset of the end of the path, query and fragment
 */
export function findLinkEnd(text, start) {
  assertString(text);
  if (!Number.isInteger(start) || start < 0 || start > text.length) {
    throw new RangeError(`Invalid offset: ${start}`);
  }
  return linkEnd(text, start);
}

/**
 * Formats a URL for display with as few percent-escapes as link detection allows
 * @param {string | LinkParts} link - A URL, or its unescaped parts
 * @returns {string}
 */
export function formatLink(link) {
  if (typeof link === "string") return formatParts(...parseUrl(link));
  if (link === null || typeof link !== "object") {
    throw new TypeError("Link must be a string or an object");
  }
  const { base = "", path, query, fragment, directives } = link;
  assertString(base);
  const parts = [];
  if (path !== undefined) {
    parts.push([
      PATH,
      joinLiterals(
        [...path].map((segment) => [segment]),
        SLASH,
      ),
    ]);
  }
  if (query !== undefined) {
    const pairs = [...query].map(([key, value]) =>
      value === undefined ? [key] : [key, value],
    );
    parts.push([QUERY, joinLiterals(pairs, AMPERSAND)]);
  }
  if (fragment !== undefined || directives !== undefined) {
    assertString(fragment ?? "");
    parts.push([FRAGMENT, literalTokens(fragment ?? "")]);
  }
  if (directives !== undefined) {
    const tokens = [];
    for (const [i, directive] of [...directives].entries()) {
      assertString(directive);
      if (i > 0) tokens.push(COLON, TILDE, COLON);
      for (const char of directive) tokens.push(char.codePointAt(0));
    }
    parts.push([DIRECTIVE, tokens]);
  }
  return formatParts(base, parts);
}

/**
 * Formats an email address, quoting the local-part if link detection needs it
 * @param {string} localPart - Unquoted, e.g. "john.doe"
 * @param {string} domain
 * @returns {string}
 */
export function formatEmail(localPart, domain) {
  assertString(localPart);
  assertString(domain);
  let plain =
    localPart !== "" &&
    !localPart.startsWith(".") &&
    !localPart.endsWith(".") &&
    !localPart.includes("..");
  for (const char of plain ? localPart : "") {
    if (!(flagsOf(char.codePointAt(0)) & EMAIL)) {
      plain = false;
      break;
    }
  }
  const local = plain ? localPart : `"${localPart.replace(/["\\]/g, "\\$&")}"`;
  return `${local}@${domain}`;
}

function hostRunEnd(text, start) {
  const length = text.length;
  let i = start;
  while (i < length) {
    const unit = text.charCodeAt(i);
    if (unit < 0xd800) {
      if (!(flagsOf(unit) & (LABEL | SEPARATOR))) break;
      i++;
    } else {
      const codePoint = text.codePointAt(i);
      if (!(flagsOf(codePoint) & (LABEL | SEPARATOR))) break;
      i += codePoint > 0xffff ? 2 : 1;
    }
  }
  return i;
}

// The offset after the last "@" of an authority, or -1
function userinfoEnd(text, start) {
  let end = -1;
  for (let i = start; i < text.length; i++) {
    const unit = text.charCodeAt(i);
    if (unit === AT) end = i + 1;
    else if (
      unit === SLASH ||
      unit === QUESTION ||
      unit === HASH ||
      (flagsOf(unit) & TERM) === HARD
    ) {
      break;
    }
  }
  return end;
}

function isSeparator(unit) {
  return unit === DOT || unit === 0x3002 || unit === 0xff0e || unit === 0xff61;
}

// The end of the domain of a run of labels, without its trailing dot, or -1
function domainEnd(text, start, runEnd, acceptDomain) {
  let end = runEnd;
  if (end > start && isSeparator(text.charCodeAt(end - 1))) end--;
  let labels = 0;
  let labelStart = start;
  for (let i = start; i <= end; i++) {
    if (i < end && !isSeparator(text.charCodeAt(i))) continue;
    if (
      i === labelStart ||
      text.charCodeAt(labelStart) === HYPHEN ||
      text.charCodeAt(i - 1) === HYPHEN
    ) {
      return -1;
    }
    labels++;
    if (i < end) labelStart = i + 1;
  }
  if (labels < 2 || !isTopLevelDomain(text.slice(labelStart, end))) return -1;
  if (acceptDomain && !acceptDomain(text.slice(start, end))) return -1;
  return end;
}

function isTopLevelDomain(label) {
  if (/^xn--/i.test(label)) {
    label = decodePunycode(label.slice(4));
    if (label === undefined) return false;
  }
  let ascii = true;
  for (let i = 0; i < label.length; ) {
    const codePoint = label.codePointAt(i);
    if (!(flagsOf(codePoint) & TOP_LEVEL)) return false;
    if (codePoint > 0x7f) ascii = false;
    i += codePoint > 0xffff ? 2 : 1;
  }
  return label.length >= (ascii ? 2 : 1);
}

function decodePunycode(input) {
  const output = [];
  const basic = Math.max(input.lastIndexOf("-"), 0);
  for (let j = 0; j < basic; j++) {
    const unit = input.charCodeAt(j);
    if (unit >= 0x80) return undefined;
    output.push(unit);
  }
  let codePoint = 128;
  let bias = 72;
  let i = 0;
  for (let index = basic > 0 ? basic + 1 : 0; index < input.length; ) {
    const previous = i;
    for (let weight = 1, k = 36; ; k += 36) {
      const unit = input.charCodeAt(index++);
      const digit =
        unit >= 0x30 && unit < 0x3a
          ? unit - 22
          : unit >= 0x41 && unit < 0x5b
            ? unit - 0x41
            : unit >= 0x61 && unit < 0x7b
              ? unit - 0x61
              : 36;
      if (digit === 36) return undefined;
      i += digit * weight;
      if (i > 0x7fffffff) return undefined;
      const threshold = k <= bias ? 1 : k >= bias + 26 ? 26 : k - bias;
      if (digit < threshold) break;
      weight *= 36 - threshold;
    }
    const count = output.length + 1;
    let delta =
      previous === 0 ? Math.floor((i - previous) / 700) : (i - previous) >> 1;
    delta += Math.floor(delta / count);
    let k = 0;
    for (; delta > 455; k += 36) delta = Math.floor(delta / 35);
    bias = k + Math.floor((36 * delta) / (delta + 38));
    codePoint += Math.floor(i / count);
    i %= count;
    if (codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) {
      return undefined;
    }
    output.splice(i++, 0, codePoint);
  }
  return String.fromCodePoint(...output);
}

// The end of the host and port, where the termination algorithm starts, or -1
function hostEnd(text, start, runEnd, hasScheme, acceptDomain) {
  let end = domainEnd(text, start, runEnd, acceptDomain);
  if (end === -1) {
    if (!hasScheme || !IPV4.test(text.slice(start, runEnd))) return -1;
    end = runEnd;
  }
  let after = runEnd;
  if (text.charCodeAt(after) === COLON) {
    let digits = after + 1;
    while (isDigit(text.charCodeAt(digits))) digits++;
    if (digits > after + 1) after = digits;
  }
  if (end === runEnd || after > runEnd) return after;
  // A trailing dot belongs to the host only before a path, query or fragment
  const next = text.charCodeAt(after);
  return next === SLASH || next === QUESTION || next === HASH ? after : end;
}

function isDigit(unit) {
  return unit >= 0x30 && unit <= 0x39;
}

function isHexDigit(unit) {
  return (
    isDigit(unit) ||
    (unit >= 0x41 && unit <= 0x46) ||
    (unit >= 0x61 && unit <= 0x66)
  );
}

function isDirectiveStart(text, i) {
  return (
    text.charCodeAt(i) === COLON &&
    text.charCodeAt(i + 1) === TILDE &&
    text.charCodeAt(i + 2) === COLON
  );
}

// The length of the separator of a part that clears the stack of brackets
function separatorLength(part, unit, text, i) {
  if (part === PATH) return unit === SLASH ? 1 : 0;
  if (part === QUERY) return unit === EQUALS || unit === AMPERSAND ? 1 : 0;
  if (part !== DIRECTIVE) return 0;
  if (unit === AMPERSAND || unit === COMMA) return 1;
  return isDirectiveStart(text, i) ? 3 : 0;
}

function linkEnd(text, start) {
  const length = text.length;
  const stack = [];
  let lastSafe = start;
  let part = NONE;
  let previous = NONE;
  for (let i = start; i < length; ) {
    const unit = text.charCodeAt(i);
    if (
      part === PATH
        ? unit === QUESTION || unit === HASH
        : part === QUERY
          ? unit === HASH
          : part === FRAGMENT && isDirectiveStart(text, i)
    ) {
      previous = part;
      part = NONE;
    }
    if (part === NONE) {
      if (unit === SLASH) part = PATH;
      else if (unit === QUESTION) part = QUERY;
      else if (unit === HASH) part = FRAGMENT;
      else if (previous === FRAGMENT && isDirectiveStart(text, i)) {
        part = DIRECTIVE;
        i += 2;
      } else return lastSafe;
      lastSafe = ++i;
      stack.length = 0;
      continue;
    }
    const separator = separatorLength(part, unit, text, i);
    if (separator > 0) {
      lastSafe = i += separator;
      stack.length = 0;
      continue;
    }

    const codePoint = unit < 0xd800 ? unit : text.codePointAt(i);
    const next = i + (codePoint > 0xffff ? 2 : 1);
    const term = flagsOf(codePoint) & TERM;
    if (term === HARD) return lastSafe;
    if (term === OPEN) {
      if (stack.length === STACK_LIMIT) return lastSafe;
      stack.push(codePoint);
    } else if (term === CLOSE && stack.pop() !== openingBracket(codePoint)) {
      return lastSafe;
    }
    if (term !== SOFT) lastSafe = next;
    i = next;
  }
  return lastSafe;
}

function emailStart(text, at) {
  if (at === 0 || text.charCodeAt(at - 1) === DOT) return -1;
  let start = 0;
  for (let i = at; i > 0; ) {
    let previous = i - 1;
    let codePoint = text.charCodeAt(previous);
    if (codePoint >= 0xdc00 && codePoint <= 0xdfff && previous > 0) {
      const lead = text.charCodeAt(previous - 1);
      if (lead >= 0xd800 && lead <= 0xdbff) {
        codePoint = text.codePointAt(--previous);
      }
    }
    if (codePoint === DOT) {
      if (text.charCodeAt(i) === DOT) return -1;
    } else if (!(flagsOf(codePoint) & EMAIL)) {
      start = i;
      break;
    }
    i = previous;
  }
  if (start === at || text.charCodeAt(start) === DOT) return -1;
  return start >= 7 && text.slice(start - 7, start).toLowerCase() === "mailto:"
    ? start - 7
    : start;
}

function literalTokens(string) {
  const tokens = [];
  for (const char of string) tokens.push(char.codePointAt(0) | LITERAL);
  return tokens;
}

function joinLiterals(groups, separator) {
  const tokens = [];
  for (const [i, group] of groups.entries()) {
    if (i > 0) tokens.push(separator);
    for (const [j, string] of group.entries()) {
      assertString(string);
      if (j > 0) tokens.push(EQUALS);
      for (const char of string) tokens.push(char.codePointAt(0) | LITERAL);
    }
  }
  return tokens;
}

function parseUrl(url) {
  const base = BASE.exec(url)[0];
  const rest = url.slice(base.length);
  const hash = rest.indexOf("#");
  const beforeHash = hash === -1 ? rest : rest.slice(0, hash);
  const question = beforeHash.indexOf("?");
  const path = question === -1 ? beforeHash : beforeHash.slice(0, question);
  const sources = [];
  if (path !== "") sources.push([PATH, path.slice(1)]);
  if (question !== -1) sources.push([QUERY, beforeHash.slice(question + 1)]);
  if (hash !== -1) {
    const fragment = rest.slice(hash + 1);
    const directive = fragment.indexOf(":~:");
    sources.push([
      FRAGMENT,
      directive === -1 ? fragment : fragment.slice(0, directive),
    ]);
    if (directive !== -1) {
      sources.push([DIRECTIVE, fragment.slice(directive + 3)]);
    }
  }
  // Bytes that are not UTF-8 may be in a legacy encoding: non-ASCII stays escaped
  let ascii = false;
  const tokenize = ([part, source]) => {
    const tokens = [];
    if (!decodeEscapes(source, tokens, ascii)) ascii = true;
    return [part, tokens];
  };
  let parts = sources.map(tokenize);
  if (ascii) parts = sources.map(tokenize);
  return [base, parts];
}

// Returns false if an escape sequence is not UTF-8
function decodeEscapes(source, tokens, ascii) {
  let valid = true;
  const length = source.length;
  for (let i = 0; i < length; ) {
    const unit = source.charCodeAt(i);
    if (unit !== PERCENT) {
      const codePoint = unit < 0xd800 ? unit : source.codePointAt(i);
      tokens.push(ascii && codePoint > 0x7f ? codePoint | ESCAPED : codePoint);
      i += codePoint > 0xffff ? 2 : 1;
      continue;
    }
    if (
      !isHexDigit(source.charCodeAt(i + 1)) ||
      !isHexDigit(source.charCodeAt(i + 2))
    ) {
      tokens.push(PERCENT | LITERAL);
      i++;
      continue;
    }
    const lead = parseInt(source.slice(i + 1, i + 3), 16);
    const size =
      lead < 0x80
        ? 1
        : lead < 0xc2
          ? 0
          : lead < 0xe0
            ? 2
            : lead < 0xf0
              ? 3
              : lead < 0xf5
                ? 4
                : 0;
    let codePoint = size === 1 ? lead : lead & (0xff >> (size + 1));
    let decoded = size > 0 && !(ascii && size > 1);
    for (let k = 1; decoded && k < size; k++) {
      const at = i + 3 * k;
      const byte =
        source.charCodeAt(at) === PERCENT &&
        isHexDigit(source.charCodeAt(at + 1)) &&
        isHexDigit(source.charCodeAt(at + 2))
          ? parseInt(source.slice(at + 1, at + 3), 16)
          : 0;
      if ((byte & 0xc0) !== 0x80) decoded = false;
      codePoint = (codePoint << 6) | (byte & 0x3f);
    }
    if (
      decoded &&
      (size < 3 || codePoint >= (size === 3 ? 0x800 : 0x10000)) &&
      codePoint <= 0x10ffff &&
      (codePoint < 0xd800 || codePoint > 0xdfff)
    ) {
      tokens.push(codePoint | LITERAL);
      i += 3 * size;
    } else {
      if (!ascii || size <= 1) valid = false;
      tokens.push(PERCENT, source.charCodeAt(i + 1), source.charCodeAt(i + 2));
      i += 3;
    }
  }
  return valid;
}

function isSyntax(part, codePoint) {
  return part === PATH
    ? codePoint === SLASH ||
        codePoint === QUESTION ||
        codePoint === HASH ||
        codePoint === BACKSLASH
    : part === QUERY
      ? codePoint === PLUS ||
        codePoint === HASH ||
        codePoint === EQUALS ||
        codePoint === AMPERSAND
      : part === DIRECTIVE && (codePoint === AMPERSAND || codePoint === COMMA);
}

function percentEscape(codePoint) {
  const hex = (byte) =>
    (byte < 16 ? "%0" : "%") + byte.toString(16).toUpperCase();
  const tail = (shift) => hex(0x80 | ((codePoint >> shift) & 0x3f));
  if (codePoint < 0x80) return hex(codePoint);
  if (codePoint < 0x800) return hex(0xc0 | (codePoint >> 6)) + tail(0);
  if (codePoint < 0x10000) {
    return hex(0xe0 | (codePoint >> 12)) + tail(6) + tail(0);
  }
  return hex(0xf0 | (codePoint >> 18)) + tail(12) + tail(6) + tail(0);
}

function formatParts(base, parts) {
  let last = -1;
  for (const [i, [, tokens]] of parts.entries()) if (tokens.length) last = i;
  let output = base;
  for (const [i, [part, tokens]] of parts.entries()) {
    output += INITIATORS[part] + escapePart(part, tokens, i === last);
  }
  return output;
}

// The UTS #58 minimal escaping algorithm, for one part of a URL
function escapePart(part, tokens, isLast) {
  const length = tokens.length;
  for (let i = 0; i < length; i++) {
    const token = tokens[i];
    if (!(token & LITERAL)) continue;
    const codePoint = token & CODE_POINT;
    const next = tokens[i + 1] & CODE_POINT;
    const afterNext = tokens[i + 2] & CODE_POINT;
    if (
      isSyntax(part, codePoint) ||
      (codePoint === PERCENT && isHexDigit(next) && isHexDigit(afterNext)) ||
      (codePoint === COLON &&
        part >= FRAGMENT &&
        next === TILDE &&
        afterNext === COLON)
    ) {
      tokens[i] |= ESCAPED;
    }
  }

  const stack = [];
  let output = "";
  let copied = 0;
  const copy = (end) => {
    for (; copied < end; copied++) {
      const token = tokens[copied];
      const codePoint = token & CODE_POINT;
      output +=
        token & ESCAPED
          ? percentEscape(codePoint)
          : String.fromCodePoint(codePoint);
    }
  };
  for (let i = 0; i < length; i++) {
    const token = tokens[i];
    if (token & ESCAPED) {
      copy(i + 1);
      continue;
    }
    const codePoint = token & CODE_POINT;
    if (
      token === codePoint &&
      (part === PATH
        ? codePoint === SLASH
        : part === QUERY
          ? codePoint === EQUALS || codePoint === AMPERSAND
          : part === DIRECTIVE &&
            (codePoint === AMPERSAND ||
              codePoint === COMMA ||
              (codePoint === COLON &&
                tokens[i + 1] === TILDE &&
                tokens[i + 2] === COLON)))
    ) {
      stack.length = 0;
    }
    let term = flagsOf(codePoint) & TERM;
    if (term === SOFT) continue;
    if (term === OPEN) {
      if (stack.length === STACK_LIMIT) term = HARD;
      else stack.push(codePoint);
    } else if (term === CLOSE && stack.pop() !== openingBracket(codePoint)) {
      term = HARD;
    }
    if (term === HARD) {
      copy(i);
      output += percentEscape(codePoint);
      copied = i + 1;
    } else {
      copy(i + 1);
    }
  }
  if (!isLast || copied === length) {
    copy(length);
  } else {
    copy(length - 1);
    output += percentEscape(tokens[length - 1] & CODE_POINT);
  }
  return output;
}

export default /* @__PURE__ */ Object.assign(findLinks, {
  findLinks,
  findLinkEnd,
  formatLink,
  formatEmail,
  VERSION,
});

/**
 * @typedef {object} Link
 * @property {"url" | "email"} type
 * @property {number} start UTF-16 offset
 * @property {number} end UTF-16 offset
 */

/**
 * @typedef {object} FindLinksOptions
 * @property {(domain: string) => boolean} [acceptDomain] Rejects the links
 *   whose domain it returns false for, such as with a list of top-level domains
 */

/**
 * Unescaped parts of a URL: their syntax characters are taken literally
 * @typedef {object} LinkParts
 * @property {string} [base] Scheme, host and port, copied as is, e.g. "https://example.com"
 * @property {Iterable<string>} [path] Segments
 * @property {Iterable<[string, string?]>} [query] Keys and values
 * @property {string} [fragment]
 * @property {Iterable<string>} [directives] Fragment directives, with their syntax, e.g. "text=a,b"
 */
