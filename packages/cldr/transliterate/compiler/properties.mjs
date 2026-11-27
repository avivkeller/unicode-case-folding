import * as ucd from "@internal/build/sources/ucd";
import { CodePointSet } from "./code-point-set.mjs";

const BINARY_PROPERTY_FILES = ["PropList.txt", "DerivedCoreProperties.txt"];
const YES = new Set(["y", "yes", "t", "true"]);
const NO = new Set(["n", "no", "f", "false"]);

function looseName(name) {
  return name.replace(/[\s_-]/g, "").toLowerCase();
}

const valueAliases = await loadValueAliases();
const propertyNames = await loadPropertyNames();
const generalCategories = await loadPartition(
  "extracted/DerivedGeneralCategory.txt",
  "Cn",
);
const scripts = await loadPartition("Scripts.txt", "Zzzz", "sc");
const combiningClasses = await loadPartition(
  "extracted/DerivedCombiningClass.txt",
  "0",
);
const blocks = await loadBlocks();
const binaryProperties = await loadBinaryProperties();
const generalCategoryGroups = await loadGeneralCategoryGroups();

/** `name` is the property name, or the value when there is no "=". */
export function resolveProperty(name, value) {
  if (value === undefined) return resolveValue(name);

  const property = propertyNames.get(looseName(name));
  switch (property) {
    case "General_Category":
      return generalCategory(value) ?? fail(name, value);
    case "Script":
      return scriptSet(value) ?? fail(name, value);
    case "Block":
      return blocks.get(looseName(value)) ?? fail(name, value);
    case "Canonical_Combining_Class":
      return combiningClass(value) ?? fail(name, value);
  }
  const binary = binaryProperties.get(property);
  if (binary !== undefined) {
    if (YES.has(looseName(value))) return binary;
    if (NO.has(looseName(value))) return binary.complement();
  }
  return fail(name, value);
}

export function scriptRanges() {
  return scripts;
}

export function scriptNames() {
  const names = new Map();
  for (const [code, aliases] of valueAliases.get("sc")) {
    names.set(code, aliases[1]);
  }
  return names;
}

function resolveValue(name) {
  const loose = looseName(name);
  const set =
    generalCategory(name) ??
    scriptSet(name) ??
    binaryProperties.get(propertyNames.get(loose));
  if (set !== undefined) return set;
  if (loose === "any") return CodePointSet.all();
  if (loose === "ascii") return CodePointSet.range(0, 0x7f);
  if (loose === "assigned") return generalCategory("Cn").complement();
  return fail(name);
}

function generalCategory(value) {
  const code = findValue("gc", value);
  if (code === undefined) return undefined;
  const members = generalCategoryGroups.get(code) ?? [code];
  return members
    .map((member) => generalCategories.get(member) ?? new CodePointSet())
    .reduce((a, b) => a.union(b));
}

function scriptSet(value) {
  const code = findValue("sc", value);
  if (code === undefined) return undefined;
  return scripts.get(code) ?? new CodePointSet();
}

function combiningClass(value) {
  // Numeric values are classes even if unused, as in ICU
  if (/^\d+$/.test(value) && Number(value) <= 255) {
    return combiningClasses.get(String(Number(value))) ?? new CodePointSet();
  }
  const number = findValue("ccc", value);
  if (number === undefined) return undefined;
  return combiningClasses.get(number) ?? new CodePointSet();
}

function findValue(property, value) {
  const loose = looseName(value);
  for (const [canonical, aliases] of valueAliases.get(property)) {
    if (aliases.some((alias) => looseName(alias) === loose)) return canonical;
  }
  return undefined;
}

function fail(name, value) {
  const pattern = value === undefined ? name : `${name}=${value}`;
  throw new Error(`Unsupported UnicodeSet property: [:${pattern}:]`);
}

async function loadValueAliases() {
  const aliases = new Map();
  for (const [property, ...values] of await ucd.records(
    "PropertyValueAliases.txt",
  )) {
    if (!aliases.has(property)) aliases.set(property, new Map());
    aliases.get(property).set(values[0], values);
  }
  return aliases;
}

/** Groups such as L (Letter) list their members in a comment of the file. */
async function loadGeneralCategoryGroups() {
  const groups = new Map();
  const text = await ucd.text("PropertyValueAliases.txt");
  for (const match of text.matchAll(/^gc ; (\w+)\s*;[^#\n]*# ([\w |]+)$/gm)) {
    groups.set(
      match[1],
      match[2].split("|").map((member) => member.trim()),
    );
  }
  return groups;
}

async function loadPropertyNames() {
  const names = new Map();
  for (const aliases of await ucd.records("PropertyAliases.txt")) {
    for (const alias of aliases) names.set(looseName(alias), aliases[1]);
  }
  return names;
}

async function loadPartition(file, missing, property) {
  const shortNames = new Map();
  if (property !== undefined) {
    for (const [code, aliases] of valueAliases.get(property)) {
      for (const alias of aliases) shortNames.set(alias, code);
    }
  }
  const ranges = new Map();
  let listed = new CodePointSet();
  for (const [range, value] of await ucd.records(file)) {
    const key = shortNames.get(value) ?? value;
    if (!ranges.has(key)) ranges.set(key, []);
    ranges.get(key).push(ucd.parseRange(range));
  }
  const sets = new Map();
  for (const [key, list] of ranges) {
    const set = CodePointSet.fromRanges(list);
    sets.set(key, set);
    listed = listed.union(set);
  }
  const unlisted = listed.complement();
  sets.set(missing, (sets.get(missing) ?? new CodePointSet()).union(unlisted));
  return sets;
}

async function loadBlocks() {
  const blocks = new Map();
  const aliases = valueAliases.get("blk");
  for (const [range, name] of await ucd.records("Blocks.txt")) {
    const set = CodePointSet.fromRanges([ucd.parseRange(range)]);
    blocks.set(looseName(name), set);
    for (const values of aliases.values()) {
      if (values.some((alias) => looseName(alias) === looseName(name))) {
        for (const alias of values) blocks.set(looseName(alias), set);
      }
    }
  }
  return blocks;
}

async function loadBinaryProperties() {
  const ranges = new Map();
  for (const file of BINARY_PROPERTY_FILES) {
    for (const fields of await ucd.records(file)) {
      // DerivedCoreProperties.txt also has an enumerated property, InCB
      if (fields.length !== 2) continue;
      const [range, name] = fields;
      if (!ranges.has(name)) ranges.set(name, []);
      ranges.get(name).push(ucd.parseRange(range));
    }
  }
  const sets = new Map();
  for (const [name, list] of ranges) {
    sets.set(name, CodePointSet.fromRanges(list));
  }
  return sets;
}
