import assert from "node:assert/strict";
import test from "node:test";
import translit, {
  VERSION,
  cyrillicToLatin,
  getTransformIds,
  hanToLatin,
  latinToAscii,
  thaiToLatin,
  toLatin,
  transliterate,
} from "../dist/index.mjs";
import cldr from "./cldr.mjs";
import icu from "./icu.mjs";

test("CLDR transform test data", async (t) => {
  for (const [id, source, expected] of cldr) {
    await t.test(`${id}: ${source}`, () => {
      assert.equal(transliterate(source, id), expected);
    });
  }
});

test("same output as ICU", async (t) => {
  for (const [id, source, expected] of icu) {
    await t.test(`${id}: ${source}`, () => {
      const result =
        id === "Any-Latin+ASCII"
          ? toLatin(source, { ascii: true })
          : transliterate(source, id);
      assert.equal(result, expected);
    });
  }
});

test("toLatin", async (t) => {
  const cases = [
    ["Привет", "Privet"],
    ["Ελληνικά", "Ellēniká"],
    ["こんにちは", "kon'nichiha"],
    ["안녕하세요", "annyeonghaseyo"],
    ["你好", "nǐ hǎo"],
    ["Привет, 你好 мир!", "Privet, nǐ hǎo mir!"],
    ["Latin stays", "Latin stays"],
    ["", ""],
  ];
  for (const [input, expected] of cases) {
    await t.test(input, () => assert.equal(toLatin(input), expected));
  }

  await t.test("leaves scripts without a transform", () => {
    assert.equal(toLatin("ᐊᐃ ස\u0dd2ංහල བ\u0f7cད"), "ᐊᐃ ස\u0dd2ංහල བ\u0f7cད");
  });

  await t.test("ascii", () => {
    assert.equal(toLatin("Ελληνικά", { ascii: true }), "Ellenika");
    assert.equal(toLatin("你好", { ascii: true }), "ni hao");
  });

  await t.test("is transliterate(text, 'Any-Latin')", () => {
    const text = "Москва 東京 Αθήνα";
    assert.equal(transliterate(text, "Any-Latin"), toLatin(text));
  });

  await t.test("keeps lone surrogates", () => {
    assert.equal(toLatin("\ud800б"), "\ud800b");
  });

  await t.test("handles long text", () => {
    const text =
      "Съешь же ещё этих мягких французских булок. 我能吞下玻璃. ".repeat(2000);
    const start = performance.now();
    const result = toLatin(text);
    assert.ok(performance.now() - start < 2000);
    assert.ok(result.startsWith("Sʺešʹ že eŝë"));
  });

  await t.test("rejects non-strings", () => {
    assert.throws(() => toLatin(null), TypeError);
  });
});

test("transliterate", async (t) => {
  await t.test("accepts aliases, in any case", () => {
    for (const id of [
      "Cyrillic-Latin",
      "cyrillic-latin",
      "Cyrl-Latn",
      "und-Latn-t-und-cyrl",
    ]) {
      assert.equal(transliterate("Привет", id), "Privet");
    }
    assert.equal(
      transliterate("著", "Hani-Latn"),
      transliterate("著", "Han-Latin"),
    );
  });

  await t.test("rejects unknown transforms", () => {
    assert.throws(() => transliterate("a", "Latin-Klingon"), RangeError);
    assert.throws(() => transliterate("a", 1), TypeError);
    assert.throws(() => transliterate(1, "Cyrillic-Latin"), TypeError);
  });
});

test("one function per transform", () => {
  assert.equal(cyrillicToLatin("Привет"), "Privet");
  assert.equal(hanToLatin("你好"), "nǐ hǎo");
  assert.equal(latinToAscii("Ærøskøbing"), "AEroskobing");
  assert.equal(
    thaiToLatin("สว\u0e31สด\u0e35คร\u0e31บ"),
    "s\u0304wạs\u0304dī khrạb",
  );
  assert.throws(() => hanToLatin(undefined), TypeError);
});

test("getTransformIds", () => {
  const ids = getTransformIds();
  assert.ok(ids.includes("Any-Latin"));
  assert.ok(ids.includes("Latin-ASCII"));
  assert.equal(ids.length, 28);
  for (const id of ids) {
    assert.equal(typeof transliterate("abc", id), "string", id);
  }
});

test("default export", () => {
  assert.equal(translit.toLatin, toLatin);
  assert.equal(translit.VERSION, VERSION);
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
