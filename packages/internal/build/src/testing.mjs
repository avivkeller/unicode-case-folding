import assert from "node:assert/strict";

const UNKNOWN_TO_ENGINE = /\P{Assigned}/u;

export function assertMatchesNative(ours, native) {
  for (let codePoint = 0; codePoint <= 0x10ffff; codePoint++) {
    if (codePoint >= 0xd800 && codePoint <= 0xdfff) continue;
    const char = String.fromCodePoint(codePoint);
    const actual = ours(char);
    const expected = native(char);
    if (actual !== expected && !UNKNOWN_TO_ENGINE.test(char + actual)) {
      const hex = codePoint.toString(16).toUpperCase().padStart(4, "0");
      assert.fail(
        `U+${hex}: got ${JSON.stringify(actual)}, the engine gives ${JSON.stringify(expected)}`,
      );
    }
  }
}
