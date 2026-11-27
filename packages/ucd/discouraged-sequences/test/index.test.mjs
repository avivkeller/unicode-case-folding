import assert from "node:assert/strict";
import test from "node:test";
import discouragedSequences, {
  VERSION,
  findDiscouragedSequences,
  getDiscouragedSequences,
  getDiscouragedTypes,
  replaceDiscouragedSequences,
} from "../dist/index.mjs";

test("replaceDiscouragedSequences", async (t) => {
  const cases = [
    ["ŉ", "’n", "deprecated ŉ"],
    ["अा", "आ", "Devanagari AA written as A + vowel sign"],
    ["ত্‍", "ৎ", "Bengali khanda ta"],
    ["ı̇", "i̇", "dotless i with a dot above"],
    ["L̴", "Ɫ", "precomposed form"],
    ["ََ", "ً", "Arabic tashkil"],
    ["\u{111c4}", "\u{1118f}\u{11180}", "supplementary character"],
    ["xŉyŉ", "x’ny’n", "several matches"],
    ["plain text", "plain text", "ASCII"],
    ["café 中文", "café 中文", "no match"],
    ["", "", "empty string"],
  ];
  for (const [input, expected, description] of cases) {
    await t.test(description, () => {
      assert.equal(replaceDiscouragedSequences(input), expected);
    });
  }

  await t.test("prefers the longest sequence", () => {
    // KHA + VIRAMA + ZWJ + AA and KHA + VIRAMA + AA are both listed
    assert.equal(replaceDiscouragedSequences("ख्‍ा"), "ख");
    assert.equal(replaceDiscouragedSequences("ख्ा"), "ख");
  });

  await t.test("types", () => {
    const text = "ŉ अा";
    assert.equal(
      replaceDiscouragedSequences(text, { types: ["Deprecated"] }),
      "’n अा",
    );
    assert.equal(
      replaceDiscouragedSequences(text, { types: ["Indic_Vowel_Letter"] }),
      "ŉ आ",
    );
    assert.equal(replaceDiscouragedSequences(text, { types: [] }), text);
    assert.throws(
      () => replaceDiscouragedSequences(text, { types: ["deprecated"] }),
      RangeError,
    );
    assert.throws(
      () => replaceDiscouragedSequences(text, { types: "Deprecated" }),
      TypeError,
    );
  });

  await t.test("rejects invalid arguments", () => {
    assert.throws(() => replaceDiscouragedSequences(1), TypeError);
  });
});

test("findDiscouragedSequences", () => {
  assert.deepEqual(findDiscouragedSequences("aŉbअा"), [
    {
      index: 1,
      sequence: "ŉ",
      replacement: "’n",
      type: "Deprecated",
    },
    {
      index: 3,
      sequence: "अा",
      replacement: "आ",
      type: "Indic_Vowel_Letter",
    },
  ]);
  assert.deepEqual(findDiscouragedSequences("hello"), []);
  assert.deepEqual(findDiscouragedSequences("中文"), []);
  assert.deepEqual(
    findDiscouragedSequences("ŉ", { types: ["Discouraged"] }),
    [],
  );
});

test("getDiscouragedSequences", () => {
  const sequences = getDiscouragedSequences();
  assert.ok(sequences.length > 300);
  const types = getDiscouragedTypes();
  for (const { sequence, replacement, type } of sequences) {
    assert.ok(sequence.length > 0);
    assert.ok(replacement.length > 0);
    assert.notEqual(sequence, replacement);
    assert.ok(types.includes(type), type);
    assert.equal(findDiscouragedSequences(sequence)[0].index, 0);
  }
  assert.ok(
    sequences.some(
      (entry) =>
        entry.sequence === "ന്‍" &&
        entry.replacement === "ൻ" &&
        entry.type === "Malayalam_Chillu",
    ),
  );
});

test("getDiscouragedTypes", () => {
  const types = getDiscouragedTypes();
  for (const type of ["Deprecated", "Discouraged", "Precomposed_Form"]) {
    assert.ok(types.includes(type), type);
  }
  types.push("mutated");
  assert.ok(!getDiscouragedTypes().includes("mutated"), "returns copies");
});

test("default export", () => {
  assert.equal(discouragedSequences, replaceDiscouragedSequences);
  assert.equal(discouragedSequences("ŉ"), "’n");
  assert.equal(
    discouragedSequences.findDiscouragedSequences,
    findDiscouragedSequences,
  );
  assert.equal(
    discouragedSequences.getDiscouragedSequences,
    getDiscouragedSequences,
  );
  assert.equal(discouragedSequences.getDiscouragedTypes, getDiscouragedTypes);
  assert.equal(discouragedSequences.VERSION, VERSION);
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
