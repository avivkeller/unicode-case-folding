# cldr-preferred-calendars

Finds the calendars in use in the region of a locale, the most preferred
first: Gregorian nearly everywhere, but Buddhist in Thailand, Persian in
Iran, and Japanese, Hijri, Hebrew or Chinese next to the Gregorian one
elsewhere. Uses the [Unicode CLDR](https://cldr.unicode.org/) calendar
preference data
([UTS #35](https://www.unicode.org/reports/tr35/tr35-dates.html#Calendar_Preference_Data)),
and works like
[`Intl.Locale.prototype.getCalendars()`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale/getCalendars),
in every runtime and with the latest data.

## Installation

```sh
npm install cldr-preferred-calendars
```

## Usage

```js
import { getCalendars } from "cldr-preferred-calendars";

getCalendars("en-US"); // ["gregory"]
getCalendars("ja"); // ["gregory", "japanese"]
getCalendars("th-TH"); // ["buddhist", "gregory"]
getCalendars("ar-SA"); // ["gregory", "islamic-umalqura", "islamic", "islamic-rgsa"]

// The calendars to offer in a date picker
getCalendars("he-IL").map((calendar) =>
  new Intl.DateTimeFormat("en", { calendar, dateStyle: "long" }).format(
    new Date(),
  ),
);
```

The default export is `getCalendars`, with every export as a property:
`import getCalendars from "cldr-preferred-calendars"`.

## API

Calendars are the identifiers that the `calendar` option of
`Intl.DateTimeFormat` and the `-u-ca-` keyword of locales take, such as
`"gregory"`, `"buddhist"`, `"japanese"` or `"islamic-umalqura"`.

The calendars of a locale are the ones of its region; a locale without a
region, such as `"ja"`, has its likely one (`"JP"`). The `-u-rg-` keyword
of a locale overrides its region.

### `getCalendars(locale)`

Returns the calendars in use, the most preferred first. A locale with a
`-u-ca-` keyword has that calendar only.

### `VERSION`

The CLDR version of the data, such as `"49.0.0"`.

## License

MIT. Includes data from the Unicode CLDR, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
