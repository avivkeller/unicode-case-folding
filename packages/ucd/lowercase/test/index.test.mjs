import assert from "node:assert/strict";
import test from "node:test";
import { assertMatchesNative } from "@internal/build/testing";
import {
  isLowercase,
  lookupLowercase,
  toLowercase,
  VERSION,
} from "../dist/index.mjs";

test("toLowercase", async (t) => {
  const cases = [
    ["HELLO World", "hello world", "ASCII"],
    ["", "", "empty string"],
    ["ÀÉÎÕÜ", "àéîõü", "Latin-1"],
    ["ПРИВЕТ", "привет", "Cyrillic"],
    ["\u{10400}", "\u{10428}", "astral (Deseret)"],
    ["İ", "i\u0307", "full mapping of U+0130"],
    ["😀A", "😀a", "emoji"],
  ];
  for (const [input, expected, description] of cases) {
    await t.test(description, () => assert.equal(toLowercase(input), expected));
  }

  await t.test("final sigma", () => {
    assert.equal(toLowercase("ΟΔΥΣΣΕΥΣ"), "οδυσσευς");
    assert.equal(toLowercase("ΣΑΣ."), "σας.");
    assert.equal(toLowercase("Σ"), "σ", "not preceded by a cased letter");
    assert.equal(toLowercase("ΑΣΑ"), "ασα", "followed by a cased letter");
    assert.equal(toLowercase("ΑΣ'"), "ας'", "case-ignorable after");
    assert.equal(toLowercase("Α'Σ"), "α'ς", "case-ignorable before");
  });

  await t.test("Turkish and Azeri", () => {
    for (const locale of ["tr", "az", "tr-TR", new Intl.Locale("az-Latn")]) {
      assert.equal(toLowercase("Iİ", { locale }), "ıi");
      assert.equal(toLowercase("I\u0307", { locale }), "i", "I + dot above");
    }
    assert.equal(toLowercase("Iİ", { locale: "en" }), "ii\u0307");
  });

  await t.test("Lithuanian keeps the dot above i with accents", () => {
    assert.equal(toLowercase("Ì", { locale: "lt" }), "i\u0307\u0300");
    assert.equal(toLowercase("I\u0301", { locale: "lt" }), "i\u0307\u0301");
    assert.equal(toLowercase("I", { locale: "lt" }), "i");
  });

  await t.test("matches String.prototype.toLowerCase", () => {
    assertMatchesNative(toLowercase, (char) => char.toLowerCase());
  });

  await t.test("rejects invalid arguments", () => {
    assert.throws(() => toLowercase(1), TypeError);
    assert.throws(() => toLowercase("a", { locale: 1 }), TypeError);
  });
});

test("isLowercase", () => {
  assert.equal(isLowercase("hello"), true);
  assert.equal(isLowercase("Hello"), false);
  assert.equal(isLowercase("123"), true);
  assert.equal(isLowercase("i", { locale: "tr" }), true);
});

test("lookupLowercase", () => {
  assert.deepEqual(lookupLowercase(0x41), [0x61]);
  assert.deepEqual(lookupLowercase(0x130), [0x69, 0x307]);
  assert.equal(lookupLowercase(0x61), undefined);
  assert.throws(() => lookupLowercase("A"), TypeError);
  assert.throws(() => lookupLowercase(0x110000), RangeError);
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
