import * as ucd from "@internal/build/sources/ucd";
import { rangeTable, rangeTableOf } from "@internal/helpers/tables";

const SHAPING_FILE = "ArabicShaping.txt";
const TYPE_FILE = "extracted/DerivedJoiningType.txt";
const GROUP_FILE = "extracted/DerivedJoiningGroup.txt";
const DATA_FILE = "UnicodeData.txt";

export const VERSION = await ucd.version(SHAPING_FILE, TYPE_FILE, GROUP_FILE);

const TYPES = ["U", "R", "L", "D", "C", "T"];
const FORMS = ["<isolated>", "<final>", "<initial>", "<medial>"];

// The file has short names, but a long one for its default
const typeNames = await ucd.shortNames("jt");
const types = (await ucd.values(TYPE_FILE)).map((name) => {
  const index = TYPES.indexOf(typeNames.get(name) ?? name);
  if (index === -1) throw new Error(`Unknown Joining_Type: ${name}`);
  return index;
});
// Indexes in "URLDCT"
export const JOINING_TYPES = rangeTableOf(types);

const groupRecords = (await ucd.records(GROUP_FILE)).filter(
  ([, group]) => group !== "No_Joining_Group",
);
export const GROUP_NAMES = [
  ...new Set(groupRecords.map(([, group]) => group)),
].sort();
const groups = new Map();
export const JOINING_GROUPS = rangeTable(
  groupRecords.map(([range, group]) => {
    const [start, end] = ucd.parseRange(range);
    for (let codePoint = start; codePoint <= end; codePoint++) {
      groups.set(codePoint, group);
    }
    return [start, end, GROUP_NAMES.indexOf(group)];
  }),
  -1,
);

const letterForms = new Map();
const ligatureForms = new Map();
const decompositions = new Map();
for (const [code, , , , , decomposition] of await ucd.records(DATA_FILE)) {
  const [tag, ...mapping] = decomposition.split(" ");
  const form = FORMS.indexOf(tag);
  if (form === -1) continue;
  const codePoint = parseInt(code, 16);
  const letters = mapping.map((hex) => parseInt(hex, 16));
  decompositions.set(codePoint, String.fromCodePoint(...letters));

  const isLamAlef =
    letters.length === 2 &&
    groups.get(letters[0]) === "Lam" &&
    groups.get(letters[1]) === "Alef";
  if (letters.length !== 1 && !isLamAlef) continue;
  const table = isLamAlef ? ligatureForms : letterForms;
  const key = letters.join();
  if (!table.has(key)) table.set(key, [...letters, 0, 0, 0, 0]);
  const forms = table.get(key);
  if (forms[letters.length + form] !== 0) {
    throw new Error(`${code}: ${tag} ${mapping.join(" ")} has two forms`);
  }
  forms[letters.length + form] = codePoint;
}
if (ligatureForms.size === 0) throw new Error("No lam-alef ligatures");

const sorted = (table) =>
  [...table.values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]).flat();

// [letter, isolated, final, initial, medial, …], 0 for a missing form
export const LETTER_FORMS = sorted(letterForms);
// [lam, alef, isolated, final, 0, 0, …]
export const LIGATURE_FORMS = sorted(ligatureForms);
export const DECOMPOSITIONS = new Map(
  [...decompositions].sort((a, b) => a[0] - b[0]),
);
