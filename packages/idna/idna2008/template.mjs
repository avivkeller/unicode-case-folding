import { assertCodePoint, assertString } from "@internal/helpers/assert";
import { directLookup, inSet } from "@internal/helpers/tables";
import { toASCII, toUnicode } from "unicode-idna";
import {
  CATEGORIES,
  CATEGORY_NAMES,
  GREEK,
  HEBREW,
  KANA_OR_HAN,
  VERSION,
} from "#generated";

export { VERSION };

const PVALID = /* @__PURE__ */ CATEGORY_NAMES.indexOf("PVALID");
const CONTEXTJ = /* @__PURE__ */ CATEGORY_NAMES.indexOf("CONTEXTJ");
const CONTEXTO = /* @__PURE__ */ CATEGORY_NAMES.indexOf("CONTEXTO");
const categoryOf = /* @__PURE__ */ directLookup(CATEGORIES);

const ASCII = /^[\0-\x7f]*$/;
const LABEL = "(?!..--)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?";
// Domain names without an internationalized label
const ASCII_DOMAIN = new RegExp(`^(?=.{1,253}$)${LABEL}(?:\\.${LABEL})*$`, "i");
const ARABIC_INDIC_DIGITS = /[٠-٩]/;
const EXTENDED_ARABIC_INDIC_DIGITS = /[۰-۹]/;

/**
 * Checks whether a domain name is valid under IDNA2008
 * @param {string} domain - Labels may be U-labels, A-labels ("xn--…") or ASCII
 * @returns {boolean}
 */
export function isValidDomain(domain) {
  assertString(domain);
  if (ASCII_DOMAIN.test(domain)) return true;
  const ascii = toASCII(domain);
  if (ascii.error) return false;
  const labels = domain.split(".");
  const asciiLabels = ascii.domain.split(".");
  const unicodeLabels = toUnicode(domain).domain.split(".");
  if (labels.length !== asciiLabels.length) return false;
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    const unicodeLabel = unicodeLabels[i];
    // An A-label is the encoding of its U-label, and a U-label is not mapped
    if (
      ASCII.test(label)
        ? label.toLowerCase() !== asciiLabels[i]
        : label !== unicodeLabel
    ) {
      return false;
    }
    if (!hasValidCodePoints(unicodeLabel)) return false;
  }
  return true;
}

/**
 * Checks whether a label of a domain name is valid under IDNA2008
 * @param {string} label - A U-label, an A-label ("xn--…") or an ASCII label
 * @returns {boolean}
 */
export function isValidLabel(label) {
  assertString(label);
  return !label.includes(".") && isValidDomain(label);
}

/**
 * Returns the IDNA2008 derived property of a code point (RFC 5892)
 * @param {number} codePoint
 * @returns {"PVALID" | "CONTEXTJ" | "CONTEXTO" | "DISALLOWED" | "UNASSIGNED"}
 */
export function getIdna2008Property(codePoint) {
  assertCodePoint(codePoint);
  return CATEGORY_NAMES[categoryOf(codePoint)];
}

function hasValidCodePoints(label) {
  let before = -1;
  for (let i = 0; i < label.length; ) {
    const codePoint = label.codePointAt(i);
    i += codePoint > 0xffff ? 2 : 1;
    const category = categoryOf(codePoint);
    // ToASCII has applied the ContextJ rules
    if (category !== PVALID && category !== CONTEXTJ) {
      if (category !== CONTEXTO) return false;
      const after = i < label.length ? label.codePointAt(i) : -1;
      if (!isAllowedInContext(codePoint, before, after, label)) return false;
    }
    before = codePoint;
  }
  return true;
}

// The ContextO rules of RFC 5892, appendix A.3 to A.9
function isAllowedInContext(codePoint, before, after, label) {
  switch (codePoint) {
    case 0x00b7:
      return before === 0x6c && after === 0x6c;
    case 0x0375:
      return after !== -1 && inSet(GREEK, after);
    case 0x05f3:
    case 0x05f4:
      return before !== -1 && inSet(HEBREW, before);
    case 0x30fb:
      for (const char of label) {
        if (inSet(KANA_OR_HAN, char.codePointAt(0))) return true;
      }
      return false;
    default:
      return codePoint <= 0x0669
        ? !EXTENDED_ARABIC_INDIC_DIGITS.test(label)
        : !ARABIC_INDIC_DIGITS.test(label);
  }
}

export default /* @__PURE__ */ Object.assign(isValidDomain, {
  isValidDomain,
  isValidLabel,
  getIdna2008Property,
  VERSION,
});
