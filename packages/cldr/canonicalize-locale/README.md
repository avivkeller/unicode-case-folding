# cldr-canonicalize-locale

Canonicalizes locale identifiers: fixes their case and order, and replaces
deprecated and legacy codes with the current ones, using the aliases of the
[Unicode CLDR](https://cldr.unicode.org/)
([UTS #35, Annex C](https://www.unicode.org/reports/tr35/tr35.html#LocaleId_Canonicalization)).
Works like `Intl.getCanonicalLocales()`, with the data of the latest CLDR
release rather than the JavaScript engine's, and also accepts the legacy
tags that engines reject.

## Installation

```sh
npm install cldr-canonicalize-locale
```

## Usage

```js
import { canonicalizeLocale } from "cldr-canonicalize-locale";

canonicalizeLocale("iw-IL"); // "he-IL"
canonicalizeLocale("EN_us"); // "en-US"
canonicalizeLocale("sh"); // "sr-Latn"
canonicalizeLocale("cmn-TW"); // "zh-TW"
canonicalizeLocale("hy-SU"); // "hy-AM"
canonicalizeLocale("sgn-US"); // "ase"
canonicalizeLocale("i-klingon"); // "tlh"
canonicalizeLocale("en-u-ms-imperial"); // "en-u-ms-uksystem"
```

The default export is `canonicalizeLocale`, with every export as a
property: `import canonicalizeLocale from "cldr-canonicalize-locale"`.

## API

### `canonicalizeLocale(locale)`

Returns the canonical form of a BCP 47 language tag or `Intl.Locale`:

- Subtags get their canonical case, and variants, extensions, attributes
  and keywords their canonical order; `_` separators become `-`.
- Deprecated, overlong and legacy languages, scripts, regions and variants
  are replaced (`iw` → `he`, `deu` → `de`, `840` → `US`, `DD` → `DE`). A
  region that was split up becomes the successor that is likely for the
  language (`hy-SU` → `hy-AM`).
- Legacy tags (`i-klingon`, `zh-min-nan`, `en-GB-oed`), extended languages
  (`zh-yue` → `yue`) and private use tags (`x-foo` → `und-x-foo`) become
  Unicode locale identifiers.
- In the `-u-` and `-t-` extensions, deprecated types, time zones and
  subdivisions are replaced, and `true` values are removed.

Throws a `RangeError` if the locale is not well-formed. Whether its
subtags are registered is not checked.

### `VERSION`

The CLDR version of the data, such as `"49.0.0"`.

## License

MIT. Includes data from the Unicode CLDR, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
