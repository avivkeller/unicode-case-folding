import assert from "node:assert/strict";
import test from "node:test";
import {
  lookupFolding,
  caseFold,
  caseFoldEquals,
  VERSION,
} from "../dist/index.mjs";

test("caseFold", async (t) => {
  const cases = [
    ["Hello", "hello", "ASCII"],
    ["", "", "empty string"],
    ["ＡＢＣ", "abc", "fullwidth letters"],
    ["①②", "12", "circled digits"],
    ["ﬁ", "fi", "ligature"],
    ["Straße", "strasse", "sharp s"],
    ["㎒", "mhz", "square unit"],
    ["soft\u00adhyphen", "softhyphen", "removes default ignorables"],
    ["a\u200db", "ab", "removes zero width joiner"],
    ["\u212b", "\u00e5", "U+212B ANGSTROM SIGN folds to U+00E5"],
    ["A\u030a", "\u00e5", "decomposed input is recomposed"],
    ["𝐀𝐁", "ab", "mathematical bold letters"],
  ];
  for (const [input, expected, description] of cases) {
    await t.test(description, () => assert.equal(caseFold(input), expected));
  }

  await t.test("is idempotent", () => {
    for (let cp = 0; cp <= 0x10ffff; cp++) {
      if (cp >= 0xd800 && cp <= 0xdfff) continue;
      const once = caseFold(String.fromCodePoint(cp));
      assert.equal(caseFold(once), once, `U+${cp.toString(16)}`);
    }
  });

  await t.test("ASCII only changes A-Z", () => {
    for (let cp = 0; cp < 0x80; cp++) {
      const expected = lookupFolding(cp) ?? [cp];
      assert.deepEqual(expected, [
        String.fromCodePoint(cp).toLowerCase().codePointAt(0),
      ]);
    }
  });

  await t.test("rejects invalid arguments", () => {
    assert.throws(() => caseFold(42), TypeError);
  });
});

test("caseFoldEquals", () => {
  assert.equal(caseFoldEquals("ＡＤＭＩＮ", "admin"), true);
  assert.equal(caseFoldEquals("ad\u00admin", "Admin"), true);
  assert.equal(caseFoldEquals("admin", "admim"), false);
});

test("lookupFolding", () => {
  assert.deepEqual(lookupFolding(0x41), [0x61]);
  assert.deepEqual(lookupFolding(0xad), []);
  assert.equal(lookupFolding(0x61), undefined);
  assert.throws(() => lookupFolding(1.5), RangeError);
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.caseFold);
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
