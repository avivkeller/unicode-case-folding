import * as ucd from "@internal/build/sources/ucd";
import { mappingTable, rangeTableOf } from "@internal/helpers/tables";

const UNICODE_DATA = "UnicodeData.txt";
const DERIVED_PROPS = "DerivedNormalizationProps.txt";
const { CODE_POINTS } = ucd;

export const VERSION = await ucd.version(DERIVED_PROPS);

// Quick check flags, above the combining class in PROPERTIES
export const NFD_NO = 0x100;
export const NFKD_NO = 0x200;
export const NFC_NO_OR_MAYBE = 0x400;
export const NFKC_NO_OR_MAYBE = 0x800;
export const LEAD_SURROGATE = 0x1000;
export const CLASS_MASK = 0xff;

// Only No and Maybe are listed: Yes is the default
const QUICK_CHECK_BITS = {
  NFD_QC: NFD_NO,
  NFKD_QC: NFKD_NO,
  NFC_QC: NFC_NO_OR_MAYBE,
  NFKC_QC: NFKC_NO_OR_MAYBE,
};

const [unicodeData, derivedProps, excluded] = await Promise.all([
  ucd.records(UNICODE_DATA),
  ucd.records(DERIVED_PROPS),
  ucd.ranges(DERIVED_PROPS, "Full_Composition_Exclusion"),
]);

const properties = new Uint16Array(CODE_POINTS);
const canonical = new Map();
const compatibility = new Map();
for (const fields of unicodeData) {
  const codePoint = parseInt(fields[0], 16);
  properties[codePoint] = Number(fields[3]);
  const [, tag, mapping] = /^(<\w+> )?(.*)$/.exec(fields[5]);
  if (mapping) {
    const table = tag ? compatibility : canonical;
    table.set(codePoint, ucd.parseCodePoints(mapping));
  }
}

function decompose(codePoint, compatible) {
  const mapping =
    canonical.get(codePoint) ??
    (compatible ? compatibility.get(codePoint) : undefined);
  return mapping
    ? mapping.flatMap((part) => decompose(part, compatible))
    : [codePoint];
}

export const CANONICAL = mappingTable(
  [...canonical.keys()].map((codePoint) => [
    codePoint,
    decompose(codePoint, false),
  ]),
);

// Only where it differs from the canonical decomposition
export const COMPATIBILITY = mappingTable(
  [...canonical.keys(), ...compatibility.keys()]
    .map((codePoint) => [codePoint, decompose(codePoint, true)])
    .filter(
      ([codePoint, mapping]) =>
        mapping.join() !== decompose(codePoint, false).join(),
    ),
);

const isExcluded = new Uint8Array(CODE_POINTS);
for (const [start, end] of excluded) isExcluded.fill(1, start, end + 1);

// Primary composites as [first, second, composite, …]
export const COMPOSITIONS = [...canonical]
  .filter(
    ([codePoint, mapping]) => mapping.length === 2 && !isExcluded[codePoint],
  )
  .flatMap(([codePoint, mapping]) => [...mapping, codePoint]);

for (const [range, property] of derivedProps) {
  const bit = QUICK_CHECK_BITS[property];
  if (!bit) continue;
  const [start, end] = ucd.parseRange(range);
  for (let codePoint = start; codePoint <= end; codePoint++) {
    properties[codePoint] |= bit;
  }
}

// Tells a scan of UTF-16 code units where to read a surrogate pair
properties.fill(LEAD_SURROGATE, 0xd800, 0xdc00);

export const PROPERTIES = rangeTableOf(properties);

// Every lower code point is a starter that passes the form's quick check
const firstUnstable = (bit) =>
  properties.findIndex((value) => value & (bit | CLASS_MASK));
export const STABLE_BELOW = {
  NFC: firstUnstable(NFC_NO_OR_MAYBE),
  NFD: firstUnstable(NFD_NO),
  NFKC: firstUnstable(NFKC_NO_OR_MAYBE),
  NFKD: firstUnstable(NFKD_NO),
};
