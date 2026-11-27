import assert from "node:assert/strict";
import test from "node:test";
import { serializeModule } from "../src/generated-data.mjs";

test("serializes data as literals", async () => {
  const data = {
    NUMBER: 42,
    STRING: 'a"\u{1f600}',
    NULL: null,
    NESTED: { list: [1, [2, 3]], flag: true },
    MAP: new Map([
      [65, "a"],
      [66, ""],
    ]),
    SET: new Set(["Arab", "Hebr"]),
  };
  const code = serializeModule(data);
  const module = await import(
    `data:text/javascript,${encodeURIComponent(code)}`
  );
  assert.deepEqual({ ...module }, data);
  assert.match(code, /\/\* @__PURE__ \*\/ new Map\(/);
});

test("rejects values that are not data", () => {
  for (const value of [() => {}, undefined, NaN, new Date(), 1n]) {
    assert.throws(() => serializeModule({ VALUE: value }), TypeError);
  }
});

test("packs long arrays and maps", async () => {
  const ints = Array.from({ length: 40 }, (_, i) => i * i - 5);
  const strings = ints.map(String);
  const code = serializeModule({
    INTS: ints,
    STRINGS: strings,
    MAP: new Map(ints.map((int, i) => [i * 3, strings[i]])),
  });
  assert.match(code, /unpackInts\(/);
  assert.match(code, /unpackMap\(/);
  assert.match(code, /\.split\(/);
});
