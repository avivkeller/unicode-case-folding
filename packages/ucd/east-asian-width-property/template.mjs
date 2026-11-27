import { assertCodePoint } from "@internal/helpers/assert";
import { directLookup } from "@internal/helpers/tables";
import { VERSION, WIDTH_CODES, WIDTHS } from "#generated";

export { VERSION };

const widthOf = /* @__PURE__ */ directLookup(WIDTHS);

/**
 * Returns the East_Asian_Width property of a code point (UAX #11)
 * @param {number} codePoint
 * @returns {EastAsianWidth}
 */
export function getEastAsianWidth(codePoint) {
  assertCodePoint(codePoint);
  return /** @type {EastAsianWidth} */ (WIDTH_CODES[widthOf(codePoint)]);
}

export default /* @__PURE__ */ Object.assign(getEastAsianWidth, {
  getEastAsianWidth,
  VERSION,
});

/**
 * "F": fullwidth, "H": halfwidth, "W": wide, "Na": narrow, "A": ambiguous,
 * "N": neutral
 * @typedef {"F" | "H" | "W" | "Na" | "A" | "N"} EastAsianWidth
 */
