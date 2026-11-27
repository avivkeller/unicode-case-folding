# cldr-text-direction

Finds whether a locale is written left-to-right or right-to-left, using the
[Unicode CLDR](https://cldr.unicode.org/) and the Unicode Character
Database. Works in every JavaScript engine, unlike
`Intl.Locale.prototype.getTextInfo()`.

## Installation

```sh
npm install cldr-text-direction
```

## Usage

```js
import { getTextDirection, isRightToLeft } from "cldr-text-direction";

getTextDirection("ar"); // "rtl"
getTextDirection("en-US"); // "ltr"
getTextDirection("ar-Latn"); // "ltr" (Arabic in Latin script)
getTextDirection("az-Arab"); // "rtl"

document.documentElement.dir = getTextDirection(navigator.language);

isRightToLeft("he"); // true
```

## API

### `getTextDirection(locale)`

Returns `"rtl"` or `"ltr"`. A script subtag decides when there is one;
otherwise the locale's CLDR layout, or for languages without CLDR data, the
direction of the language's likely script.

### `isRightToLeft(locale)`

Returns whether `getTextDirection(locale)` is `"rtl"`.

### `VERSION`

The CLDR version of the data, such as `"49.0.0"`.

## License

MIT. Includes data from the Unicode CLDR and the Unicode Character Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
