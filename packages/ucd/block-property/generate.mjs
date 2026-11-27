import * as ucd from "@internal/build/sources/ucd";

const FILE = "Blocks.txt";

export const VERSION = await ucd.version(FILE);

const blocks = (await ucd.records(FILE))
  .map(([range, name]) => [...ucd.parseRange(range), name])
  .sort((a, b) => a[0] - b[0]);

export const BLOCK_STARTS = blocks.map(([start]) => start);
export const BLOCK_ENDS = blocks.map(([, end]) => end);
export const BLOCK_NAMES = blocks.map(([, , name]) => name);
