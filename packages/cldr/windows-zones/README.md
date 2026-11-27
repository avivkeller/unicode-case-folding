# cldr-windows-zones

Converts between Windows time zone names (as used by Windows, .NET and
Exchange) and IANA time zones (as used by JavaScript and everything else),
using the [Unicode CLDR](https://cldr.unicode.org/) mapping.

## Installation

```sh
npm install cldr-windows-zones
```

## Usage

```js
import { ianaToWindows, windowsToIana } from "cldr-windows-zones";

windowsToIana("Pacific Standard Time"); // "America/Los_Angeles"
windowsToIana("Eastern Standard Time", { region: "CA" }); // "America/Toronto"
windowsToIana("India Standard Time"); // "Asia/Kolkata"

ianaToWindows("Europe/Berlin"); // "W. Europe Standard Time"
ianaToWindows("Asia/Calcutta"); // "India Standard Time"

new Intl.DateTimeFormat("en", {
  timeZone: windowsToIana("Tokyo Standard Time"),
  timeStyle: "short",
}).format(new Date());
```

## API

### `windowsToIana(windowsZone, options?)`

Returns the IANA time zone for a Windows time zone, or `undefined` if it is
unknown. Set `options.region` (an ISO 3166 code) to get the zone used in that
region. Returns current IANA names ("Asia/Kolkata", not "Asia/Calcutta").

### `windowsToIanaZones(windowsZone, region)`

Returns all IANA time zones for a Windows time zone in a region (`"001"` for
the default).

### `ianaToWindows(ianaZone)`

Returns the Windows time zone for an IANA time zone, or `undefined` if there
is none. Accepts current and deprecated IANA names.

### `getWindowsZones()`

Returns the names of all Windows time zones.

### `VERSION`

The CLDR version of the data, such as `"49.0.0"`.

Names match case-insensitively.

## License

MIT. Includes data from the Unicode CLDR, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
