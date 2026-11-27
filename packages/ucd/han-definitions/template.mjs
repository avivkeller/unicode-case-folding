import { assertCodePoint } from "@internal/helpers/assert";
import { DEFINITIONS, VERSION } from "#generated";

export { VERSION };

/**
 * Returns the English definition of a Chinese character, e.g. "mountain, hill, peak" for 山
 * @param {number} codePoint
 * @returns {string | undefined}
 */
export function getDefinition(codePoint) {
  assertCodePoint(codePoint);
  return DEFINITIONS.get(codePoint);
}

export default /* @__PURE__ */ Object.assign(getDefinition, {
  getDefinition,
  VERSION,
});
