import assert from "node:assert/strict";
import test from "node:test";
import { VERSION, getCangjie, toCangjieRadicals } from "../dist/index.mjs";

test("getCangjie", () => {
  assert.equal(getCangjie(0x660e), "AB");
  assert.equal(getCangjie(0x4eba), "O");
  assert.equal(getCangjie(0x6728), "D");
  assert.equal(getCangjie(0x9f8d), "YBYSP");
  assert.equal(getCangjie(0x41), undefined);
  assert.throws(() => getCangjie("明"), TypeError);
  assert.throws(() => getCangjie(-1), RangeError);
});

test("toCangjieRadicals", () => {
  assert.equal(toCangjieRadicals("OD"), "人木");
  assert.equal(toCangjieRadicals(getCangjie(0x9f8d)), "卜月卜尸心");
  assert.equal(toCangjieRadicals("od"), "人木");
  assert.equal(
    toCangjieRadicals("ABCDEFGHIJKLMNOPQRSTUVWXYZ"),
    "日月金木水火土竹戈十大中一弓人心手口尸廿山女田難卜重",
  );
  assert.equal(toCangjieRadicals(""), "");
  assert.throws(() => toCangjieRadicals("A1"), RangeError);
  assert.throws(() => toCangjieRadicals(1), TypeError);
});

test("every code has one to five letters", () => {
  let count = 0;
  for (let cp = 0x3400; cp <= 0x33fff; cp++) {
    const code = getCangjie(cp);
    if (code === undefined) continue;
    assert.match(code, /^[A-Z]{1,5}$/, `U+${cp.toString(16)}`);
    count++;
  }
  assert.ok(count > 25000);
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.getCangjie);
  assert.equal(main(0x660e), "AB");
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
