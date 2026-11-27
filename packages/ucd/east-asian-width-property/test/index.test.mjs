import assert from "node:assert/strict";
import test from "node:test";
import eastAsianWidth, { VERSION, getEastAsianWidth } from "../dist/index.mjs";

test("getEastAsianWidth", () => {
  assert.equal(getEastAsianWidth(0x41), "Na");
  assert.equal(getEastAsianWidth(0x4e2d), "W");
  assert.equal(getEastAsianWidth(0x3042), "W", "hiragana");
  assert.equal(getEastAsianWidth(0xac00), "W", "Hangul syllable");
  assert.equal(getEastAsianWidth(0xff21), "F", "fullwidth A");
  assert.equal(getEastAsianWidth(0x3000), "F", "ideographic space");
  assert.equal(getEastAsianWidth(0xff76), "H", "halfwidth katakana");
  assert.equal(getEastAsianWidth(0x20a9), "H", "won sign");
  assert.equal(getEastAsianWidth(0xa1), "A", "inverted exclamation mark");
  assert.equal(getEastAsianWidth(0x416), "A", "Cyrillic");
  assert.equal(getEastAsianWidth(0xe000), "A", "private use");
  assert.equal(getEastAsianWidth(0x5d0), "N", "Hebrew");
  assert.equal(getEastAsianWidth(0x1f600), "W", "emoji");
  assert.equal(getEastAsianWidth(0x2fffd), "W", "unassigned ideographic");
  assert.equal(getEastAsianWidth(0x378), "N", "unassigned");
  assert.throws(() => getEastAsianWidth("A"), TypeError);
  assert.throws(() => getEastAsianWidth(0x110000), RangeError);
});

test("printable ASCII is narrow, its fullwidth forms are fullwidth", () => {
  for (let cp = 0x21; cp <= 0x7e; cp++) {
    assert.equal(getEastAsianWidth(cp), "Na");
    assert.equal(getEastAsianWidth(cp + 0xfee0), "F");
  }
});

test("default export", () => {
  assert.equal(eastAsianWidth, getEastAsianWidth);
  assert.equal(eastAsianWidth(0x4e2d), "W");
  assert.equal(eastAsianWidth.getEastAsianWidth, getEastAsianWidth);
  assert.equal(eastAsianWidth.VERSION, VERSION);
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
