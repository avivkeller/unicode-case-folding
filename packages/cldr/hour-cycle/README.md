# cldr-hour-cycle

Tells whether a locale uses the 12-hour clock ("3:00 PM") or the 24-hour
clock ("15:00"), and which hour cycles it accepts, using the
[Unicode CLDR](https://cldr.unicode.org/) time data
([UTS #35](https://www.unicode.org/reports/tr35/tr35-dates.html#Time_Data)).
It works like
[`Intl.Locale.prototype.getHourCycles()`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale/getHourCycles),
in every runtime and with the latest data.

## Installation

```sh
npm install cldr-hour-cycle
```

## Usage

```js
import { getHourCycle, getHourCycles } from "cldr-hour-cycle";

getHourCycle("en-US"); // "h12"
getHourCycle("en-GB"); // "h23"
getHourCycle("fr-CA"); // "h23", unlike "en-CA"

getHourCycles("ja"); // ["h23", "h11", "h12"]

// The user's preference, in the locale
getHourCycle("en-US-u-hc-h23"); // "h23"
```

The default export is `getHourCycle`, with every export as a property:
`import getHourCycle from "cldr-hour-cycle"`.

## API

Hour cycles are the values of the `hourCycle` option of
`Intl.DateTimeFormat`; `"h12"` and `"h11"` are 12-hour clocks:

| Hour cycle | Hours   | Midnight |
| ---------- | ------- | -------- |
| `"h12"`    | 1 to 12 | 12:00 AM |
| `"h11"`    | 0 to 11 | 0:00 AM  |
| `"h23"`    | 0 to 23 | 0:00     |
| `"h24"`    | 1 to 24 | 24:00    |

The hour cycle of a locale is the one of its region; a locale without a
region, such as `"pt"`, has its likely one (`"BR"`). The `-u-rg-` keyword
of a locale overrides its region, and its `-u-hc-` keyword gives the hour
cycle itself.

### `getHourCycle(locale)`

Returns the hour cycle a locale prefers.

### `getHourCycles(locale)`

Returns the hour cycles in use in a locale, the preferred one first. A
locale with a `-u-hc-` keyword has that hour cycle only.

### `VERSION`

The CLDR version of the data, such as `"49.0.0"`.

## License

MIT. Includes data from the Unicode CLDR, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
