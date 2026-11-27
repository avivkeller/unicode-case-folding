import assert from "node:assert/strict";
import test from "node:test";
import block, { VERSION, getBlock, getBlocks } from "../dist/index.mjs";

test("getBlock", () => {
  const basicLatin = { name: "Basic Latin", start: 0, end: 0x7f };
  assert.deepEqual(getBlock(0x41), basicLatin);
  assert.deepEqual(getBlock(0x7f), basicLatin);
  assert.equal(getBlock(0x80).name, "Latin-1 Supplement");
  assert.equal(getBlock(0x416).name, "Cyrillic");
  assert.equal(getBlock(0x4e2d).name, "CJK Unified Ideographs");
  assert.equal(getBlock(0x1f600).name, "Emoticons");
  assert.equal(getBlock(0x378).name, "Greek and Coptic", "unassigned");
  assert.equal(getBlock(0x10ffff).name, "Supplementary Private Use Area-B");
  assert.equal(getBlock(0x2fe0), undefined, "no block");
  assert.equal(getBlock(0xe0080), undefined, "no block");
  assert.throws(() => getBlock("A"), TypeError);
  assert.throws(() => getBlock(0x110000), RangeError);
});

test("getBlocks", () => {
  const blocks = getBlocks();
  assert.ok(blocks.length > 300);
  assert.deepEqual(blocks[0], { name: "Basic Latin", start: 0, end: 0x7f });
  for (let i = 1; i < blocks.length; i++) {
    assert.ok(blocks[i].start > blocks[i - 1].end, blocks[i].name);
    assert.equal(blocks[i].start % 16, 0);
    assert.equal(blocks[i].end % 16, 15);
  }
  assert.equal(new Set(blocks.map(({ name }) => name)).size, blocks.length);

  blocks[0].name = "mutated";
  assert.equal(getBlocks()[0].name, "Basic Latin", "returns copies");
});

test("every block is found by its own code points", () => {
  for (const block of getBlocks()) {
    assert.deepEqual(getBlock(block.start), block);
    assert.deepEqual(getBlock(block.end), block);
  }
});

test("default export", () => {
  assert.equal(block, getBlock);
  assert.equal(block(0x416).name, "Cyrillic");
  assert.equal(block.getBlock, getBlock);
  assert.equal(block.getBlocks, getBlocks);
  assert.equal(block.VERSION, VERSION);
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
