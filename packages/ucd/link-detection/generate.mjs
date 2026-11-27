import * as ucd from "@internal/build/sources/ucd";
import { idna, linkification } from "@internal/build/sources/unicode";
import { rangeTableOf } from "@internal/helpers/tables";
import { EMAIL, LABEL, SEPARATOR, TERMS, TOP_LEVEL } from "./flags.mjs";

const CATEGORY_FILE = "extracted/DerivedGeneralCategory.txt";

// The linkification files have no version line
export const VERSION = await ucd.version(CATEGORY_FILE);

const flags = (await linkification.values("LinkTerm.txt")).map((term) => {
  const index = TERMS.indexOf(term);
  if (index === -1) throw new Error(`Unknown Link_Term: ${term}`);
  return index;
});

const add = (range, flag) => {
  const [start, end] = ucd.parseRange(range);
  for (let codePoint = start; codePoint <= end; codePoint++) {
    flags[codePoint] |= flag;
  }
};

for (const [range] of await linkification.records("LinkEmail.txt")) {
  add(range, EMAIL);
}

// Domain labels: what IDNA2008 allows, and the letters, marks and digits that
// UTS #46 maps to it, such as capitals
const categories = await ucd.values(CATEGORY_FILE);
for (let codePoint = 0; codePoint < ucd.CODE_POINTS; codePoint++) {
  const [major] = categories[codePoint];
  if (major === "L" || major === "M") flags[codePoint] |= LABEL | TOP_LEVEL;
  else if (major === "N") flags[codePoint] |= LABEL;
}
for (const [range, value] of await idna.records("Idna2008.txt")) {
  if (value === "PVALID" || value.startsWith("CONTEXT")) add(range, LABEL);
}
// The characters UTS #46 maps to "."
for (const dot of ["002E", "3002", "FF0E", "FF61"]) add(dot, SEPARATOR);

export const FLAGS = rangeTableOf(flags);

// [close, open, close, open, …]
export const BRACKETS = (
  await linkification.records("LinkBracket.txt")
).flatMap(([close, open]) => [parseInt(close, 16), parseInt(open, 16)]);
