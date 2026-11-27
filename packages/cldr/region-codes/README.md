# cldr-region-codes

Converts country and region codes between the three forms of
[ISO 3166-1](https://www.iso.org/iso-3166-country-codes.html): alpha-2
(`"US"`), alpha-3 (`"USA"`) and numeric (`"840"`), using the
[Unicode CLDR](https://cldr.unicode.org/) code mappings. `Intl` and the CLDR
itself identify regions by their alpha-2 code, while many data sets, forms
and APIs use one of the other two.

## Installation

```sh
npm install cldr-region-codes
```

## Usage

```js
import {
  getRegionCodes,
  toAlpha2,
  toAlpha3,
  toNumeric,
} from "cldr-region-codes";

toAlpha2("DEU"); // "DE"
toAlpha2(392); // "JP"
toAlpha3("US"); // "USA"
toNumeric("BR"); // "076"

getRegionCodes("che"); // { alpha2: "CH", alpha3: "CHE", numeric: "756" }

new Intl.DisplayNames("en", { type: "region" }).of(toAlpha2("NLD")); // "Netherlands"
```

The default export is `getRegionCodes`, with every export as a property:
`import getRegionCodes from "cldr-region-codes"`.

## API

Every function takes a code in any of the three forms: alpha-2 or alpha-3
in any case, or a numeric code as a number or a string of digits. It
returns `undefined` for a code the CLDR does not know, or when the region
has no code of the requested form (the Canary Islands, `"IC"`, only have an
alpha-2 code).

A code that belonged to several regions over time gives the current one:
`104` is Myanmar (`"MM"`), not Burma (`"BU"`).

### `toAlpha2(code)`

Returns the alpha-2 code, such as `"US"`.

### `toAlpha3(code)`

Returns the alpha-3 code, such as `"USA"`.

### `toNumeric(code)`

Returns the numeric code as a string of three digits, such as `"076"`.

### `getRegionCodes(code)`

Returns `{ alpha2, alpha3, numeric }`.

### `VERSION`

The CLDR version of the data, such as `"49.0.0"`.

## License

MIT. Includes data from the Unicode CLDR, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
