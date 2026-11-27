import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { assertMatchesNative } from "@internal/build/testing";
import {
  getCombiningClass,
  isNormalized,
  lookupDecomposition,
  normalize,
  VERSION,
} from "../dist/index.mjs";
import {
  expectedForms,
  findFailures,
  FORMS,
  parseNormalizationTest,
} from "./normalization-test.mjs";

const cases = parseNormalizationTest(
  fs.readFileSync(new URL("NormalizationTest.txt", import.meta.url), "utf8"),
);

test("NormalizationTest.txt", async (t) => {
  assert.ok(cases.length > 20000);

  await t.test("normalize", () => {
    assert.deepEqual(findFailures(cases, normalize), []);
  });

  await t.test("isNormalized", () => {
    const failures = [];
    for (const testCase of cases) {
      for (const [form, input, expected] of expectedForms(testCase)) {
        if (isNormalized(input, form) !== (input === expected)) {
          failures.push(`${form}: ${testCase.line}`);
        }
      }
    }
    assert.deepEqual(failures, []);
  });

  await t.test("cases inside longer strings", () => {
    const failures = [];
    for (const testCase of cases) {
      for (const [form, input, expected] of expectedForms(testCase)) {
        const actual = normalize(`a ${input} é\u{1F600}${input}!`, form);
        const accent = normalize("é", form);
        if (actual !== `a ${expected} ${accent}\u{1F600}${expected}!`) {
          failures.push(`${form}: ${testCase.line}`);
        }
      }
    }
    assert.deepEqual(failures, []);
  });
});

