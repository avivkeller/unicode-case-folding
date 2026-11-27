import * as cldr from "@internal/build/sources/cldr";
import * as ucd from "@internal/build/sources/ucd";
import { encodeLocaleTable } from "@internal/helpers/locale";

export const VERSION = await cldr.version();

const layouts = await cldr.localeData("cldr-misc-full", "layout");
const likelySubtags = await cldr.likelySubtags();

// A script is right-to-left when most of its characters are bidi R or AL
const bidi = new Int8Array(0x110000);
for (const [value, weight] of [
  ["R", 1],
  ["AL", 1],
  ["L", -1],
]) {
  for (const [start, end] of await ucd.ranges(
    "extracted/DerivedBidiClass.txt",
    value,
  )) {
    bidi.fill(weight, start, end + 1);
  }
}
const scriptCodes = await ucd.shortNames("sc");
const scriptRanges = new Map();
for (const [range, name] of await ucd.records("Scripts.txt")) {
  if (!scriptRanges.has(name)) scriptRanges.set(name, []);
  scriptRanges.get(name).push(ucd.parseRange(range));
}

export const RTL_SCRIPTS = new Set();
for (const [name, ranges] of scriptRanges) {
  let balance = 0;
  for (const [start, end] of ranges) {
    for (let cp = start; cp <= end; cp++) balance += bidi[cp];
  }
  if (balance > 0) RTL_SCRIPTS.add(scriptCodes.get(name));
}

const directions = new Map(
  [...layouts].map(([locale, { orientation }]) => [
    locale,
    orientation.characterOrder === "right-to-left" ? "rtl" : "ltr",
  ]),
);
for (const [language, likely] of Object.entries(likelySubtags)) {
  if (!/^[a-z]{2,3}$/.test(language) || directions.has(language)) continue;
  const script = likely.split("-")[1];
  directions.set(language, RTL_SCRIPTS.has(script) ? "rtl" : "ltr");
}

export const DIRECTIONS = encodeLocaleTable(directions, likelySubtags);
