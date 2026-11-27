import { assertString } from "@internal/helpers/assert";
import { findRun, toCodePoints } from "@internal/helpers/tables";
import { isNormalized, normalize } from "unicode-normalize";
import { MAPPINGS, PROPERTIES, VERSION } from "#generated";
import {
  BIDI_AL,
  BIDI_AN,
  BIDI_EN,
  BIDI_L,
  BIDI_MASK,
  BIDI_NSM,
  BIDI_OTHER,
  BIDI_R,
  BIDI_SHIFT,
  DEVIATION,
  DISALLOWED,
  IGNORED,
  JOINING_D,
  JOINING_L,
  JOINING_MASK,
  JOINING_R,
  JOINING_SHIFT,
  JOINING_T,
  MARK,
  STATUS_MASK,
  VALID,
  VIRAMA,
} from "./properties.mjs";

export { VERSION };

const ASCII = /^[\0-\x7f]*$/;
const LETTERS_DIGITS_HYPHENS = /^[a-z0-9-]*$/;
const HYPHEN = 0x2d;
const FULL_STOP = 0x2e;
const ZERO_WIDTH_NON_JOINER = 0x200c;
const ZERO_WIDTH_JOINER = 0x200d;
const CAPITAL_SHARP_S = 0x1e9e;

const RTL_START = (1 << BIDI_R) | (1 << BIDI_AL);
const RTL_CLASSES = RTL_START | (1 << BIDI_AN);
// The classes a left-to-right label may not have, then a right-to-left one
const NOT_IN_LTR = RTL_CLASSES | (1 << BIDI_OTHER);
const NOT_IN_RTL = (1 << BIDI_L) | (1 << BIDI_OTHER);
const LTR_END = (1 << BIDI_L) | (1 << BIDI_EN);
const RTL_END = RTL_CLASSES | (1 << BIDI_EN);

// Punycode parameters (RFC 3492, section 5)
const BASE = 36;
const T_MIN = 1;
const T_MAX = 26;
const SKEW = 38;
const DAMP = 700;
const INITIAL_BIAS = 72;
const INITIAL_N = 128;
const MAX_INT = 0x7fffffff;

const [STARTS, VALUES] = PROPERTIES;
let bmp;

// Set while a domain is processed
let failed = false;
let rightToLeft = false;

/**
 * Converts a domain name to ASCII (Punycode), e.g. "Bücher.de" → "xn--bcher-kva.de"
 * @param {string} domain
 * @param {IdnaOptions & { verifyDnsLength?: boolean }} [options]
 * @returns {string | undefined} undefined if the domain is invalid
 */
export function domainToASCII(domain, options) {
  const result = toASCII(domain, options);
  return result.error ? undefined : result.domain;
}

/**
 * Converts a domain name to Unicode, e.g. "xn--bcher-kva.de" → "bücher.de"
 * @param {string} domain
 * @param {IdnaOptions} [options]
 * @returns {string} Converted as far as possible if the domain is invalid
 */
export function domainToUnicode(domain, options) {
  return toUnicode(domain, options).domain;
}

/**
 * The ToASCII operation of UTS #46
 * @param {string} domain
 * @param {IdnaOptions & { verifyDnsLength?: boolean }} [options]
 * @returns {IdnaResult}
 */
export function toASCII(domain, options = {}) {
  const labels = processDomain(domain, options);
  for (let i = 0; i < labels.length; i++) {
    if (ASCII.test(labels[i])) continue;
    const encoded = punycodeEncode(labels[i]);
    if (encoded === undefined) failed = true;
    else labels[i] = `xn--${encoded}`;
  }
  const result = labels.join(".");
  if (options.verifyDnsLength !== false && !failed) {
    if (result.length < 1 || result.length > 253) failed = true;
    for (const label of labels) {
      if (label.length < 1 || label.length > 63) failed = true;
    }
  }
  return { domain: result, error: failed };
}

/**
 * The ToUnicode operation of UTS #46
 * @param {string} domain
 * @param {IdnaOptions} [options]
 * @returns {IdnaResult}
 */
export function toUnicode(domain, options = {}) {
  const labels = processDomain(domain, options);
  return { domain: labels.join("."), error: failed };
}