test("normalize", async (t) => {
  await t.test("defaults to NFC", () => {
    assert.equal(normalize("é"), "é");
    assert.equal(normalize("é", undefined), "é");
  });

  await t.test("composes and decomposes", () => {
    assert.equal(normalize("é", "NFD"), "é");
    assert.equal(normalize("ṩ", "NFD"), "ṩ");
    assert.equal(normalize("ṩ", "NFC"), "ṩ");
    assert.equal(normalize("Å", "NFC"), "Å", "singleton");
    assert.equal(normalize("Å", "NFD"), "Å");
    assert.equal(normalize("क़", "NFC"), "क़", "excluded");
  });

  await t.test("applies compatibility mappings in NFKC and NFKD only", () => {
    assert.equal(normalize("ﬁ", "NFC"), "ﬁ");
    assert.equal(normalize("ﬁ", "NFD"), "ﬁ");
    assert.equal(normalize("ﬁ", "NFKC"), "fi");
    assert.equal(normalize("ﬁ", "NFKD"), "fi");
    assert.equal(normalize("ẛ̣", "NFKC"), "ṩ");
    assert.equal(normalize("ẛ̣", "NFKD"), "ṩ");
    assert.equal(normalize("x² Ａ", "NFKC"), "x2 A");
    assert.equal(normalize("\u{1D400}", "NFKC"), "A", "astral");
  });

  await t.test("reorders combining marks", () => {
    assert.equal(normalize("ạ́", "NFD"), "ạ́");
    assert.equal(normalize("ạ́", "NFC"), "ạ́");
    assert.equal(normalize("ạ́", "NFD"), "ạ́");
    assert.equal(normalize("à֮̀̕b", "NFD"), "à֮̀̕b");
    assert.equal(
      normalize("á̀", "NFD"),
      "á̀",
      "marks of the same class keep their order",
    );
    assert.equal(normalize("̣́", "NFC"), "̣́", "no base");
  });

  await t.test("does not compose over a blocking mark", () => {
    assert.equal(normalize("ä́̊", "NFC"), "ä́̊");
    assert.equal(normalize("a̧b́", "NFC"), "a̧b́");
  });

  await t.test("Hangul", () => {
    assert.equal(normalize("한", "NFD"), "한");
    assert.equal(normalize("한", "NFC"), "한");
    assert.equal(normalize("가", "NFD"), "가");
    assert.equal(normalize("각", "NFC"), "각", "LV + T");
    assert.equal(normalize("각ᆨ", "NFC"), "각ᆨ", "LVT + T");
    assert.equal(normalize("ᄀᆨ", "NFC"), "ᄀᆨ", "L + T");
    assert.equal(normalize("가ᆧ", "NFC"), "가ᆧ");
    assert.equal(normalize("한국어", "NFKD").length, 8);
    for (let codePoint = 0xac00; codePoint <= 0xd7a3; codePoint++) {
      const syllable = String.fromCodePoint(codePoint);
      const jamo = normalize(syllable, "NFD");
      assert.equal(jamo.length, (codePoint - 0xac00) % 28 === 0 ? 2 : 3);
      assert.equal(normalize(jamo, "NFC"), syllable);
    }
  });

  await t.test("returns unchanged text as is", () => {
    for (const form of FORMS) {
      assert.equal(normalize("", form), "");
      assert.equal(normalize("Hello, world!\n", form), "Hello, world!\n");
      assert.equal(normalize("日本語 \u{1F600}", form), "日本語 \u{1F600}");
    }
    assert.equal(normalize("déjà vu 한국어"), "déjà vu 한국어");
  });

  await t.test("only rewrites the parts that change", () => {
    assert.equal(
      normalize("abc é def é gḥ̇i \u{1F600}", "NFC"),
      "abc é def é gḥ̇i \u{1F600}",
    );
    assert.equal(
      normalize("abc é def é g\u{1D15E} ﬁ", "NFKD"),
      "abc é def é g\u{1D157}\u{1D165} fi",
    );
  });

  await t.test("handles long strings", () => {
    assert.equal(normalize("한".repeat(50000), "NFD"), "한".repeat(50000));
    assert.equal(
      normalize("é\u{1D15E}".repeat(50000), "NFC"),
      "é\u{1D157}\u{1D165}".repeat(50000),
    );
    const marks = "̣́".repeat(5000);
    assert.equal(
      normalize(`a${marks}`, "NFD"),
      `a${"̣".repeat(5000)}${"́".repeat(5000)}`,
    );
  });

  await t.test("keeps lone surrogates", () => {
    for (const form of FORMS) {
      assert.equal(normalize("\uD800", form), "\uD800");
      assert.equal(normalize("a\uDC00\uD800b", form), "a\uDC00\uD800b");
    }
    assert.equal(normalize("\uD800é\uDC00"), "\uD800é\uDC00");
    assert.equal(normalize("é\uD834", "NFD"), "é\uD834");
    assert.equal(normalize("\uD834́\uDD5E", "NFD"), "\uD834́\uDD5E");
  });

  await t.test("is idempotent and consistent across forms", () => {
    for (let codePoint = 0; codePoint <= 0x10ffff; codePoint++) {
      if (codePoint >= 0xd800 && codePoint <= 0xdfff) continue;
      const char = String.fromCodePoint(codePoint);
      const nfd = normalize(char, "NFD");
      const nfkd = normalize(char, "NFKD");
      const hex = `U+${codePoint.toString(16)}`;
      assert.equal(normalize(nfd, "NFD"), nfd, hex);
      assert.equal(normalize(nfkd, "NFKD"), nfkd, hex);
      assert.equal(normalize(nfd, "NFC"), normalize(char, "NFC"), hex);
      assert.equal(normalize(nfkd, "NFKC"), normalize(char, "NFKC"), hex);
    }
  });

  for (const form of FORMS) {
    await t.test(`matches String.prototype.normalize (${form})`, () => {
      assertMatchesNative(
        (char) => normalize(char, form),
        (char) => char.normalize(form),
      );
      assertMatchesNative(
        (char) => normalize(`ạ${char}́ᅡ`, form),
        (char) => `ạ${char}́ᅡ`.normalize(form),
      );
    });
  }

  await t.test("rejects invalid arguments", () => {
    assert.throws(() => normalize(1), TypeError);
    assert.throws(() => normalize(null), TypeError);
    assert.throws(() => normalize(), TypeError);
    assert.throws(() => normalize("a", "nfc"), RangeError);
    assert.throws(() => normalize("a", "toString"), RangeError);
    assert.throws(() => normalize("a", null), RangeError);
  });
});

test("isNormalized", async (t) => {
  await t.test("checks the given form", () => {
    assert.equal(isNormalized("é"), true);
    assert.equal(isNormalized("é"), false);
    assert.equal(isNormalized("é", "NFD"), false);
    assert.equal(isNormalized("é", "NFD"), true);
    assert.equal(isNormalized("ﬁ", "NFC"), true);
    assert.equal(isNormalized("ﬁ", "NFKC"), false);
    assert.equal(isNormalized("ﬁ", "NFKD"), false);
  });

  await t.test("checks the order of combining marks", () => {
    assert.equal(isNormalized("ạ́", "NFD"), true);
    assert.equal(isNormalized("ạ́", "NFD"), false);
    assert.equal(isNormalized("q̣́", "NFC"), true);
    assert.equal(isNormalized("q̣́", "NFC"), false);
  });

  await t.test("resolves characters that may compose", () => {
    assert.equal(isNormalized("q́"), true, "nothing to compose with");
    assert.equal(isNormalized("́"), true);
    assert.equal(isNormalized("가"), false);
    assert.equal(isNormalized("ᅡ"), true);
    assert.equal(isNormalized("각"), false);
    assert.equal(isNormalized("각ᆨ"), true);
  });

  await t.test("empty strings, ASCII and lone surrogates", () => {
    for (const form of FORMS) {
      assert.equal(isNormalized("", form), true);
      assert.equal(isNormalized("Hello", form), true);
      assert.equal(isNormalized("\uD800a\uDC00", form), true);
    }
  });

  await t.test("rejects invalid arguments", () => {
    assert.throws(() => isNormalized(1), TypeError);
    assert.throws(() => isNormalized("a", "NFE"), RangeError);
  });
});

