# cldr-region-languages

Finds the languages spoken in a country or region, with their official
status and the share of the population that uses them, using the
[Unicode CLDR](https://cldr.unicode.org/) territory information. Useful to
pick the default language of a country, or the languages to offer there.

## Installation

```sh
npm install cldr-region-languages
```

## Usage

```js
import {
  getOfficialLanguages,
  getRegionLanguages,
} from "cldr-region-languages";

getOfficialLanguages("BE"); // ["nl", "fr", "de"]
getOfficialLanguages("CA"); // ["en", "fr"]
getOfficialLanguages("CH", { regional: true }); // ["de", "gsw", "fr", "it", "rm"]

getRegionLanguages("HK");
// [
//   { language: "zh-Hant", populationPercent: 95, officialStatus: "official" },
//   { language: "yue", populationPercent: 90 },
//   { language: "en", populationPercent: 51, officialStatus: "official" },
//   …
// ]
```

The default export is `getRegionLanguages`, with every export as a
property: `import getRegionLanguages from "cldr-region-languages"`.

## API

Regions are [ISO 3166](https://www.iso.org/iso-3166-country-codes.html)
alpha-2 codes, in any case. Languages are language tags, with a script
where the CLDR tells scripts apart, such as `"zh-Hant"`.

### `getRegionLanguages(region)`

Returns the languages used in a region, most used first, or `[]` for an
unknown region. Each has:

- `language`: the language tag.
- `populationPercent`: the share of the population that uses it, as a
  first or as another language. The shares add up to more than 100.
- `officialStatus`: `"official"`, `"de_facto_official"` (used as an
  official language without a law saying so) or `"official_regional"`
  (official in part of the region), or absent.

### `getOfficialLanguages(region, options?)`

Returns the tags of the languages that are official in the whole region,
by law or in fact, most used first. With `options.regional`, the languages
that are official in part of the region are included.

### `VERSION`

The CLDR version of the data, such as `"49.0.0"`.

## License

MIT. Includes data from the Unicode CLDR, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
