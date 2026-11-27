# cldr-region-currency

Finds the currency used in a country or region, now or on any date since
the 1800s, and how amounts in a currency are rounded, using the [Unicode CLDR](https://cldr.unicode.org/) currency
history.

## Installation

```sh
npm install cldr-region-currency
```

## Usage

```js
import { getCurrencies, getCurrency } from "cldr-region-currency";

getCurrency("US"); // "USD"
getCurrency("DE"); // "EUR"
getCurrency("DE", new Date("1990-06-01")); // "DEM"
getCurrencies("PA"); // ["PAB", "USD"]

// With the user's region:
const { region } = new Intl.Locale(navigator.language).maximize();
new Intl.NumberFormat(navigator.language, {
  style: "currency",
  currency: getCurrency(region) ?? "USD",
}).format(9.99);
```

The default export is `getCurrency`, with every export as a property:
`import getCurrency from "cldr-region-currency"`.

## API

### `getCurrency(region, date?)`

Returns the ISO 4217 code of the primary legal tender currency of a region
(an ISO 3166 code such as `"US"`, case-insensitive) on a date (default:
now), or `undefined` if it has none.

### `getCurrencies(region, date?)`

Returns all legal tender currencies of a region on a date, the primary one
first.

### `getCurrencyRounding(currency)`

Returns how amounts in a currency are rounded, as options for
`Intl.NumberFormat`: `{ fractionDigits, roundingIncrement,
cashFractionDigits, cashRoundingIncrement }`. Cash amounts can differ: Swiss
francs are rounded to 0.05, and Swedish kronor to whole kronor.

```js
const { cashFractionDigits, cashRoundingIncrement } =
  getCurrencyRounding("CHF");
new Intl.NumberFormat("de-CH", {
  style: "currency",
  currency: "CHF",
  minimumFractionDigits: cashFractionDigits,
  maximumFractionDigits: cashFractionDigits,
  roundingIncrement: cashRoundingIncrement,
}).format(1.03); // "CHF 1.05"
```

### `VERSION`

The CLDR version of the data, such as `"49.0.0"`.

## License

MIT. Includes data from the Unicode CLDR, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
