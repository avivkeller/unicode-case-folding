import * as ucd from "@internal/build/sources/ucd";
import { rangeTable, rangeTableOf } from "@internal/helpers/tables";

const SCRIPTS_FILE = "Scripts.txt";
const EXTENSIONS_FILE = "ScriptExtensions.txt";

export const VERSION = await ucd.version(SCRIPTS_FILE, EXTENSIONS_FILE);

const shortNames = await ucd.shortNames("sc");
const scripts = (await ucd.values(SCRIPTS_FILE)).map((name) =>
  shortNames.get(name),
);

export const SCRIPT_CODES = [...new Set(scripts)].sort();
export const SCRIPTS = rangeTableOf(
  scripts.map((code) => SCRIPT_CODES.indexOf(code)),
);

export const EXTENSION_LISTS = [];
const listIndexes = new Map();
// -1 where the extensions are only the script itself
export const EXTENSIONS = rangeTable(
  (await ucd.records(EXTENSIONS_FILE)).map(([range, value]) => {
    const codes = value.split(/\s+/).sort();
    const key = codes.join();
    if (!listIndexes.has(key)) {
      listIndexes.set(key, EXTENSION_LISTS.push(codes) - 1);
    }
    return [...ucd.parseRange(range), listIndexes.get(key)];
  }),
  -1,
);
