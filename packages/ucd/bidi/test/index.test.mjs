import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  getBidiClass,
  getEmbeddingLevels,
  getMirroredCharacter,
  reorderLine,
  toVisualString,
  VERSION,
} from "../dist/index.mjs";
import {
  CLASS_CHARACTERS,
  checkBidiCharacterTest,
  checkBidiTest,
} from "./conformance.mjs";

const SHALOM = "שלום";
const SHALOM_POINTED = "ש\u05b8\u05c1לו\u05b9ם";
const FAMILY = "\u{1f468}\u200d\u{1f469}\u200d\u{1f467}";

const levelsOf = (text, options) => [
  ...getEmbeddingLevels(text, options).levels,
];

test("conformance tests of the UCD (subsets)", async (t) => {
  const files = [
    ["BidiTest.txt", checkBidiTest],
    ["BidiCharacterTest.txt", checkBidiCharacterTest],
  ];
  for (const [file, check] of files) {
    await t.test(file, () => {
      const contents = fs.readFileSync(
        new URL(`fixtures/${file}`, import.meta.url),
        "utf8",
      );
      const { passed, failures } = check(contents);
      assert.deepEqual(failures, []);
      assert.ok(passed >= 400, `only ${passed} test cases`);
    });
  }
});

test("getBidiClass", async (t) => {
  await t.test("classes of characters", () => {
    for (const [name, codePoint] of Object.entries(CLASS_CHARACTERS)) {
      assert.equal(getBidiClass(codePoint), name);
    }
    assert.equal(getBidiClass(0x41), "L");
    assert.equal(getBidiClass(0x1f600), "ON");
    assert.equal(getBidiClass(0x200d), "BN");
  });

  await t.test("defaults of unassigned code points", () => {
    assert.equal(getBidiClass(0x05ff), "R", "Hebrew block");
    assert.equal(getBidiClass(0x20cf), "ET", "Currency Symbols block");
    assert.equal(getBidiClass(0x1ef00), "R");
    assert.equal(getBidiClass(0xfdd0), "BN", "noncharacter");
    assert.equal(getBidiClass(0xe000), "L", "private use");
  });

  await t.test("rejects invalid code points", () => {
    assert.throws(() => getBidiClass("a"), TypeError);
    assert.throws(() => getBidiClass(0x110000), RangeError);
  });
});

test("getEmbeddingLevels", async (t) => {
  await t.test("left-to-right text", () => {
    assert.deepEqual(getEmbeddingLevels("abc"), {
      paragraphs: [{ start: 0, end: 3, level: 0 }],
      levels: new Uint8Array([0, 0, 0]),
    });
  });

  await t.test("right-to-left text with numbers", () => {
    const { paragraphs, levels } = getEmbeddingLevels(`${SHALOM} 123`);
    assert.deepEqual(paragraphs, [{ start: 0, end: 8, level: 1 }]);
    assert.deepEqual([...levels], [1, 1, 1, 1, 1, 2, 2, 2]);
  });

  await t.test("paragraph directions", () => {
    assert.deepEqual(levelsOf(SHALOM, { direction: "ltr" }), [1, 1, 1, 1]);
    assert.deepEqual(levelsOf("abc", { direction: "rtl" }), [2, 2, 2]);
    assert.deepEqual(levelsOf("123", { direction: "auto" }), [0, 0, 0]);
    const isolated = `\u2067${SHALOM}\u2069abc`;
    assert.equal(getEmbeddingLevels(isolated).paragraphs[0].level, 0);
  });

  await t.test("paragraphs", () => {
    const { paragraphs } = getEmbeddingLevels(`abc\n${SHALOM}\r\n123`);
    assert.deepEqual(paragraphs, [
      { start: 0, end: 4, level: 0 },
      { start: 4, end: 10, level: 1 },
      { start: 10, end: 13, level: 0 },
    ]);
  });

  await t.test("surrogate pairs", () => {
    assert.deepEqual(levelsOf(`א\u{1f600}ב`), [1, 1, 1, 1]);
    assert.deepEqual(levelsOf("\u{10900}a"), [1, 1, 2]);
  });

  await t.test("whitespace at the end of lines and before tabs (L1)", () => {
    assert.deepEqual(levelsOf("א ", { direction: "ltr" }), [1, 0]);
    assert.deepEqual(levelsOf("ab\tc", { direction: "rtl" }), [2, 2, 1, 2]);
  });

  await t.test("characters removed by X9", () => {
    assert.deepEqual(levelsOf("א\u200dב"), [1, 1, 1]);
    assert.deepEqual(levelsOf("a\u202bb\u202cc"), [0, 0, 2, 2, 0]);
  });

  await t.test("empty text", () => {
    assert.deepEqual(getEmbeddingLevels(""), {
      paragraphs: [],
      levels: new Uint8Array(0),
    });
  });

  await t.test("rejects invalid arguments", () => {
    assert.throws(() => getEmbeddingLevels(1), TypeError);
    assert.throws(
      () => getEmbeddingLevels("a", { direction: "up" }),
      RangeError,
    );
  });
});

