import { bidiVersion, generateBidi } from "@internal/build/sources/bidi";
import * as ucd from "@internal/build/sources/ucd";
import { security } from "@internal/build/sources/unicode";
import {
  codePointSet,
  inSet,
  mappingTable,
  rangeTableOf,
} from "@internal/helpers/tables";

const { CODE_POINTS } = ucd;
const HANGUL_SYLLABLES = [0xac00, 0xd7a3];

export const VERSION = await security.version(
  "confusables.txt",
  "IdentifierStatus.txt",
  "IdentifierType.txt",
);

const UCD_VERSIONS = [
  await ucd.version(
    "Scripts.txt",
    "ScriptExtensions.txt",
    "PropertyValueAliases.txt",
    "DerivedCoreProperties.txt",
    "extracted/DerivedGeneralCategory.txt",
  ),
  await bidiVersion(),
];
for (const ucdVersion of UCD_VERSIONS) {
  if (ucdVersion !== VERSION) {
    throw new Error(
      `The UTS #39 data is for Unicode ${VERSION}, but the UCD is ${ucdVersion}`,
    );
  }
}

const canonicalDecompositions = new Map();
for (const fields of await ucd.records("UnicodeData.txt")) {
  if (fields[5] && !fields[5].startsWith("<")) {
    canonicalDecompositions.set(
      parseInt(fields[0], 16),
      ucd.parseCodePoints(fields[5]),
    );
  }
}

export const DEFAULT_IGNORABLES = codePointSet(
  await ucd.ranges("DerivedCoreProperties.txt", "Default_Ignorable_Code_Point"),
);

const prototypes = new Map();
for (const [source, prototype] of await security.records("confusables.txt")) {
  const [codePoint, ...rest] = ucd.parseCodePoints(source);
  if (rest.length > 0) {
    throw new Error(`confusables.txt: unsupported sequence ${source}`);
  }
  if (inSet(DEFAULT_IGNORABLES, codePoint)) continue;
  prototypes.set(codePoint, ucd.parseCodePoints(prototype));
}
// Mapping each character once is only idempotent if prototypes are final
for (const [source, prototype] of prototypes) {
  for (const codePoint of prototype) {
    if (
      prototypes.has(codePoint) ||
      inSet(DEFAULT_IGNORABLES, codePoint) ||
      canonicalDecompositions.has(codePoint) ||
      (codePoint >= HANGUL_SYLLABLES[0] && codePoint <= HANGUL_SYLLABLES[1])
    ) {
      throw new Error(
        `confusables.txt: the prototype of U+${source.toString(16)} is not final`,
      );
    }
  }
}
export const CONFUSABLES = mappingTable(prototypes);

const scriptCodes = await ucd.shortNames("sc");
const extensionLists = createInterner();
const extensionsOf = new Uint16Array(CODE_POINTS);
const scriptLists = new Map();
for (const [codePoint, name] of (await ucd.values("Scripts.txt")).entries()) {
  if (!scriptLists.has(name)) {
    scriptLists.set(name, extensionLists.indexOf([scriptCodes.get(name)]));
  }
  extensionsOf[codePoint] = scriptLists.get(name);
}
for (const [range, value] of await ucd.records("ScriptExtensions.txt")) {
  const [start, end] = ucd.parseRange(range);
  extensionsOf.fill(
    extensionLists.indexOf(value.split(/\s+/).sort()),
    start,
    end + 1,
  );
}

const WRITING_SYSTEMS = {
  Hani: ["Hanb", "Hntl", "Jpan", "Kore"],
  Hira: ["Jpan"],
  Kana: ["Jpan"],
  Hang: ["Kore"],
  Bopo: ["Hanb"],
  Latn: ["Hntl"],
};

function augment(codes) {
  if (codes.includes("Zyyy") || codes.includes("Zinh")) return null;
  const set = new Set(codes);
  for (const code of codes) {
    for (const writingSystem of WRITING_SYSTEMS[code] ?? []) {
      set.add(writingSystem);
    }
  }
  return [...set].sort();
}

