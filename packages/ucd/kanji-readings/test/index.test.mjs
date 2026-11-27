import assert from "node:assert/strict";
import test from "node:test";
import { VERSION, getKanjiReadings } from "../dist/index.mjs";

test("getKanjiReadings", () => {
  assert.deepEqual(getKanjiReadings(0x5c71), {
    on: ["サン", "セン"],
    kun: ["やま"],
  });
  assert.deepEqual(getKanjiReadings(0x672c), { on: ["ホン"], kun: ["もと"] });
  assert.deepEqual(getKanjiReadings(0x3404), { on: ["カ", "ケ"], kun: [] });
  assert.equal(getKanjiReadings(0x41), undefined);
  assert.equal(getKanjiReadings(0x3042), undefined, "hiragana");
  assert.throws(() => getKanjiReadings("山"), TypeError);
  assert.throws(() => getKanjiReadings(0x110000), RangeError);
});

test("on readings are katakana and kun readings are hiragana", () => {
  let count = 0;
  for (let cp = 0x3400; cp <= 0x33fff; cp++) {
    const readings = getKanjiReadings(cp);
    if (readings === undefined) continue;
    assert.ok(readings.on.length + readings.kun.length > 0);
    for (const reading of readings.on) {
      assert.match(reading, /^[ァ-ー]+$/, `U+${cp.toString(16)}`);
    }
    for (const reading of readings.kun) {
      assert.match(reading, /^[ぁ-゚ー]+$/, `U+${cp.toString(16)}`);
    }
    count++;
  }
  assert.ok(count > 50000);
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.getKanjiReadings);
  assert.deepEqual(main(0x672c), { on: ["ホン"], kun: ["もと"] });
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
