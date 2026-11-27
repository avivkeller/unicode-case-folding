import assert from "node:assert/strict";
import test from "node:test";
import { assertMatchesNative } from "@internal/build/testing";
import {
  isUppercase,
  lookupUppercase,
  toUppercase,
  VERSION,
} from "../dist/index.mjs";

test("toUppercase", async (t) => {
  const cases = [
    ["hello World", "HELLO WORLD", "ASCII"],
    ["", "", "empty string"],
    ["straße", "STRASSE", "sharp s expands"],
    ["ﬁ", "FI", "ligature expands"],
    ["ǆ", "Ǆ", "digraph"],
    ["\u0390", "\u0399\u0308\u0301", "Greek with dialytika and tonos"],
    ["привет", "ПРИВЕТ", "Cyrillic"],
    ["\u{10428}", "\u{10400}", "astral (Deseret)"],
  ];
  for (const [input, expected, description] of cases) {
    await t.test(description, () => assert.equal(toUppercase(input), expected));
  }

  await t.test("Turkish and Azeri", () => {
    assert.equal(toUppercase("iı", { locale: "tr" }), "İI");
    assert.equal(toUppercase("iı", { locale: "az-AZ" }), "İI");
    assert.equal(toUppercase("iı", { locale: "en" }), "II");
  });

  await t.test("Lithuanian removes a dot above after i", () => {
    assert.equal(toUppercase("i\u0307", { locale: "lt" }), "I");
    assert.equal(toUppercase("j\u0323\u0307", { locale: "lt" }), "J\u0323");
    assert.equal(toUppercase("i\u0307"), "I\u0307");
  });

  await t.test("matches String.prototype.toUpperCase", () => {
    assertMatchesNative(toUppercase, (char) => char.toUpperCase());
  });

  await t.test("rejects invalid arguments", () => {
    assert.throws(() => toUppercase(null), TypeError);
  });
});

test("isUppercase", () => {
  assert.equal(isUppercase("HELLO"), true);
  assert.equal(isUppercase("Hello"), false);
  assert.equal(isUppercase("ß"), false);
});

test("lookupUppercase", () => {
  assert.deepEqual(lookupUppercase(0x61), [0x41]);
  assert.deepEqual(lookupUppercase(0xdf), [0x53, 0x53]);
  assert.equal(lookupUppercase(0x41), undefined);
  assert.throws(() => lookupUppercase(-1), RangeError);
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
