# cldr-region-containment

Tells whether a country is in a continent, a part of a continent or a
grouping such as the European Union or the eurozone, and lists the
countries of a region, using the
[Unicode CLDR](https://cldr.unicode.org/) territory containment data.

## Installation

```sh
npm install cldr-region-containment
```

## Usage

```js
import {
  getContinent,
  getCountries,
  isInRegion,
} from "cldr-region-containment";

isInRegion("FR", "EU"); // true
isInRegion("CH", "EU"); // false
isInRegion("HR", "EZ"); // true: Croatia uses the euro
isInRegion("MX", "419"); // true: Latin America

getContinent("JP"); // "142" (Asia)

getCountries("EU"); // ["AT", "BE", "BG", …]
new Intl.DisplayNames("en", { type: "region" }).of(getContinent("BR")); // "Americas"
```

The default export is `isInRegion`, with every export as a property:
`import isInRegion from "cldr-region-containment"`.

## API

Countries and territories are [ISO 3166](https://www.iso.org/iso-3166-country-codes.html)
alpha-2 codes, in any case. Larger regions are
[UN M49](https://unstats.un.org/unsd/methodology/m49/) codes, which
`Intl.DisplayNames` can name:

| Code    | Region   | Code    | Region                 |
| ------- | -------- | ------- | ---------------------- |
| `"001"` | World    | `"EU"`  | European Union         |
| `"002"` | Africa   | `"EZ"`  | Eurozone               |
| `"009"` | Oceania  | `"UN"`  | United Nations members |
| `"019"` | Americas | `"003"` | North America          |
| `"142"` | Asia     | `"419"` | Latin America          |
| `"150"` | Europe   | `"202"` | Sub-Saharan Africa     |

The right column lists the groupings: regions that overlap the tree of the
world, its continents, their parts and their countries.

### `isInRegion(region, container)`

Returns whether a region is inside another, directly or not. A region is
not inside itself.

### `getCountries(container)`

Returns every country and territory inside a region, however deep, sorted.

### `getContinent(region)`

Returns the continent of a region: `"002"`, `"009"`, `"019"`, `"142"` or
`"150"`, or `undefined` for an unknown region or a grouping.

### `VERSION`

The CLDR version of the data, such as `"49.0.0"`.

## License

MIT. Includes data from the Unicode CLDR, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
