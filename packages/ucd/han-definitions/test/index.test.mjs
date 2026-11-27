import assert from "node:assert/strict";
import test from "node:test";
import { VERSION, getDefinition } from "../dist/index.mjs";

test("getDefinition", () => {
  assert.equal(getDefinition(0x5c71), "mountain, hill, peak");
  assert.equal(getDefinition(0x4e00), "one; a, an; alone");
  assert.equal(
    getDefinition(0x340c),
    "a tribe of savages in South China",
    "Extension A",
  );
  assert.match(getDefinition(0x20000), /^the sound made by breathing in/);
  assert.equal(getDefinition(0x41), undefined);
  assert.equal(getDefinition(0x10ffff), undefined);
  assert.throws(() => getDefinition("山"), TypeError);
  assert.throws(() => getDefinition(-1), RangeError);
});

test("every definition is decoded to plain text", () => {
  let count = 0;
  for (let cp = 0x3400; cp <= 0x33fff; cp++) {
    const definition = getDefinition(cp);
    if (definition === undefined) continue;
    assert.doesNotMatch(
      definition,
      /[\t\n"\p{Co}\p{Cn}]|^\s|\s$/u,
      `U+${cp.toString(16)}`,
    );
    count++;
  }
  assert.ok(count > 20000);
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.getDefinition);
  assert.equal(main(0x5c71), "mountain, hill, peak");
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
