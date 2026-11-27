import assert from "node:assert/strict";
import test from "node:test";
import { VERSION, getPinyin, toPinyin } from "../dist/index.mjs";

test("getPinyin", () => {
  assert.equal(getPinyin(0x4e2d), "zhōng");
  assert.equal(getPinyin(0x6587), "wén");
  assert.equal(getPinyin(0x5973), "nǚ");
  assert.equal(getPinyin(0x4e2d, { tone: "number" }), "zhong1");
  assert.equal(getPinyin(0x5973, { tone: "number" }), "nü3");
  assert.equal(getPinyin(0x4e2d, { tone: "none" }), "zhong");
  assert.equal(getPinyin(0x41), undefined);
  assert.throws(() => getPinyin(0x4e2d, { tone: "letters" }), RangeError);
});

test("toPinyin", async (t) => {
  const cases = [
    ["中文", "zhōng wén", "two characters"],
    ["你好，世界", "nǐ hǎo，shì jiè", "punctuation attaches directly"],
    ["我爱 Node.js", "wǒ ài Node.js", "Latin text"],
    ["\u4e2d\u6587abc", "zh\u014dng w\u00e9n abc", "letters get a separator"],
    ["abc", "abc", "no Chinese"],
    ["", "", "empty string"],
  ];
  for (const [input, expected, description] of cases) {
    await t.test(description, () => assert.equal(toPinyin(input), expected));
  }

  await t.test("options", () => {
    assert.equal(toPinyin("中文", { tone: "none", separator: "" }), "zhongwen");
    assert.equal(
      toPinyin("中文", { tone: "number", separator: "-" }),
      "zhong1-wen2",
    );
  });
});

test("Taiwan readings", () => {
  assert.equal(getPinyin(0x5256), "p\u014du");
  assert.equal(getPinyin(0x5256, { locale: "zh-TW" }), "p\u01d2");
  assert.equal(getPinyin(0x5256, { locale: "zh-Hant-HK" }), "p\u01d2");
  assert.equal(getPinyin(0x4e2d, { locale: "zh-TW" }), "zh\u014dng");
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
