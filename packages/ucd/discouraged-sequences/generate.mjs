import * as ucd from "@internal/build/sources/ucd";

const FILE = "DoNotEmit.txt";

export const VERSION = await ucd.version(FILE);

const records = await ucd.records(FILE);
const toString = (field) => String.fromCodePoint(...ucd.parseCodePoints(field));

export const TYPES = [...new Set(records.map(([, , type]) => type))].sort();

// [sequence, replacement, index in TYPES]
export const SEQUENCES = records.map(([sequence, replacement, type]) => [
  toString(sequence),
  toString(replacement),
  TYPES.indexOf(type),
]);

if (new Set(SEQUENCES.map(([sequence]) => sequence)).size !== SEQUENCES.length)
  throw new Error(`${FILE} lists a sequence twice`);
