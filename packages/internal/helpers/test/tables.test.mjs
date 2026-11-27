import assert from "node:assert/strict";
import test from "node:test";
import {
  codePointSet,
  directLookup,
  inSet,
  lookupRange,
  mappingTable,
  packInts,
  packMap,
  rangeTable,
  toCodePoints,
  unpackInts,
  unpackMap,
} from "../src/tables.mjs";

test("mappingTable", async (t) => {
  await t.test("converts code point arrays to strings", () => {
    const table = mappingTable([
      [0xdf, [0x73, 0x73]],
      [0xad, []],
      [0x41, [0x61]],
    ]);
    assert.deepEqual(
      table,
      new Map([
        [0x41, "a"],
        [0xad, ""],
        [0xdf, "ss"],
      ]),
    );
  });

  await t.test("sorts by code point", () => {
    const table = mappingTable([
      [0x42, "b"],
      [0x41, "a"],
    ]);
    assert.deepEqual([...table.keys()], [0x41, 0x42]);
  });

  await t.test("drops identity mappings", () => {
    const table = mappingTable([
      [0x61, "a"],
      [0x62, "B"],
      [0x1f600, [0x1f600]],
    ]);
    assert.deepEqual(table, new Map([[0x62, "B"]]));
  });
});

test("codePointSet", async (t) => {
  const set = codePointSet([
    [10, 19],
    [15, 30], // Overlaps
    [31, 31], // Adjacent
    [100, 100],
    [0, 0],
  ]);

  await t.test("merges ranges", () => {
    assert.deepEqual(set, [0, 1, 10, 32, 100, 101]);
  });

  await t.test("inSet tests membership", () => {
    const members = [0, 10, 20, 31, 100];
    const others = [1, 9, 32, 99, 101, 0x10ffff];
    for (const cp of members) assert.equal(inSet(set, cp), true, `${cp}`);
    for (const cp of others) assert.equal(inSet(set, cp), false, `${cp}`);
  });
});

test("toCodePoints", () => {
  assert.deepEqual(toCodePoints("a😀"), [0x61, 0x1f600]);
});

test("rangeTable", async (t) => {
  const table = rangeTable(
    [
      [10, 19, "b"],
      [0, 4, "a"],
      [20, 29, "b"], // Merged with the previous run
    ],
    null,
  );

  await t.test("covers every code point", () => {
    assert.deepEqual(table, [
      [0, 5, 10, 30],
      ["a", null, "b", null],
    ]);
  });

  await t.test("lookupRange", () => {
    assert.equal(lookupRange(table, 0), "a");
    assert.equal(lookupRange(table, 4), "a");
    assert.equal(lookupRange(table, 5), null);
    assert.equal(lookupRange(table, 25), "b");
    assert.equal(lookupRange(table, 0x10ffff), null);
  });
});

test("packMap and unpackMap", async (t) => {
  await t.test("round-trip a table", () => {
    const table = new Map([
      [0, "a"],
      [31, ""],
      [32, "ss"],
      [0x10ffff, "\u{1f600}\n"],
    ]);
    const unpacked = unpackMap(...packMap(table));
    for (const [codePoint, mapping] of table) {
      assert.equal(unpacked.get(codePoint), mapping);
    }
    assert.equal(unpacked.get(1), undefined);
    assert.equal(unpackMap(...packMap(new Map())).get(0), undefined);
  });

  await t.test("leave other maps unpacked", () => {
    assert.equal(packMap(new Map([["a", "b"]])), undefined);
    assert.equal(packMap(new Map([[1, 2]])), undefined);
    assert.equal(packMap(new Map([[1, "a\tb"]])), undefined);
  });
});

test("directLookup matches lookupRange", () => {
  const table = rangeTable(
    [
      [0x41, 0x5a, 1],
      [0xfffe, 0x10001, 2],
      [0x10ffff, 0x10ffff, 3],
    ],
    0,
  );
  const lookup = directLookup(table);
  for (const codePoint of [0, 0x41, 0x5b, 0xfffd, 0xffff, 0x10000, 0x10002]) {
    assert.equal(lookup(codePoint), lookupRange(table, codePoint));
  }
  assert.equal(lookup(0x10ffff), 3);
});

test("packInts and unpackInts round-trip", () => {
  for (const ints of [
    [],
    [0, 31, 32, 0x10ffff],
    [5, 3, 1024, 3],
    [100000, 100002, 99999, 100001],
    [-1, 0, -70000, 2 ** 40],
  ]) {
    assert.deepEqual(unpackInts(packInts(ints)), ints);
  }
});
