import * as ucd from "@internal/build/sources/ucd";
import { idna } from "@internal/build/sources/unicode";
import { rangeTableOf } from "@internal/helpers/tables";
import {
  BIDI_CLASSES,
  BIDI_SHIFT,
  JOINING_SHIFT,
  JOINING_TYPES,
  MARK,
  STATUSES,
  VIRAMA,
} from "./properties.mjs";

const MAPPING_FILE = "IdnaMappingTable.txt";
const BIDI_FILE = "extracted/DerivedBidiClass.txt";
const JOINING_FILE = "extracted/DerivedJoiningType.txt";
const COMBINING_FILE = "extracted/DerivedCombiningClass.txt";
const CATEGORY_FILE = "extracted/DerivedGeneralCategory.txt";

export const VERSION = await idna.version(MAPPING_FILE);
const ucdVersion = await ucd.version(
  BIDI_FILE,
  JOINING_FILE,
  COMBINING_FILE,
  CATEGORY_FILE,
);
if (ucdVersion !== VERSION) {
  throw new Error(`${MAPPING_FILE} is ${VERSION}, the UCD is ${ucdVersion}`);
}

const properties = new Uint16Array(ucd.CODE_POINTS);
export const MAPPINGS = new Map();

for (const [range, status, mapping] of await idna.records(MAPPING_FILE)) {
  if (!(status in STATUSES)) {
    throw new Error(`${MAPPING_FILE}: unsupported status ${status}`);
  }
  const [start, end] = ucd.parseRange(range);
  properties.fill(STATUSES[status], start, end + 1);
  if (status === "mapped" || status === "deviation") {
    const value = String.fromCodePoint(...ucd.parseCodePoints(mapping));
    for (let codePoint = start; codePoint <= end; codePoint++) {
      MAPPINGS.set(codePoint, value);
    }
  }
}

const bidiShortNames = await ucd.shortNames("bc");
const joiningShortNames = await ucd.shortNames("jt");
const [bidiClasses, joiningTypes, combiningClasses, categories] =
  await Promise.all(
    [BIDI_FILE, JOINING_FILE, COMBINING_FILE, CATEGORY_FILE].map(ucd.values),
  );
for (let codePoint = 0; codePoint < ucd.CODE_POINTS; codePoint++) {
  const bidiClass = bidiClasses[codePoint];
  const joiningType = joiningTypes[codePoint];
  properties[codePoint] |=
    ((BIDI_CLASSES[bidiShortNames.get(bidiClass) ?? bidiClass] ?? 0) <<
      BIDI_SHIFT) |
    ((JOINING_TYPES[joiningShortNames.get(joiningType) ?? joiningType] ?? 0) <<
      JOINING_SHIFT) |
    (combiningClasses[codePoint] === "9" ? VIRAMA : 0) |
    (categories[codePoint].startsWith("M") ? MARK : 0);
}

export const PROPERTIES = rangeTableOf([...properties]);
