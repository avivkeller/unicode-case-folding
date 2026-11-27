# cldr-likely-subtags

Adds or removes the likely script and region of a locale, with the likely
subtags of the [Unicode CLDR](https://cldr.unicode.org/)
([UTS #35](https://www.unicode.org/reports/tr35/tr35.html#Likely_Subtags)).
Works like `Intl.Locale`'s `maximize()` and `minimize()`, with the data of
the latest CLDR release rather than the JavaScript engine's.

## Installation

```sh
npm install cldr-likely-subtags
```

## Usage

```js
import { maximize, minimize, getLikelySubtags } from "cldr-likely-subtags";

maximize("zh-TW"); // "zh-Hant-TW"
maximize("sr-ME"); // "sr-Latn-ME"
maximize("und-Cyrl"); // "ru-Cyrl-RU"

minimize("zh-Hant-TW"); // "zh-TW"
minimize("en-Latn-US"); // "en"

getLikelySubtags("pa-PK"); // { language: "pa", script: "Arab", region: "PK" }
```

## API

Locales are BCP 47 language tags or `Intl.Locale` objects. Results are
canonical language tags; variants and extensions are kept.

### `maximize(locale)`

Adds the likely language, script and region. A locale with nothing likely,
such as one of an unknown language, is returned as is.

### `minimize(locale, options)`

Removes the script and region that `maximize()` would add back. When only
one of them can be removed, `options.favor` chooses which is kept:
`"region"` (the default, as `Intl.Locale` does) or `"script"`.

```js
minimize("zh-Hant-TW", { favor: "script" }); // "zh-Hant"
```

### `getLikelySubtags(locale)`

Returns the `{ language, script, region }` of the maximized locale. The
script or region is `undefined` if nothing is likely.

### `VERSION`

The CLDR version of the data, such as `"49.0.0"`.

## Conformance

The package passes CLDR's likely subtags test data
(`likelySubtags.txt`).

## License

MIT. Includes data from the Unicode CLDR, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
