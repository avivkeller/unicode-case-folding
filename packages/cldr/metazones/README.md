# cldr-metazones

Groups IANA time zones into metazones: the sets of time zones that share a
name, such as "Pacific Time" for `America/Los_Angeles`, `America/Vancouver`
and `America/Tijuana`. Uses the
[Unicode CLDR](https://cldr.unicode.org/) metazone data
([UTS #35](https://www.unicode.org/reports/tr35/tr35-dates.html#Metazones)).
Useful to build a time zone picker that shows one entry per metazone
instead of the four hundred IANA time zones.

## Installation

```sh
npm install cldr-metazones
```

## Usage

```js
import {
  getGoldenZone,
  getMetazone,
  getMetazoneTimeZones,
} from "cldr-metazones";

getMetazone("America/Los_Angeles"); // "America_Pacific"
getMetazone("Asia/Kolkata"); // "India"
getMetazone("Europe/Kyiv", new Date("1985-01-01")); // "Moscow"

getMetazoneTimeZones("America_Pacific");
// ["America/Los_Angeles", "America/Tijuana", "America/Vancouver"]

getGoldenZone("Europe_Central"); // "Europe/Paris"
getGoldenZone("Europe_Central", "DE"); // "Europe/Berlin"

// The name of a metazone, as users know it
new Intl.DateTimeFormat("en", {
  timeZone: getGoldenZone("America_Pacific"),
  timeZoneName: "longGeneric",
})
  .formatToParts()
  .find((part) => part.type === "timeZoneName").value; // "Pacific Time"
```

The default export is `getMetazone`, with every export as a property:
`import getMetazone from "cldr-metazones"`.

## API

Time zones are IANA names, such as `"Asia/Kolkata"`. Older names and
aliases, such as `"Asia/Calcutta"` or `"US/Pacific"`, are accepted in any
case; the names returned are the current ones.

### `getMetazone(timeZone, date?)`

Returns the metazone a time zone is in on a date (now by default), or
`undefined`: for an unknown time zone, and for the few that are in no
metazone, such as `"UTC"` or, since 2022, `"Asia/Amman"`.

### `getMetazoneTimeZones(metazone, date?)`

Returns the time zones that are in a metazone on a date (now by default),
sorted; `[]` for an unknown metazone, or one that is no longer in use.

### `getGoldenZone(metazone, region?)`

Returns the time zone that stands for a metazone: the one of a region
(an ISO 3166 code) if the metazone has one there, or its main one.
`undefined` for an unknown metazone.

### `getMetazones()`

Returns the names of every metazone, sorted, past ones included.

### `VERSION`

The CLDR version of the data, such as `"49.0.0"`.

## License

MIT. Includes data from the Unicode CLDR, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