function processDomain(domain, options) {
  assertString(domain);
  const checkHyphens = options.checkHyphens !== false;
  const checkBidi = options.checkBidi !== false;
  const checkJoiners = options.checkJoiners !== false;
  const useStd3AsciiRules = options.useStd3AsciiRules !== false;
  const transitional = options.transitional === true;
  const ignoreInvalidPunycode = options.ignoreInvalidPunycode === true;
  failed = false;
  rightToLeft = false;

  const labels = (
    ASCII.test(domain)
      ? domain.toLowerCase()
      : normalize(mapDomain(domain, transitional), "NFC")
  ).split(".");

  for (let i = 0; i < labels.length; i++) {
    let label = labels[i];
    let labelTransitional = transitional;
    const isPunycode = label.startsWith("xn--");
    if (isPunycode) {
      if (!ASCII.test(label)) {
        failed = true;
        continue;
      }
      const decoded = punycodeDecode(label, 4);
      if (decoded === undefined) {
        if (!ignoreInvalidPunycode) failed = true;
        continue;
      }
      labels[i] = label = decoded;
      if (label === "" || ASCII.test(label)) failed = true;
      if (!isNormalized(label, "NFC")) failed = true;
      labelTransitional = false;
    }
    if (label === "") continue;

    if (checkHyphens) {
      if (
        label.charCodeAt(0) === HYPHEN ||
        label.charCodeAt(label.length - 1) === HYPHEN ||
        hasHyphensInThirdAndFourth(label)
      ) {
        failed = true;
      }
    } else if (isPunycode && label.startsWith("xn--")) {
      failed = true;
    }
    if (!LETTERS_DIGITS_HYPHENS.test(label)) {
      validateCodePoints(
        label,
        labelTransitional,
        useStd3AsciiRules,
        checkJoiners,
      );
    }
  }

  if (checkBidi && rightToLeft) {
    for (const label of labels) {
      if (label !== "" && !satisfiesBidiRule(label)) failed = true;
    }
  }
  return labels;
}

function propertiesOf(codePoint) {
  if (codePoint > 0xffff) return VALUES[findRun(STARTS, codePoint)];
  if (bmp === undefined) {
    bmp = new Uint16Array(0x10000);
    for (let i = 0; STARTS[i] <= 0xffff; i++) {
      bmp.fill(VALUES[i], STARTS[i], STARTS[i + 1]);
    }
  }
  return bmp[codePoint];
}

function mapDomain(domain, transitional) {
  let result = "";
  let copied = 0;
  for (let i = 0; i < domain.length; ) {
    const codePoint = domain.codePointAt(i);
    const next = i + (codePoint > 0xffff ? 2 : 1);
    const status = propertiesOf(codePoint) & STATUS_MASK;
    if (
      status !== VALID &&
      status !== DISALLOWED &&
      (status !== DEVIATION || transitional)
    ) {
      result += domain.slice(copied, i);
      if (status !== IGNORED) {
        result +=
          transitional && codePoint === CAPITAL_SHARP_S
            ? "ss"
            : MAPPINGS.get(codePoint);
      }
      copied = next;
    }
    i = next;
  }
  return copied === 0 ? domain : result + domain.slice(copied);
}

function hasHyphensInThirdAndFourth(label) {
  let i = label.codePointAt(0) > 0xffff ? 2 : 1;
  if (i >= label.length) return false;
  i += label.codePointAt(i) > 0xffff ? 2 : 1;
  return label.charCodeAt(i) === HYPHEN && label.charCodeAt(i + 1) === HYPHEN;
}

