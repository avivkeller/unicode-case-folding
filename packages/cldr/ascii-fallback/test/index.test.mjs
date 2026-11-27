import assert from "node:assert/strict";
import test from "node:test";
import { VERSION, toAscii } from "../dist/index.mjs";

test("toAscii", async (t) => {
  const cases = [
    ["plain ASCII", "plain ASCII", "leaves ASCII unchanged"],
    ["", "", "empty string"],
    ["Crème brûlée", "Creme brulee", "removes accents"],
    ["n\u0303a\u0301", "na", "removes combining marks after Latin letters"],
    ["1\u20e3", "1?", "keeps enclosing marks, which are not nonspacing"],
    ["Straße", "Strasse", "spells out sharp s"],
    ["Ærøskøbing", "AEroskobing", "spells out ligatures and stroked letters"],
    ["Łódź", "Lodz", "stroked L"],
    ["ǅ", "Dz", "digraph"],
    ["ﬁ", "fi", "presentation form"],
    ["“Smart” ‘quotes’", "\"Smart\" 'quotes'", "quotes"],
    ["a–b—c…", "a-b-c...", "dashes and ellipsis"],
    ["© ® ™", "(C) (R) TM", "symbols"],
    ["½", " 1/2", "fractions"],
    ["Ⅻ", "XII", "Roman numerals"],
    ["€5", "EUR5", "character fallbacks: euro sign"],
    ["→", "->", "arrows"],
    ["a\u00a0b", "a b", "no-break space"],
    ["ＡＢ", "AB", "fullwidth letters"],
  ];
  for (const [input, expected, description] of cases) {
    await t.test(description, () => assert.equal(toAscii(input), expected));
  }

  await t.test("replaces characters with no ASCII form", () => {
    assert.equal(toAscii("日本"), "??");
    assert.equal(toAscii("Привет", { replacement: "" }), "");
    assert.equal(toAscii("Ω!", { replacement: "_" }), "_!");
  });

  await t.test("keeps them with replacement: null", () => {
    assert.equal(toAscii("café 日本", { replacement: null }), "cafe 日本");
  });

  await t.test("always returns ASCII", () => {
    for (let cp = 0; cp <= 0x10ffff; cp += 7) {
      if (cp >= 0xd800 && cp <= 0xdfff) continue;
      const result = toAscii(String.fromCodePoint(cp));
      assert.doesNotMatch(result, /\P{ASCII}/u, `U+${cp.toString(16)}`);
    }
  });

  await t.test("rejects invalid arguments", () => {
    assert.throws(() => toAscii(1), TypeError);
    assert.throws(() => toAscii("a", { replacement: 1 }), TypeError);
  });
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.toAscii);
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
