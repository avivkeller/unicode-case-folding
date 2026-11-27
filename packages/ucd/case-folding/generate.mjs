import { parseCodePoints, records, version } from "@internal/build/sources/ucd";
import { mappingTable } from "@internal/helpers/tables";

export const VERSION = await version("CaseFolding.txt");

const folding = new Map();
for (const [code, status, mapping] of await records("CaseFolding.txt")) {
  if (status === "C" || status === "F") {
    folding.set(parseInt(code, 16), parseCodePoints(mapping));
  }
}

export const FOLDING_MAP = mappingTable(folding);
