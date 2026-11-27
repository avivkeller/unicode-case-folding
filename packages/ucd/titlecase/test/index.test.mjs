import assert from "node:assert/strict";
import test from "node:test";
import {
  isTitlecase,
  lookupTitlecase,
  toTitlecase,
  VERSION,
} from "../dist/index.mjs";

test("toTitlecase", async (t) => {
  const cases = [
    ["hello world", "Hello World", "ASCII words"],
    ["HELLO WORLD", "Hello World", "lowercases the rest of each word"],
    ["", "", "empty string"],
    ["don't stop", "Don't Stop", "apostrophe inside a word"],
    ["o'neil", "O'neil", "the rest of the word is lowercased"],
    ["ǆemal", "ǅemal", "titlecase digraph"],
    ["ﬁsh", "Fish", "ligature"],
    ["ßa", "Ssa", "sharp s"],
    ["ΣΑΣ ΑΣ", "Σας Ας", "final sigma"],
    ["(hello)", "(Hello)", "uncased characters before the first letter"],
    ["123abc", "123Abc", "skips uncased characters such as digits"],
    ["привет мир", "Привет Мир", "Cyrillic"],
  ];
  for (const [input, expected, description] of cases) {
    await t.test(description, () => assert.equal(toTitlecase(input), expected));
  }

  await t.test("Turkish", () => {
    assert.equal(
      toTitlecase("istanbul IŞIK", { locale: "tr" }),
      "İstanbul Işık",
    );
    assert.equal(toTitlecase("istanbul", { locale: "en" }), "Istanbul");
  });

  await t.test("custom segmenter", () => {
    const segmenter = {
      *segment(input) {
        for (const segment of input.split(/(?<=-)/)) yield { segment };
      },
    };
    assert.equal(toTitlecase("jean-luc", { segmenter }), "Jean-Luc");
    assert.throws(
      () =>
        toTitlecase("abc", {
          segmenter: { segment: () => [{ segment: "a" }] },
        }),
      /do not add up/,
    );
  });

  await t.test("rejects invalid arguments", () => {
    assert.throws(() => toTitlecase(undefined), TypeError);
  });
});

test("isTitlecase", () => {
  assert.equal(isTitlecase("Hello World"), true);
  assert.equal(isTitlecase("Hello world"), false);
  assert.equal(isTitlecase("HELLO"), false);
});

test("lookupTitlecase", () => {
  assert.deepEqual(lookupTitlecase(0x1c6), [0x1c5]);
  assert.deepEqual(lookupTitlecase(0xdf), [0x53, 0x73]);
  assert.equal(lookupTitlecase(0x1c5), undefined);
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
