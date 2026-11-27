import { assertCodePoint } from "@internal/helpers/assert";
import { getAge, getRequiredVersion, isAssignedIn } from "unicode-age";
import { getBlock, getBlocks } from "unicode-block-property";
import { getEastAsianWidth } from "unicode-east-asian-width-property";
import {
  VERSION,
  getGeneralCategory,
  getGeneralCategoryName,
  isInCategory,
} from "unicode-general-category";
import {
  getScript,
  getScriptExtensions,
  hasScript,
} from "unicode-script-property";
import { getVerticalOrientation } from "unicode-vertical-orientation";

export {
  VERSION,
  getAge,
  getBlock,
  getBlocks,
  getEastAsianWidth,
  getGeneralCategory,
  getGeneralCategoryName,
  getRequiredVersion,
  getScript,
  getScriptExtensions,
  getVerticalOrientation,
  hasScript,
  isAssignedIn,
  isInCategory,
};

/**
 * Returns the general category, script, block, age, East Asian width and
 * vertical orientation of a code point
 * @param {number} codePoint
 * @returns {CharacterProperties}
 */
export function getProperties(codePoint) {
  assertCodePoint(codePoint);
  return {
    generalCategory: getGeneralCategory(codePoint),
    script: getScript(codePoint),
    scriptExtensions: getScriptExtensions(codePoint),
    block: getBlock(codePoint)?.name,
    age: getAge(codePoint),
    eastAsianWidth: getEastAsianWidth(codePoint),
    verticalOrientation: getVerticalOrientation(codePoint),
  };
}

export default /* @__PURE__ */ Object.assign(getProperties, {
  getProperties,
  getGeneralCategory,
  getGeneralCategoryName,
  isInCategory,
  getScript,
  getScriptExtensions,
  hasScript,
  getBlock,
  getBlocks,
  getAge,
  getRequiredVersion,
  isAssignedIn,
  getEastAsianWidth,
  getVerticalOrientation,
  VERSION,
});

/**
 * @typedef {object} CharacterProperties
 * @property {string} generalCategory e.g. "Lu"; "Cn" if unassigned
 * @property {string} script ISO 15924 code, e.g. "Latn"
 * @property {string[]} scriptExtensions Every script the character is used in
 * @property {string | undefined} block e.g. "Basic Latin"
 * @property {string | undefined} age Unicode version, e.g. "1.1"
 * @property {"F" | "H" | "W" | "Na" | "A" | "N"} eastAsianWidth
 * @property {"U" | "R" | "Tu" | "Tr"} verticalOrientation
 */
