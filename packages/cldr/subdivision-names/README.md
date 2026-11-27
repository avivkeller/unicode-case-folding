# cldr-subdivision-names

Names the states, provinces and other subdivisions of countries by their
[ISO 3166-2](https://www.iso.org/iso-3166-country-codes.html) code
(`"US-CA"` is California), and lists the subdivisions of a country, using
the [Unicode CLDR](https://cldr.unicode.org/). `Intl.DisplayNames` names
countries, but not their subdivisions.

## Installation

```sh
npm install cldr-subdivision-names
```

## Usage

```js
import { getSubdivisionName, getSubdivisions } from "cldr-subdivision-names";

getSubdivisionName("US-CA"); // "California"
getSubdivisionName("CA-QC"); // "Quebec"
getSubdivisionName("GB-SCT", "fr"); // "Écosse"

getSubdivisions("GB"); // ["GB-ENG", "GB-NIR", "GB-SCT", "GB-WLS"]
getSubdivisions("US").map((code) => getSubdivisionName(code)); // ["Alaska", "Alabama", …]
```

The default export is `getSubdivisionName`, with every export as a
property: `import getSubdivisionName from "cldr-subdivision-names"`.

## Languages

The CLDR names every subdivision in English only. In about a hundred other
languages, it names England, Scotland and Wales, which have flag emoji;
every other name is returned in English, whatever the locale.

A few English names end with a superscript digit, such as `"Savanes²"`:
the CLDR tells apart this way two subdivisions of a country that have the
same name.

## API

Subdivisions are ISO 3166-2 codes, such as `"US-CA"`, in any case. The
Unicode subdivision identifiers of locales (`"usca"`, as in
`en-US-u-sd-usca`) are accepted too.

### `getSubdivisionName(code, locale?)`

Returns the name of a subdivision in the language of a locale (`"en"` by
default), or `undefined` if the CLDR has no name for the code.

### `getSubdivisions(code)`

Returns the codes of the subdivisions of a country (`"US"`), or of the
subdivisions inside a subdivision (`"GB-ENG"`); `[]` if there are none.

### `VERSION`

The CLDR version of the data, such as `"49.0.0"`.

## License

MIT. Includes data from the Unicode CLDR, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