function validateCodePoints(
  label,
  transitional,
  useStd3AsciiRules,
  checkJoiners,
) {
  if (propertiesOf(label.codePointAt(0)) & MARK) failed = true;
  for (let i = 0; i < label.length; ) {
    const codePoint = label.codePointAt(i);
    const properties = propertiesOf(codePoint);
    const status = properties & STATUS_MASK;
    if (status !== VALID && (status !== DEVIATION || transitional)) {
      failed = true;
    }
    if (codePoint < 0x80) {
      if (
        codePoint === FULL_STOP ||
        (useStd3AsciiRules &&
          codePoint !== HYPHEN &&
          (codePoint < 0x30 || codePoint > 0x39) &&
          (codePoint < 0x61 || codePoint > 0x7a))
      ) {
        failed = true;
      }
    } else {
      if ((RTL_CLASSES >> ((properties >> BIDI_SHIFT) & BIDI_MASK)) & 1) {
        rightToLeft = true;
      }
      if (
        checkJoiners &&
        (codePoint === ZERO_WIDTH_NON_JOINER ||
          codePoint === ZERO_WIDTH_JOINER) &&
        !isJoinerAllowed(label, i, codePoint)
      ) {
        failed = true;
      }
    }
    i += codePoint > 0xffff ? 2 : 1;
  }
}

// The ContextJ rules of RFC 5892, appendix A.1 and A.2
function isJoinerAllowed(label, index, joiner) {
  if (index === 0) return false;
  let before = index;
  let codePoint = codePointBefore(label, before);
  let properties = propertiesOf(codePoint);
  if (properties & VIRAMA) return true;
  if (joiner === ZERO_WIDTH_JOINER) return false;

  for (;;) {
    const type = (properties >> JOINING_SHIFT) & JOINING_MASK;
    if (type === JOINING_L || type === JOINING_D) break;
    if (type !== JOINING_T) return false;
    before -= codePoint > 0xffff ? 2 : 1;
    if (before === 0) return false;
    codePoint = codePointBefore(label, before);
    properties = propertiesOf(codePoint);
  }
  for (let i = index + 1; i < label.length; ) {
    const codePoint = label.codePointAt(i);
    const type = (propertiesOf(codePoint) >> JOINING_SHIFT) & JOINING_MASK;
    if (type === JOINING_R || type === JOINING_D) return true;
    if (type !== JOINING_T) return false;
    i += codePoint > 0xffff ? 2 : 1;
  }
  return false;
}

function codePointBefore(text, index) {
  const unit = text.charCodeAt(index - 1);
  if (unit >= 0xdc00 && unit <= 0xdfff && index > 1) {
    const lead = text.charCodeAt(index - 2);
    if (lead >= 0xd800 && lead <= 0xdbff) {
      return (lead - 0xd800) * 0x400 + unit - 0xdc00 + 0x10000;
    }
  }
  return unit;
}

// The Bidi rule of RFC 5893, section 2
function satisfiesBidiRule(label) {
  let seen = 0;
  let first = -1;
  let last = -1;
  for (let i = 0; i < label.length; ) {
    const codePoint = label.codePointAt(i);
    const bidiClass = (propertiesOf(codePoint) >> BIDI_SHIFT) & BIDI_MASK;
    if (first === -1) first = bidiClass;
    if (bidiClass !== BIDI_NSM) last = bidiClass;
    seen |= 1 << bidiClass;
    i += codePoint > 0xffff ? 2 : 1;
  }
  if (first === BIDI_L) {
    return (seen & NOT_IN_LTR) === 0 && ((LTR_END >> last) & 1) === 1;
  }
  return (
    ((RTL_START >> first) & 1) === 1 &&
    (seen & NOT_IN_RTL) === 0 &&
    ((RTL_END >> last) & 1) === 1 &&
    ((seen >> BIDI_EN) & (seen >> BIDI_AN) & 1) === 0
  );
}

function adaptBias(delta, points, isFirst) {
  delta = isFirst ? Math.floor(delta / DAMP) : delta >> 1;
  delta += Math.floor(delta / points);
  let k = 0;
  for (; delta > ((BASE - T_MIN) * T_MAX) >> 1; k += BASE) {
    delta = Math.floor(delta / (BASE - T_MIN));
  }
  return k + Math.floor(((BASE - T_MIN + 1) * delta) / (delta + SKEW));
}

