import * as ucd from "@internal/build/sources/ucd";
import { rangeTableOf } from "@internal/helpers/tables";

const FILE = "extracted/DerivedGeneralCategory.txt";

export const VERSION = await ucd.version(FILE);

const values = await ucd.values(FILE);

export const CATEGORY_CODES = [...new Set(values)].sort();

export const CATEGORIES = rangeTableOf(
  values.map((value) => CATEGORY_CODES.indexOf(value)),
);

// Also the groups: "L" → "Letter"
export const CATEGORY_NAMES = Object.fromEntries(
  (await ucd.records("PropertyValueAliases.txt"))
    .filter(([property]) => property === "gc")
    .map(([, short, long]) => [short, long]),
);
