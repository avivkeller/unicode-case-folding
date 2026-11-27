import assert from "node:assert/strict";
import test from "node:test";
import {
  VERSION,
  compareRadicalStroke,
  getEquivalentIdeograph,
  getRadicalCharacter,
  getRadicalStroke,
  getTotalStrokes,
} from "../dist/index.mjs";

const index = (radical, residualStrokes, totalStrokes) => ({
  radical,
  residualStrokes,
  totalStrokes,
});

test("getRadicalStroke", () => {
  assert.deepEqual(getRadicalStroke(0x6f22), index(85, 11, 14));
  assert.deepEqual(getRadicalStroke(0x6c49), index(85, 2, 5));
  assert.deepEqual(getRadicalStroke(0x5c71), index(46, 0, 3));
  assert.deepEqual(
    getRadicalStroke(0x7ea2),
    index(120, 3, 6),
    "simplified radical",
  );
  assert.deepEqual(
    getRadicalStroke(0x225a9),
    index(61, -1, 3),
    "negative residual strokes",
  );
  assert.deepEqual(
    getRadicalStroke(0x3687),
    index(35, 6, 9),
    "the first of two radicals",
  );
  assert.equal(getRadicalStroke(0x41), undefined);
  assert.equal(getRadicalStroke(0x2f2d), undefined, "a radical character");
  assert.throws(() => getRadicalStroke("漢"), TypeError);
  assert.throws(() => getRadicalStroke(0x110000), RangeError);
});

test("getTotalStrokes", () => {
  assert.equal(getTotalStrokes(0x4e00), 1);
  assert.equal(getTotalStrokes(0x9f98), 48);
  assert.equal(getTotalStrokes(0x41), undefined);
});

test("getRadicalCharacter", () => {
  assert.equal(getRadicalCharacter(46), "⼭");
  assert.equal(getRadicalCharacter(214), "⿕");
  assert.equal(getRadicalCharacter(0), undefined);
  assert.equal(getRadicalCharacter(215), undefined);
  assert.throws(() => getRadicalCharacter("46"), TypeError);
});

test("getEquivalentIdeograph", () => {
  assert.equal(getEquivalentIdeograph(0x2f2d), "山");
  assert.equal(getEquivalentIdeograph(0x2e8d), "小", "second of a range");
  assert.equal(getEquivalentIdeograph(0x5c71), undefined);
});

test("every radical is an ideograph filed under it", () => {
  for (let radical = 1; radical <= 214; radical++) {
    const ideograph = getEquivalentIdeograph(
      getRadicalCharacter(radical).codePointAt(0),
    );
    assert.deepEqual(
      getRadicalStroke(ideograph.codePointAt(0)),
      index(radical, 0, getTotalStrokes(ideograph.codePointAt(0))),
      ideograph,
    );
  }
});

test("compareRadicalStroke", () => {
  assert.deepEqual(
    ["水", "林", "一", "人", "森", "木"].sort(compareRadicalStroke),
    ["一", "人", "木", "林", "森", "水"],
  );
  assert.ok(compareRadicalStroke("汉", "漢") < 0, "fewer residual strokes");
  assert.ok(compareRadicalStroke("abc", "一") < 0, "other text comes first");
  assert.ok(compareRadicalStroke("山", "山水") < 0, "prefix");
  assert.ok(compareRadicalStroke("山水", "山人") > 0, "second character");
  assert.equal(compareRadicalStroke("山水", "山水"), 0);
  assert.ok(
    compareRadicalStroke("\u{20000}", "\u{20001}") < 0,
    "code point order breaks ties",
  );
  assert.throws(() => compareRadicalStroke("a", 1), TypeError);
});

test("every character has a radical and stroke counts", () => {
  let count = 0;
  for (let cp = 0x3400; cp <= 0x33fff; cp++) {
    const radicalStroke = getRadicalStroke(cp);
    if (radicalStroke === undefined) continue;
    const { radical, residualStrokes, totalStrokes } = radicalStroke;
    assert.ok(radical >= 1 && radical <= 214, `U+${cp.toString(16)}`);
    assert.ok(Number.isInteger(residualStrokes));
    assert.ok(totalStrokes >= 1);
    assert.equal(totalStrokes, getTotalStrokes(cp));
    count++;
  }
  assert.ok(count > 100000);
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.getRadicalStroke);
  assert.equal(main(0x5c71).radical, 46);
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
