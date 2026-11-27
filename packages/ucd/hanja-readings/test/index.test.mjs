import assert from "node:assert/strict";
import test from "node:test";
import { VERSION, getHanjaReadings, toHangul } from "../dist/index.mjs";

test("getHanjaReadings", () => {
  assert.deepEqual(getHanjaReadings(0x97d3), ["한"]);
  assert.deepEqual(getHanjaReadings(0x91d1), ["금", "김"]);
  assert.deepEqual(
    getHanjaReadings(0x4e0d),
    ["불", "부"],
    "the reading taught in schools comes first",
  );
  assert.deepEqual(getHanjaReadings(0x6a02), ["락", "낙", "악", "요"]);
  assert.deepEqual(getHanjaReadings(0x41), []);
  assert.throws(() => getHanjaReadings("韓"), TypeError);

  getHanjaReadings(0x91d1).push("mutated");
  assert.deepEqual(getHanjaReadings(0x91d1), ["금", "김"], "returns copies");
});

test("toHangul", async (t) => {
  const cases = [
    ["大韓民國", "대한민국", "four characters"],
    ["漢字 (한자)", "한자 (한자)", "hangul is kept"],
    ["學校, school", "학교, school", "other text is kept"],
    ["女子", "녀자", "the initial sound rule is not applied"],
    ["abc", "abc", "no hanja"],
    ["", "", "empty string"],
  ];
  for (const [input, expected, description] of cases) {
    await t.test(description, () => assert.equal(toHangul(input), expected));
  }

  await t.test("rejects invalid arguments", () => {
    assert.throws(() => toHangul(1), TypeError);
  });
});

test("every reading is a hangul syllable", () => {
  let count = 0;
  for (let cp = 0x3400; cp <= 0x33fff; cp++) {
    for (const reading of getHanjaReadings(cp)) {
      assert.match(reading, /^[가-힣]$/, `U+${cp.toString(16)}`);
      count++;
    }
  }
  assert.ok(count > 8000);
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.toHangul);
  assert.equal(main("大韓民國"), "대한민국");
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
