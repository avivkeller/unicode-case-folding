import assert from "node:assert/strict";
import test from "node:test";
import {
  VERSION,
  getAlphabet,
  getExemplarCharacters,
  getIndexCharacters,
} from "../dist/index.mjs";

test("getAlphabet", async (t) => {
  const cases = [
    ["en", "abcdefghijklmnopqrstuvwxyz", "English"],
    ["de", "aäbcdefghijklmnoöpqrsßtuüvwxyz", "German"],
    ["da", "abcdefghijklmnopqrstuvwxyzæøå", "letters after z in Danish"],
    ["el", "αάβγδεέζηήθιίϊΐκλμνξοόπρσςτυύϋΰφχψωώ", "Greek"],
  ];
  for (const [locale, expected, description] of cases) {
    await t.test(`${locale}: ${description}`, () => {
      assert.equal(getAlphabet(locale).join(""), expected);
    });
  }

  await t.test("letters of several characters", () => {
    assert.ok(getAlphabet("cs").includes("ch"));
    const serbian = getAlphabet("sr-Latn");
    assert.equal(serbian.indexOf("dž"), serbian.indexOf("d") + 1);
  });

  await t.test("resolves locales", () => {
    assert.deepEqual(getAlphabet("de-AT"), getAlphabet("de"));
    assert.deepEqual(getAlphabet(new Intl.Locale("en-GB")), getAlphabet("en"));
    assert.ok(getAlphabet("sr").includes("ж"));
    assert.ok(getAlphabet("sr-ME").includes("ž"), "Latin in Montenegro");
    assert.ok(getAlphabet("zh").includes("东"));
    assert.ok(getAlphabet("zh-TW").includes("東"));
    assert.ok(!getAlphabet("zh-TW").includes("东"));
  });

  await t.test("large sets", () => {
    assert.equal(getAlphabet("ko").length, 11172, "every Hangul syllable");
  });

  await t.test("a language without data", () => {
    assert.deepEqual(getAlphabet("xx"), []);
  });

  await t.test("returns copies", () => {
    getAlphabet("en").push("!");
    assert.equal(getAlphabet("en").length, 26);
  });

  await t.test("rejects invalid locales", () => {
    assert.throws(() => getAlphabet("not a locale"), RangeError);
    assert.throws(() => getAlphabet(1), TypeError);
  });
});

test("getIndexCharacters", () => {
  assert.equal(getIndexCharacters("en").join(""), "ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  assert.equal(
    getIndexCharacters("es").join(""),
    "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ",
  );
  assert.equal(getIndexCharacters("ja").join(""), "あかさたなはまやらわ");
  assert.equal(
    getIndexCharacters("ko").join(""),
    "ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ",
  );
  assert.deepEqual(getIndexCharacters("und"), []);
});

test("getExemplarCharacters", () => {
  assert.deepEqual(getExemplarCharacters("de"), getAlphabet("de"));
  assert.deepEqual(
    getExemplarCharacters("de", "index"),
    getIndexCharacters("de"),
  );
  assert.ok(getExemplarCharacters("en", "auxiliary").includes("é"));
  assert.ok(getExemplarCharacters("ar", "numbers").includes("٣"));
  assert.ok(getExemplarCharacters("es", "punctuation").includes("¿"));
  assert.ok(
    getExemplarCharacters("ar", "auxiliary").includes("‌"),
    "an escaped character",
  );
  assert.ok(getExemplarCharacters("und", "numbers").includes("0"));
  assert.throws(() => getExemplarCharacters("en", "letters"), RangeError);
});

test("every set has distinct, non-empty elements", () => {
  for (const locale of ["en", "ar", "hi", "ja", "ko", "zh", "th", "lt", "am"]) {
    for (const type of [
      "main",
      "auxiliary",
      "index",
      "numbers",
      "punctuation",
    ]) {
      const set = getExemplarCharacters(locale, type);
      assert.equal(new Set(set).size, set.length, `${locale} ${type}`);
      assert.ok(!set.includes(""), `${locale} ${type}`);
    }
  }
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.getAlphabet);
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
