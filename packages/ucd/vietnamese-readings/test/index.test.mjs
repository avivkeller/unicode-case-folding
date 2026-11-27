import assert from "node:assert/strict";
import test from "node:test";
import {
  VERSION,
  getVietnameseReadings,
  toVietnamese,
} from "../dist/index.mjs";

test("getVietnameseReadings", () => {
  assert.deepEqual(getVietnameseReadings(0x8d8a), ["việt"]);
  assert.deepEqual(getVietnameseReadings(0x570b), ["quốc"]);
  assert.deepEqual(getVietnameseReadings(0x62d1), ["kiềm", "cùm"]);
  assert.deepEqual(getVietnameseReadings(0x5f50), ["kẹ", "kệ", "kí", "mự"]);
  assert.deepEqual(getVietnameseReadings(0x41), []);
  assert.throws(() => getVietnameseReadings("越"), TypeError);
});

test("toVietnamese", async (t) => {
  const cases = [
    ["越南", "việt nam", "two characters"],
    ["越南，國語", "việt nam，quốc ngữ", "punctuation attaches directly"],
    ["大學abc", "đại học abc", "letters get a separator"],
    ["abc", "abc", "no Chinese"],
    ["", "", "empty string"],
  ];
  for (const [input, expected, description] of cases) {
    await t.test(description, () => {
      assert.equal(toVietnamese(input), expected);
    });
  }

  await t.test("options", () => {
    assert.equal(toVietnamese("大學", { separator: "-" }), "đại-học");
    assert.equal(toVietnamese("拑", { separator: "-" }), "kiềm");
  });

  await t.test("rejects invalid arguments", () => {
    assert.throws(() => toVietnamese(1), TypeError);
    assert.throws(() => toVietnamese("越", { separator: 1 }), TypeError);
  });
});

test("every reading is a normalized word", () => {
  let count = 0;
  for (let cp = 0x3400; cp <= 0x33fff; cp++) {
    for (const reading of getVietnameseReadings(cp)) {
      assert.match(reading, /^\p{L}+$/u, `U+${cp.toString(16)}`);
      assert.equal(reading, reading.normalize("NFC"));
      count++;
    }
  }
  assert.ok(count > 8000);
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.toVietnamese);
  assert.equal(main("越南"), "việt nam");
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
