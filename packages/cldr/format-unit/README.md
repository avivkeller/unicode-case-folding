# cldr-format-unit

Unit conversion, regional unit preferences and measurement formatting,
from the [Unicode CLDR](https://cldr.unicode.org/). Implements the unit
conversion and unit preference algorithms of
[UTS #35, Part 6: Supplemental](https://www.unicode.org/reports/tr35/tr35-info.html#Unit_Conversion):
convert between any CLDR units, find the units a region uses for a
person's height, a road distance or a car's fuel consumption, and format
amounts in them with `Intl.NumberFormat`.

## Installation

```sh
npm install cldr-format-unit
```

## Usage

```js
import {
  convertUnit,
  convertToPreferredUnits,
  formatMeasure,
  getMeasurementSystem,
  getPaperSize,
  getPreferredUnits,
} from "cldr-format-unit";

convertUnit(1, "mile", "kilometer"); // 1.609344
convertUnit(212, "fahrenheit", "celsius"); // 100
convertUnit(1, "cubic-foot", "liter"); // 28.316846592
convertUnit(36, "kilometer-per-hour", "meter-per-second"); // 10
convertUnit(50, "mile-per-gallon", "liter-per-100-kilometer"); // 4.704291666666666

formatMeasure(1.78, "meter", { locale: "en-US", usage: "person-height" });
// "5 ft, 10 in"
formatMeasure(1.78, "meter", { locale: "de-DE", usage: "person-height" });
// "178 cm"
formatMeasure(80, "kilogram", { locale: "en-GB", usage: "person" });
// "12 st, 8 lb"
formatMeasure(25, "celsius", { locale: "en-US" }); // "77°F"
formatMeasure(7, "liter-per-100-kilometer", {
  locale: "en-GB",
  usage: "vehicle-fuel",
});
// "40 mpg Imp."
formatMeasure(1.78, "meter", {
  locale: "en-US",
  usage: "person-height",
  unitDisplay: "long",
});
// "5 feet, 10 inches"

getPreferredUnits("meter", { region: "US", usage: "person-height" });
// [{ units: ["foot", "inch"], geq: 3 }, { units: ["inch"], geq: 0 }]
convertToPreferredUnits(1.78, "meter", {
  locale: "en",
  usage: "person-height",
});
// [{ unit: "foot", value: 5 }, { unit: "inch", value: 10.078740157480315 }]

getMeasurementSystem("GB"); // "UK"
getPaperSize("CA"); // "US-Letter"
```

## API

Units are CLDR unit identifiers:

- simple units such as `meter`, `foot`, `pound-force` and
  `fluid-ounce-imperial`
- with SI or binary prefixes: `kilometer`, `milligram`, `kibibyte`
- powers: `square-meter`, `cubic-foot`, `pow4-meter`
- compound units: `kilometer-per-hour`, `meter-per-square-second`,
  `kilowatt-hour`, `liter-per-100-kilometer`
- deprecated identifiers, such as `metric-ton` for `tonne`

Unknown units throw a `RangeError`.

### `convertUnit(value, fromUnit, toUnit)`

Converts an amount from one unit to another. Units convert into each other
when they measure the same quantity, or reciprocal quantities
(`mile-per-gallon` and `liter-per-100-kilometer`); otherwise a `RangeError`
is thrown.

Conversions are exact: CLDR defines its conversion factors as rational
numbers, and the conversion is computed with them and rounded once, so
212 °F is exactly 100 °C. A number is taken as the decimal it prints as, so
`0.1` is one tenth. Temperatures convert with an offset only on their own:
`celsius-per-second` is the same as `kelvin-per-second`.

### `getPreferredUnits(unit, options?)`

Returns the units that a region uses for amounts of the quantity of
`unit`, ranked: an amount uses the first entry for which it is at least
`geq` of the entry's first unit. `units` lists the units of mixed units,
largest first, such as `["foot", "inch"]`. For quantities that CLDR has no
preferences for, such as electric current, the only entry is the base unit
(`ampere`).

`options`:

- `usage`: what is measured (default: `"default"`). Usages fall back to
  more general ones (`"road-motorway"` to `"road"`, then `"default"`). CLDR
  has these, besides `default`:
  - area: `floor`, `geograph`, `land`
  - concentration: `blood-glucose`
  - consumption: `vehicle-fuel`
  - duration: `media`
  - energy: `food`
  - length: `focal-length`, `person`, `person-height`, `rainfall`, `road`,
    `snowfall`, `vehicle`, `visiblty`
  - mass: `person`
  - power: `engine`
  - pressure: `baromtrc`
  - speed: `rainfall`, `snowfall`, `wind`
  - temperature: `weather`
  - volume: `fluid`, `oil`, `vehicle`
  - year-duration: `person-age`
- `region`: the region whose preferences to use, as an ISO 3166 code such
  as `"US"`. Regions without preferences of their own use the world's
  (`"001"`, the default).
- `locale`: a locale (a string or `Intl.Locale`) whose region is used when
  `region` is not given: its `-u-rg` keyword, its region subtag, or its
  likely region from `Intl.Locale.prototype.maximize()`. Its `-u-ms`
  keyword (`metric`, `ussystem` or `uksystem`) and `-u-mu` keyword
  (`celsius`, `fahrenhe` or `kelvin`) apply as specified by UTS #35.

### `convertToPreferredUnits(value, unit, options?)`

Converts an amount to the units that `getPreferredUnits()` chooses for it,
and returns `{ unit, value }` for each unit: one, or one per unit of a mixed
unit, where all but the last are whole numbers. Takes the same options.

### `formatMeasure(value, unit, options)`

Formats an amount in the preferred units for a locale's region, with
`Intl.NumberFormat` and, for mixed units, `Intl.ListFormat`. `options` are
`locale` (required), `usage`, `region` (overriding the locale's), and
`unitDisplay` (`"short"`, the default, `"long"` or `"narrow"`, as for
`Intl.NumberFormat`).

Amounts are rounded with CLDR's default rule: to an integer, but keeping at
least two significant digits (`"1.3 gal"`, `"62 mi"`). This uses the
`roundingPriority` option of `Intl.NumberFormat` (ES2023); older engines
ignore it and keep two significant digits only (`"60 mi"`). Mixed units round
their last unit to an integer and carry into the others (5 ft 11.7 in is
`"6 ft"`), and leave out units that are zero.

Amounts of quantities without preferences, such as digital storage, are
formatted in their own unit, unconverted.

#### Units and `Intl.NumberFormat`

`Intl.NumberFormat` formats the 45 units that ECMA-402 sanctions (acre,
bit, byte, celsius, centimeter, day, degree, fahrenheit, fluid-ounce, foot,
gallon, gigabit, gigabyte, gram, hectare, hour, inch, kilobit, kilobyte,
kilogram, kilometer, liter, megabit, megabyte, meter, microsecond, mile,
mile-scandinavian, milliliter, millimeter, millisecond, minute, month,
nanosecond, ounce, percent, petabyte, pound, second, stone, terabit,
terabyte, week, yard, year) and pairs of them joined by `-per-`, such as
`kilometer-per-hour` and `mile-per-gallon`.

The other units that preferences produce, such as `square-kilometer`,
`cubic-foot`, `quart`, `kilowatt-hour`, `watt`, `hectopascal` and
`liter-per-100-kilometer`, are written as the number, formatted for the
locale, with the unit's international symbol from CLDR's root locale:
`"1.000 m²"` in German, `"7 L/100km"`. These symbols are not translated
and do not change with `unitDisplay`. `year-person` and `month-person` are
formatted as years and months, and `foodcalorie` as kilocalories.

A unit formatted unconverted must be one that `Intl.NumberFormat`
supports; for others, such as `volt`, it throws a `RangeError`.

### `getMeasurementSystem(region, options?)`

Returns `"metric"`, `"US"` or `"UK"`: the measurement system in common use
in a region. With `{ category: "temperature" }`, returns the system used
for temperatures, which differs in a few regions (the Bahamas use
Fahrenheit, Liberia and Myanmar Celsius).

### `getPaperSize(region)`

Returns `"A4"` or `"US-Letter"`: the paper size used in a region.

### `VERSION`

The CLDR version of the data, such as `"49.0.0"`.

## Conformance

The package passes all of CLDR's unit tests
([common/testData/units](https://github.com/unicode-org/cldr/tree/main/common/testData/units)):
the 236 conversions of `unitsTest.txt`, each giving the number nearest to
the exact result, and the 370 tests of `unitPreferencesTest.txt` and 23 of
`unitLocalePreferencesTest.txt`. It differs from the specification here:

- The Beaufort scale cannot be converted: UTS #35 names its special
  conversion, but CLDR has no data for it.
- The cldr-json data has no rounding skeletons, so road distances below a
  kilometer or half a mile are rounded with the default rule
  (`"437 yd"`), not to multiples of 50 or 10 (`"450 yd"`).
- Region codes are not checked against CLDR's list of regions: an unknown
  region uses the world's preferences, where UTS #35 ignores an invalid
  `-u-rg` value.
- As in ICU, a unit whose reciprocal has preferences uses them, so
  `mile-per-gallon` amounts get consumption preferences.

## License

MIT. Includes data from the Unicode CLDR, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