const augmentedSets = createInterner();
const augmentedSetOfList = extensionLists.lists.map((codes) =>
  augmentedSets.indexOf(augment(codes)),
);
export const SCRIPTS = rangeTableOf(
  extensionsOf.map((list) => augmentedSetOfList[list]),
);
export const AUGMENTED_SCRIPT_SETS = augmentedSets.lists;

// In the order of Table 1
const IDENTIFIER_TYPES = [
  "Not_Character",
  "Deprecated",
  "Default_Ignorable",
  "Not_NFKC",
  "Not_XID",
  "Exclusion",
  "Obsolete",
  "Technical",
  "Uncommon_Use",
  "Limited_Use",
  "Inclusion",
  "Recommended",
];

const typeLists = createInterner();
const typesOf = new Uint16Array(CODE_POINTS);
const typeListIndexes = new Map();
const typeList = (value) => {
  const types = value.split(/\s+/);
  for (const type of types) {
    if (!IDENTIFIER_TYPES.includes(type)) {
      throw new Error(`IdentifierType.txt: unknown type ${type}`);
    }
  }
  types.sort(
    (a, b) => IDENTIFIER_TYPES.indexOf(a) - IDENTIFIER_TYPES.indexOf(b),
  );
  return typeLists.indexOf(types);
};
for (const [codePoint, value] of (
  await security.values("IdentifierType.txt")
).entries()) {
  if (!typeListIndexes.has(value)) typeListIndexes.set(value, typeList(value));
  typesOf[codePoint] = typeListIndexes.get(value);
}
export const IDENTIFIER_TYPES_OF = rangeTableOf(typesOf);
export const IDENTIFIER_TYPE_LISTS = typeLists.lists;

// Identifier_Status is Allowed exactly for these types (UTS #39, Table 1)
const ALLOWED_TYPES = ["Inclusion", "Recommended"];
export const ALLOWED_TYPE_LISTS = new Set(
  typeLists.lists.flatMap((types, index) =>
    types.every((type) => ALLOWED_TYPES.includes(type)) ? [index] : [],
  ),
);
const listedAllowed = new Uint8Array(CODE_POINTS);
for (const [start, end] of await security.ranges(
  "IdentifierStatus.txt",
  "Allowed",
)) {
  listedAllowed.fill(1, start, end + 1);
}
for (let codePoint = 0; codePoint < CODE_POINTS; codePoint++) {
  if (
    Boolean(listedAllowed[codePoint]) !==
    ALLOWED_TYPE_LISTS.has(typesOf[codePoint])
  ) {
    throw new Error(
      `IdentifierStatus.txt: U+${codePoint.toString(16)} does not match its Identifier_Type`,
    );
  }
}

// Recommended characters with a single script name every recommended script
const recommendedScripts = new Set();
for (let codePoint = 0; codePoint < CODE_POINTS; codePoint++) {
  const codes = extensionLists.lists[extensionsOf[codePoint]];
  if (
    typeLists.lists[typesOf[codePoint]].includes("Recommended") &&
    codes.length === 1 &&
    augment(codes) !== null
  ) {
    recommendedScripts.add(codes[0]);
  }
}
export const RECOMMENDED_SCRIPTS = new Set([...recommendedScripts].sort());

export const BIDI = await generateBidi();

export const COMBINING_MARKS = codePointSet(
  (
    await Promise.all(
      ["Mn", "Mc", "Me"].map((category) =>
        ucd.ranges("extracted/DerivedGeneralCategory.txt", category),
      ),
    )
  ).flat(),
);

function createInterner() {
  const lists = [];
  const indexes = new Map();
  return {
    lists,
    indexOf(list) {
      const key = JSON.stringify(list);
      if (!indexes.has(key)) indexes.set(key, lists.push(list) - 1);
      return indexes.get(key);
    },
  };
}
