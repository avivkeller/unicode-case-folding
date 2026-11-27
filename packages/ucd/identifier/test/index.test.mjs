import assert from "node:assert/strict";
import test from "node:test";
import {
  VERSION,
  isIdentifier,
  isIdentifierContinue,
  isIdentifierStart,
  isPatternSyntax,
  isPatternWhiteSpace,
} from "../dist/index.mjs";

test("isIdentifier", async (t) => {
  const cases = [
    ["name", true],
    ["café", true],
    ["переменная", true],
    ["変数1", true],
    ["á", true, "combining mark after the first character"],
    ["\u{1d49c}x", true, "outside the BMP"],
    ["", false],
    ["1abc", false],
    ["́a", false],
    ["a-b", false],
    ["a b", false],
    ["_a", false, "not in the default profile"],
    ["a\u{1f600}", false],
  ];
  for (const [text, expected, description = JSON.stringify(text)] of cases) {
    await t.test(description, () => assert.equal(isIdentifier(text), expected));
  }

  await t.test("extra characters", () => {
    const js = { extraStart: "$_", extraContinue: "‌‍" };
    assert.equal(isIdentifier("_a", js), true);
    assert.equal(isIdentifier("a$_", js), true);
    assert.equal(isIdentifier("a‍", js), true);
    assert.equal(isIdentifier("‍a", js), false);
    assert.equal(isIdentifier("kebab-case", { extraContinue: "-" }), true);
    assert.equal(isIdentifier("-case", { extraContinue: "-" }), false);
  });

  await t.test("xid", () => {
    // U+037A is ID_Start, but its NFKC form starts with a space
    assert.equal(isIdentifier("ͺ"), false);
    assert.equal(isIdentifier("ͺ", { xid: false }), true);
  });

  await t.test("rejects invalid arguments", () => {
    assert.throws(() => isIdentifier(1), TypeError);
    assert.throws(() => isIdentifier("a", { extraStart: 1 }), TypeError);
  });
});

test("code point properties", () => {
  assert.equal(isIdentifierStart(0x61), true);
  assert.equal(isIdentifierStart(0x31), false);
  assert.equal(isIdentifierContinue(0x31), true);
  assert.equal(isIdentifierContinue(0x5f), true, "low line");
  assert.equal(isIdentifierStart(0x5f), false);
  assert.equal(isIdentifierStart(0x37a), false);
  assert.equal(isIdentifierStart(0x37a, { xid: false }), true);
  assert.equal(isPatternSyntax(0x2b), true);
  assert.equal(isPatternSyntax(0x61), false);
  assert.equal(isPatternWhiteSpace(0x20), true);
  assert.equal(isPatternWhiteSpace(0x200e), true, "left-to-right mark");
  assert.equal(isPatternWhiteSpace(0xa0), false, "no-break space");
  assert.throws(() => isIdentifierStart("a"), TypeError);
  assert.throws(() => isPatternSyntax(0x110000), RangeError);
});

test("agrees with the engine's properties for known characters", () => {
  const assigned = /\p{Assigned}/u;
  const checks = [
    [/\p{XID_Start}/u, (cp) => isIdentifierStart(cp)],
    [/\p{XID_Continue}/u, (cp) => isIdentifierContinue(cp)],
    [/\p{ID_Start}/u, (cp) => isIdentifierStart(cp, { xid: false })],
    [/\p{ID_Continue}/u, (cp) => isIdentifierContinue(cp, { xid: false })],
    [/\p{Pattern_Syntax}/u, isPatternSyntax],
    [/\p{Pattern_White_Space}/u, isPatternWhiteSpace],
  ];
  for (let cp = 0; cp <= 0x10ffff; cp++) {
    if (cp >= 0xd800 && cp <= 0xdfff) continue;
    const char = String.fromCodePoint(cp);
    // Pattern properties are fixed, also for unassigned code points
    const known = assigned.test(char);
    for (const [regex, ours] of checks) {
      if (!known && !regex.source.includes("Pattern")) continue;
      assert.equal(ours(cp), regex.test(char), `U+${cp.toString(16)} ${regex}`);
    }
  }
});

test("agrees with the engine's identifiers", () => {
  const js = { xid: false, extraStart: "$_", extraContinue: "‌‍" };
  const parses = (name) => {
    try {
      new Function(`var ${name};`);
      return true;
    } catch {
      return false;
    }
  };
  for (const name of ["a", "π", "ℼ2", "a‍", "$", "_1", "1a", "a-b", "℘"]) {
    assert.equal(isIdentifier(name, js), parses(name), name);
  }
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.isIdentifier);
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
