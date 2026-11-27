import assert from "node:assert/strict";
import test from "node:test";
import verticalOrientation, {
  VERSION,
  getVerticalOrientation,
} from "../dist/index.mjs";

test("getVerticalOrientation", () => {
  assert.equal(getVerticalOrientation(0x41), "R");
  assert.equal(getVerticalOrientation(0x4e2d), "U");
  assert.equal(getVerticalOrientation(0x3042), "U", "hiragana");
  assert.equal(getVerticalOrientation(0xac00), "U", "Hangul syllable");
  assert.equal(getVerticalOrientation(0x3001), "Tu", "ideographic comma");
  assert.equal(getVerticalOrientation(0x3041), "Tu", "small hiragana");
  assert.equal(getVerticalOrientation(0x300c), "Tr", "corner bracket");
  assert.equal(getVerticalOrientation(0x30fc), "Tr", "prolonged sound mark");
  assert.equal(getVerticalOrientation(0xa9), "U", "copyright sign");
  assert.equal(getVerticalOrientation(0x1f600), "U", "emoji");
  assert.equal(getVerticalOrientation(0x10330), "R", "Gothic");
  assert.equal(getVerticalOrientation(0x378), "R", "unassigned");
  assert.equal(getVerticalOrientation(0x2fffd), "U", "unassigned ideographic");
  assert.throws(() => getVerticalOrientation("A"), TypeError);
  assert.throws(() => getVerticalOrientation(-1), RangeError);
});

test("every code point has one of the four values", () => {
  const counts = { U: 0, R: 0, Tu: 0, Tr: 0 };
  for (let cp = 0; cp <= 0x10ffff; cp++) counts[getVerticalOrientation(cp)]++;
  assert.deepEqual(Object.keys(counts), ["U", "R", "Tu", "Tr"]);
  for (const count of Object.values(counts)) assert.ok(count > 0);
});

test("default export", () => {
  assert.equal(verticalOrientation, getVerticalOrientation);
  assert.equal(verticalOrientation(0x4e2d), "U");
  assert.equal(
    verticalOrientation.getVerticalOrientation,
    getVerticalOrientation,
  );
  assert.equal(verticalOrientation.VERSION, VERSION);
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
