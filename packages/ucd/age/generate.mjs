import * as ucd from "@internal/build/sources/ucd";
import { rangeTable } from "@internal/helpers/tables";

const FILE = "DerivedAge.txt";

export const VERSION = await ucd.version(FILE);

const records = await ucd.records(FILE);

export const AGE_VERSIONS = [...new Set(records.map(([, age]) => age))].sort(
  (a, b) => {
    const [aMajor, aMinor] = a.split(".").map(Number);
    const [bMajor, bMinor] = b.split(".").map(Number);
    return aMajor - bMajor || aMinor - bMinor;
  },
);

// AGE_VERSIONS is oldest first, so that indexes compare like versions
export const AGES = rangeTable(
  records.map(([range, age]) => [
    ...ucd.parseRange(range),
    AGE_VERSIONS.indexOf(age),
  ]),
  null,
);
