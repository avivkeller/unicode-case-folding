# cldr-week-info

Finds the first day of the week, the weekend days and the week numbering
rule of any locale, using the [Unicode CLDR](https://cldr.unicode.org/).
It returns what `Intl.Locale.prototype.getWeekInfo()` does, which not every
JavaScript engine supports, plus the week numbering rule, and does not
depend on the engine's locale data.

## Installation

```sh
npm install cldr-week-info
```

## Usage

```js
import { getWeekInfo } from "cldr-week-info";

getWeekInfo("en-US"); // { firstDay: 7, weekend: [6, 7], minimalDays: 1 }
getWeekInfo("de"); // { firstDay: 1, weekend: [6, 7], minimalDays: 4 }
getWeekInfo("ar-EG"); // { firstDay: 6, weekend: [5, 6], minimalDays: 1 }
getWeekInfo("en-US-u-fw-mon").firstDay; // 1
```

## API

### `getWeekInfo(locale)`

Returns `{ firstDay, weekend, minimalDays }`, with days numbered from 1
(Monday) to 7 (Sunday):

- `firstDay`: the first day of the week.
- `weekend`: the days of the weekend.
- `minimalDays`: the fewest days of a new year that its first week must
  have (4 for ISO 8601 week numbers).

The locale's region decides, or the likely region of its language ("en"
is treated as "en-US"). The Unicode extensions `fw` (first day of the week,
`"en-US-u-fw-mon"`) and `rg` (region override, `"en-u-rg-gbzzzz"`) are
supported.

### `VERSION`

The CLDR version of the data, such as `"49.0.0"`.

## License

MIT. Includes data from the Unicode CLDR, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
