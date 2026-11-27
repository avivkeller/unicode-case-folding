import assert from "node:assert/strict";
import test from "node:test";
import {
  VERSION,
  getSimplifiedVariants,
  getTraditionalVariants,
  toSimplified,
  toTraditional,
} from "../dist/index.mjs";

test("toSimplified", async (t) => {
  const cases = [
    ["漢語", "汉语", "two characters"],
    ["書", "书", "used in traditional Chinese only"],
    ["學習 Unicode，很好。", "学习 Unicode，很好。", "other text is kept"],
    ["井", "井", "the same in both forms"],
    ["苧", "苎", "a different word in each form"],
    ["乾", "乾", "ambiguous characters are kept"],
    ["\u{20054}", "\u{2bdd8}", "supplementary characters"],
    ["", "", "empty string"],
  ];
  for (const [input, expected, description] of cases) {
    await t.test(description, () => {
      assert.equal(toSimplified(input), expected);
    });
  }
});

test("toTraditional", async (t) => {
  const cases = [
    ["汉语", "漢語", "two characters"],
    ["学", "學", "used in simplified Chinese only"],
    ["发", "發", "the first of several variants"],
    ["苧", "薴", "a different word in each form"],
    ["后来", "后來", "ambiguous characters are kept"],
    ["abc 123", "abc 123", "no Chinese"],
  ];
  for (const [input, expected, description] of cases) {
    await t.test(description, () => {
      assert.equal(toTraditional(input), expected);
    });
  }
});

test("ambiguous characters", () => {
  assert.equal(toTraditional("后来", { ambiguous: "convert" }), "後來");
  assert.equal(toTraditional("头", { ambiguous: "convert" }), "頭");
  assert.equal(toSimplified("乾", { ambiguous: "convert" }), "干");
  assert.equal(toSimplified("后", { ambiguous: "convert" }), "后");
  assert.throws(() => toTraditional("后", { ambiguous: "guess" }), RangeError);
});

test("getSimplifiedVariants", () => {
  assert.deepEqual(getSimplifiedVariants(0x66f8), ["书"]);
  assert.deepEqual(getSimplifiedVariants(0x4e7e), ["乾", "干"]);
  assert.deepEqual(getSimplifiedVariants(0x4e95), [], "the same in both forms");
  assert.deepEqual(getSimplifiedVariants(0x41), []);
  assert.throws(() => getSimplifiedVariants("書"), TypeError);
});

test("getTraditionalVariants", () => {
  assert.deepEqual(getTraditionalVariants(0x5b66), ["學"]);
  assert.deepEqual(getTraditionalVariants(0x53d1), ["發", "髮"]);
  assert.deepEqual(getTraditionalVariants(0x540e), ["后", "後"]);
  assert.deepEqual(getTraditionalVariants(0x810f), ["臟", "髒"]);
  assert.deepEqual(getTraditionalVariants(0x41), []);
});

test("converting back gives a variant of the character", () => {
  for (const char of "漢語書學習發財頭髮國際電腦") {
    const simplified = toSimplified(char);
    assert.ok(
      getTraditionalVariants(simplified.codePointAt(0)).includes(char),
      char,
    );
  }
});

test("rejects invalid arguments", () => {
  assert.throws(() => toSimplified(1), TypeError);
  assert.throws(() => toTraditional(null), TypeError);
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.toSimplified);
  assert.equal(main("漢語"), "汉语");
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
