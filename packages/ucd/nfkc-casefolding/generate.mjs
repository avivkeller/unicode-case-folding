import {
  parseCodePoints,
  parseRange,
  records,
  version,
} from "@internal/build/sources/ucd";
import { mappingTable } from "@internal/helpers/tables";

const FILE = "DerivedNormalizationProps.txt";

export const VERSION = await version(FILE);

const mappings = new Map();
for (const [range, property, value = ""] of await records(FILE)) {
  if (property !== "NFKC_CF") continue;
  const [start, end] = parseRange(range);
  const mapping = parseCodePoints(value);
  for (let codePoint = start; codePoint <= end; codePoint++) {
    mappings.set(codePoint, mapping);
  }
}

export const FOLDING_MAP = mappingTable(mappings);
