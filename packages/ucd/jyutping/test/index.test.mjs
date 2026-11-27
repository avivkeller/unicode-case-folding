import assert from "node:assert/strict";
import test from "node:test";
import { VERSION, getJyutping, toJyutping } from "../dist/index.mjs";

test("getJyutping", () => {
  assert.equal(getJyutping(0x4e2d), "zung1");
  assert.equal(getJyutping(0x6587), "man4");
  assert.equal(getJyutping(0x7cb5), "jyut6");
  assert.equal(getJyutping(0x20001), "cat1", "supplementary character");
  assert.equal(getJyutping(0x4e2d, { tone: "none" }), "zung");
  assert.equal(getJyutping(0x41), undefined);
  assert.equal(getJyutping(0x10ffff), undefined);
  assert.throws(() => getJyutping(0x4e2d, { tone: "mark" }), RangeError);
  assert.throws(() => getJyutping("中"), TypeError);
});

test("toJyutping", async (t) => {
  const cases = [
    ["香港", "hoeng1 gong2", "two characters"],
    ["你好，世界", "nei5 hou2，sai3 gaai3", "punctuation attaches directly"],
    ["我愛 Node.js", "ngo5 oi3 Node.js", "Latin text"],
    ["粵語abc", "jyut6 jyu5 abc", "letters get a separator"],
    ["abc", "abc", "no Chinese"],
    ["", "", "empty string"],
  ];
  for (const [input, expected, description] of cases) {
    await t.test(description, () => assert.equal(toJyutping(input), expected));
  }

  await t.test("options", () => {
    assert.equal(
      toJyutping("香港", { tone: "none", separator: "" }),
      "hoenggong",
    );
    assert.equal(toJyutping("香港", { separator: "-" }), "hoeng1-gong2");
  });

  await t.test("rejects invalid arguments", () => {
    assert.throws(() => toJyutping(1), TypeError);
    assert.throws(() => toJyutping("中", { separator: 1 }), TypeError);
  });
});

test("every reading is a jyutping syllable", () => {
  let count = 0;
  for (let cp = 0x3400; cp <= 0x33fff; cp++) {
    const reading = getJyutping(cp);
    if (reading === undefined) continue;
    assert.match(reading, /^[a-z]{1,6}[1-6]$/, `U+${cp.toString(16)}`);
    count++;
  }
  assert.ok(count > 25000);
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.toJyutping);
  assert.equal(main("香港"), "hoeng1 gong2");
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
