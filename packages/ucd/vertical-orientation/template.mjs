import { assertCodePoint } from "@internal/helpers/assert";
import { directLookup } from "@internal/helpers/tables";
import { ORIENTATION_CODES, ORIENTATIONS, VERSION } from "#generated";

export { VERSION };

const orientationOf = /* @__PURE__ */ directLookup(ORIENTATIONS);

/**
 * Returns the Vertical_Orientation property of a code point (UAX #50)
 * @param {number} codePoint
 * @returns {VerticalOrientation}
 */
export function getVerticalOrientation(codePoint) {
  assertCodePoint(codePoint);
  return /** @type {VerticalOrientation} */ (
    ORIENTATION_CODES[orientationOf(codePoint)]
  );
}

export default /* @__PURE__ */ Object.assign(getVerticalOrientation, {
  getVerticalOrientation,
  VERSION,
});

/**
 * "U": upright, "R": rotated 90° clockwise, "Tu" and "Tr": needs a vertical
 * glyph, with an upright or a rotated fallback
 * @typedef {"U" | "R" | "Tu" | "Tr"} VerticalOrientation
 */