/** @returns {string | undefined} undefined if the ASCII input is not Punycode */
function punycodeDecode(input, start) {
  const codePoints = [];
  const delimiter = input.lastIndexOf("-");
  let index = start;
  if (delimiter > start) {
    for (; index < delimiter; index++) codePoints.push(input.charCodeAt(index));
    index++;
  }
  let n = INITIAL_N;
  let i = 0;
  let bias = INITIAL_BIAS;
  while (index < input.length) {
    const previous = i;
    let weight = 1;
    for (let k = BASE; ; k += BASE) {
      if (index >= input.length) return undefined;
      const unit = input.charCodeAt(index++);
      const digit =
        unit >= 0x61 && unit <= 0x7a
          ? unit - 0x61
          : unit >= 0x30 && unit <= 0x39
            ? unit - 22
            : unit >= 0x41 && unit <= 0x5a
              ? unit - 0x41
              : BASE;
      if (digit === BASE || digit > Math.floor((MAX_INT - i) / weight)) {
        return undefined;
      }
      i += digit * weight;
      const threshold =
        k <= bias ? T_MIN : k >= bias + T_MAX ? T_MAX : k - bias;
      if (digit < threshold) break;
      if (weight > Math.floor(MAX_INT / (BASE - threshold))) return undefined;
      weight *= BASE - threshold;
    }
    const length = codePoints.length + 1;
    bias = adaptBias(i - previous, length, previous === 0);
    n += Math.floor(i / length);
    if (n > 0x10ffff) return undefined;
    i %= length;
    codePoints.splice(i++, 0, n);
  }
  let decoded = "";
  for (const codePoint of codePoints) {
    decoded += String.fromCodePoint(codePoint);
  }
  return decoded;
}

/** @returns {string | undefined} undefined on overflow */
function punycodeEncode(label) {
  const codePoints = toCodePoints(label);
  let encoded = "";
  for (const codePoint of codePoints) {
    if (codePoint < 0x80) encoded += String.fromCharCode(codePoint);
  }
  const basic = encoded.length;
  if (basic > 0) encoded += "-";
  let handled = basic;
  let n = INITIAL_N;
  let delta = 0;
  let bias = INITIAL_BIAS;
  while (handled < codePoints.length) {
    let next = MAX_INT;
    for (const codePoint of codePoints) {
      if (codePoint >= n && codePoint < next) next = codePoint;
    }
    if (next - n > Math.floor((MAX_INT - delta) / (handled + 1))) {
      return undefined;
    }
    delta += (next - n) * (handled + 1);
    n = next;
    for (const codePoint of codePoints) {
      if (codePoint < n && ++delta > MAX_INT) return undefined;
      if (codePoint !== n) continue;
      let q = delta;
      for (let k = BASE; ; k += BASE) {
        const threshold =
          k <= bias ? T_MIN : k >= bias + T_MAX ? T_MAX : k - bias;
        if (q < threshold) break;
        encoded += punycodeDigit(
          threshold + ((q - threshold) % (BASE - threshold)),
        );
        q = Math.floor((q - threshold) / (BASE - threshold));
      }
      encoded += punycodeDigit(q);
      bias = adaptBias(delta, handled + 1, handled === basic);
      delta = 0;
      handled++;
    }
    delta++;
    n++;
  }
  return encoded;
}

function punycodeDigit(digit) {
  return String.fromCharCode(digit < 26 ? 0x61 + digit : 22 + digit);
}

export default /* @__PURE__ */ Object.assign(domainToASCII, {
  domainToASCII,
  domainToUnicode,
  toASCII,
  toUnicode,
  VERSION,
});

/**
 * Every check is on unless set to false
 * @typedef {object} IdnaOptions
 * @property {boolean} [checkHyphens] No hyphens at the start, the end, or the third and fourth positions
 * @property {boolean} [checkBidi] The Bidi rule of RFC 5893
 * @property {boolean} [checkJoiners] The ContextJ rules of RFC 5892
 * @property {boolean} [useStd3AsciiRules] Of ASCII, only letters, digits and hyphens
 * @property {boolean} [transitional] Deprecated: maps ß, ς and joiners as IDNA2003 did. false by default
 * @property {boolean} [ignoreInvalidPunycode] Leaves labels that are not Punycode as they are. false by default
 */

/**
 * @typedef {object} IdnaResult
 * @property {string} domain
 * @property {boolean} error
 */
