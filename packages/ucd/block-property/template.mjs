import { assertCodePoint } from "@internal/helpers/assert";
import { findRun } from "@internal/helpers/tables";
import { BLOCK_ENDS, BLOCK_NAMES, BLOCK_STARTS, VERSION } from "#generated";

export { VERSION };

/**
 * Returns the block of a code point, e.g. "Basic Latin" for U+0041
 * @param {number} codePoint
 * @returns {Block | undefined} undefined if the code point is in no block
 */
export function getBlock(codePoint) {
  assertCodePoint(codePoint);
  const index = findRun(BLOCK_STARTS, codePoint);
  return index === -1 || codePoint > BLOCK_ENDS[index]
    ? undefined
    : blockAt(index);
}

/**
 * Returns every block, in code point order
 * @returns {Block[]}
 */
export function getBlocks() {
  return BLOCK_NAMES.map((name, index) => blockAt(index));
}

function blockAt(index) {
  return {
    name: BLOCK_NAMES[index],
    start: BLOCK_STARTS[index],
    end: BLOCK_ENDS[index],
  };
}

export default /* @__PURE__ */ Object.assign(getBlock, {
  getBlock,
  getBlocks,
  VERSION,
});

/**
 * @typedef {object} Block
 * @property {string} name e.g. "Latin-1 Supplement"
 * @property {number} start First code point
 * @property {number} end Last code point
 */
