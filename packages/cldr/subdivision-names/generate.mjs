import * as cldr from "@internal/build/sources/cldr";
import { encodeLocaleTable } from "@internal/helpers/locale";

const PACKAGE = "cldr-subdivisions-full";

export const VERSION = await cldr.version();

const { subdivisionContainment } = (
  await cldr.json("cldr-core", "supplemental/subdivisionContainment.json")
).supplemental;
const { full: locales } = (
  await cldr.json("cldr-core", "availableLocales.json")
).availableLocales;
const likelySubtags = await cldr.likelySubtags();

const names = new Map();
for (const locale of locales) {
  const file = `subdivisions/${locale}/${locale.replaceAll("-", "_")}.json`;
  if (!(await cldr.has(PACKAGE, file))) continue;
  const data = await cldr.json(PACKAGE, file);
  names.set(locale, data.subdivisions.localeDisplayNames.subdivisions);
}

// CLDR identifiers: "usca" is US-CA
const english = Object.entries(names.get("en")).sort(([a], [b]) =>
  a < b ? -1 : 1,
);
export const CODES = english.map(([code]) => code);
export const NAMES = english.map(([, name]) => name);

// The names a locale has, where they differ from the English ones
export const LOCALIZED = encodeLocaleTable(
  new Map([
    ["und", {}],
    ...[...names].map(([locale, localized]) => [
      locale,
      locale === "en"
        ? {}
        : Object.fromEntries(
            Object.entries(localized).filter(
              ([code, name]) => name !== names.get("en")[code],
            ),
          ),
    ]),
  ]),
  likelySubtags,
);

// Region ("US") or subdivision ("gbeng") → the subdivisions inside it
export const CONTAINS = new Map(
  Object.entries(subdivisionContainment).map(([code, { _contains }]) => [
    code,
    _contains.join(" "),
  ]),
);