test("lookupDecomposition", async (t) => {
  await t.test("returns the full canonical decomposition", () => {
    assert.deepEqual(lookupDecomposition(0xe9), [0x65, 0x301]);
    assert.deepEqual(lookupDecomposition(0x1e69), [0x73, 0x323, 0x307]);
    assert.deepEqual(lookupDecomposition(0x212b), [0x41, 0x30a]);
    assert.deepEqual(lookupDecomposition(0x1d15e), [0x1d157, 0x1d165]);
    assert.deepEqual(lookupDecomposition(0x344), [0x308, 0x301]);
  });

  await t.test("applies compatibility mappings on request", () => {
    assert.equal(lookupDecomposition(0xfb01), undefined);
    assert.deepEqual(
      lookupDecomposition(0xfb01, { compatibility: true }),
      [0x66, 0x69],
    );
    assert.deepEqual(
      lookupDecomposition(0x1e9b, { compatibility: true }),
      [0x73, 0x307],
    );
    assert.deepEqual(lookupDecomposition(0x1e9b), [0x17f, 0x307]);
    assert.deepEqual(
      lookupDecomposition(0xe9, { compatibility: true }),
      [0x65, 0x301],
    );
    assert.deepEqual(lookupDecomposition(0xe9, {}), [0x65, 0x301]);
  });

  await t.test("computes Hangul syllables", () => {
    assert.deepEqual(lookupDecomposition(0xac00), [0x1100, 0x1161]);
    assert.deepEqual(lookupDecomposition(0xd55c), [0x1112, 0x1161, 0x11ab]);
    assert.deepEqual(
      lookupDecomposition(0xd7a3, { compatibility: true }),
      [0x1112, 0x1175, 0x11c2],
    );
    assert.equal(lookupDecomposition(0xd7a4), undefined);
  });

  await t.test("is undefined without a decomposition", () => {
    assert.equal(lookupDecomposition(0x41), undefined);
    assert.equal(lookupDecomposition(0x301), undefined);
    assert.equal(lookupDecomposition(0xd800), undefined);
    assert.equal(
      lookupDecomposition(0x10ffff, { compatibility: true }),
      undefined,
    );
  });

  await t.test("agrees with normalize", () => {
    for (let codePoint = 0; codePoint <= 0x10ffff; codePoint++) {
      if (codePoint >= 0xd800 && codePoint <= 0xdfff) continue;
      const char = String.fromCodePoint(codePoint);
      for (const compatibility of [false, true]) {
        const mapping = lookupDecomposition(codePoint, { compatibility });
        assert.equal(
          mapping ? String.fromCodePoint(...mapping) : char,
          normalize(char, compatibility ? "NFKD" : "NFD"),
          `U+${codePoint.toString(16)}`,
        );
      }
    }
  });

  await t.test("rejects invalid arguments", () => {
    assert.throws(() => lookupDecomposition("a"), TypeError);
    assert.throws(() => lookupDecomposition(-1), RangeError);
    assert.throws(() => lookupDecomposition(0x110000), RangeError);
    assert.throws(() => lookupDecomposition(1.5), RangeError);
  });
});

test("getCombiningClass", () => {
  assert.equal(getCombiningClass(0x41), 0);
  assert.equal(getCombiningClass(0x301), 230);
  assert.equal(getCombiningClass(0x323), 220);
  assert.equal(getCombiningClass(0x94d), 9, "virama");
  assert.equal(getCombiningClass(0x345), 240);
  assert.equal(getCombiningClass(0x1d165), 216, "astral");
  assert.equal(getCombiningClass(0xd800), 0);
  assert.equal(getCombiningClass(0x10ffff), 0);
  assert.throws(() => getCombiningClass("a"), TypeError);
  assert.throws(() => getCombiningClass(0x110000), RangeError);
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.normalize);
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