test("reorderLine", async (t) => {
  const reorder = (text, options, start, end) =>
    reorderLine(text, getEmbeddingLevels(text, options), start, end);

  await t.test("reverses right-to-left text", () => {
    assert.deepEqual(reorder("ab אבג").order, [0, 1, 2, 5, 4, 3]);
    assert.deepEqual(reorder(`${SHALOM} 123`).order, [5, 6, 7, 4, 3, 2, 1, 0]);
  });

  await t.test("reorders lines", () => {
    const text = "א ב";
    assert.deepEqual(reorder(text, { direction: "ltr" }, 0, 2).order, [0, 1]);
    assert.deepEqual(reorder(text, { direction: "ltr" }, 2).order, [2]);
    assert.deepEqual(reorder(text, { direction: "ltr" }).order, [2, 1, 0]);
  });

  await t.test("reorders each paragraph on its own", () => {
    assert.deepEqual(reorder("אב\ncd").order, [2, 1, 0, 3, 4]);
  });

  await t.test("keeps surrogate pairs in order", () => {
    assert.deepEqual(reorder(`א\u{1f600}ב`).order, [3, 1, 2, 0]);
  });

  await t.test("finds mirrored characters (L4)", () => {
    assert.deepEqual(reorder("a א(ב)"), {
      order: [0, 1, 5, 4, 3, 2],
      mirrored: [3, 5],
    });
    assert.deepEqual(reorder("a (b)").mirrored, []);
    // U+2231 CLOCKWISE INTEGRAL has no mirror image character
    assert.deepEqual(reorder("א∱").mirrored, [1]);
  });

  await t.test("rejects invalid arguments", () => {
    const embeddingLevels = getEmbeddingLevels("abc");
    assert.throws(() => reorderLine("abcd", embeddingLevels), TypeError);
    assert.throws(() => reorderLine("abc", {}), TypeError);
    assert.throws(() => reorderLine("abc", embeddingLevels, 2, 1), RangeError);
    assert.throws(() => reorderLine("abc", embeddingLevels, 0, 4), RangeError);
    assert.throws(() => reorderLine("abc", embeddingLevels, 0.5), RangeError);
  });
});

test("toVisualString", async (t) => {
  const cases = [
    ["abc", "abc", "left-to-right text"],
    [`${SHALOM} world`, "world םולש", "a right-to-left paragraph"],
    ["hello שלום!", "hello םולש!", "a left-to-right paragraph"],
    ["العدد 123", "123 ددعلا", "numbers"],
    [`(${SHALOM})`, "(םולש)", "mirrored brackets"],
    [SHALOM_POINTED, "םו\u05b9לש\u05b8\u05c1", "combining marks (L3)"],
    [`א ${FAMILY} ב`, `ב ${FAMILY} א`, "emoji sequences"],
    ["\u202eabc\u202c d\u200f", "cba d", "directional formatting"],
    [`abc\r\nאבג\n`, "abc\r\nגבא\n", "paragraphs"],
    ["אב cd\u2028גד ef", "cd בא\u2028ef דג", "line separators"],
    ["", "", "empty text"],
  ];
  for (const [input, expected, description] of cases) {
    await t.test(description, () =>
      assert.equal(toVisualString(input), expected),
    );
  }

  await t.test("paragraph direction", () => {
    assert.equal(
      toVisualString(`${SHALOM} world`, { direction: "ltr" }),
      "םולש world",
    );
    assert.equal(toVisualString("a b", { direction: "rtl" }), "a b");
  });
});

test("getMirroredCharacter", () => {
  assert.equal(getMirroredCharacter(0x28), 0x29);
  assert.equal(getMirroredCharacter(0x29), 0x28);
  assert.equal(getMirroredCharacter(0x2264), 0x2265);
  assert.equal(getMirroredCharacter(0x221d), 0x1db10);
  assert.equal(getMirroredCharacter(0x1db10), 0x221d);
  assert.equal(getMirroredCharacter(0x41), undefined);
  assert.equal(getMirroredCharacter(0x2231), undefined);
  assert.throws(() => getMirroredCharacter("("), TypeError);
  assert.throws(() => getMirroredCharacter(-1), RangeError);
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
