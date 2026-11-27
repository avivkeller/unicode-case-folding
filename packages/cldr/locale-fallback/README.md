# cldr-locale-fallback

Finds the locales to fall back to when a locale has no translation, with
the parent locales of the [Unicode CLDR](https://cldr.unicode.org/)
([UTS #35](https://www.unicode.org/reports/tr35/tr35.html#Parent_Locales)).
Removing subtags from the end is not enough: Mexican Spanish falls back to
Latin American Spanish before Spanish, and Chinese for Taiwan must never
fall back to Simplified Chinese.

## Installation

```sh
npm install cldr-locale-fallback
```

## Usage

```js
import { getFallbackChain, getParentLocale } from "cldr-locale-fallback";

getFallbackChain("es-MX"); // ["es-MX", "es-419", "es"]
getFallbackChain("en-AT"); // ["en-AT", "en-150", "en-001", "en"]
getFallbackChain("pt-AO"); // ["pt-AO", "pt-PT", "pt"]
getFallbackChain("zh-TW"); // ["zh-TW", "zh-Hant"]
getFallbackChain("sr-Latn-ME"); // ["sr-Latn-ME", "sr-Latn"]

getParentLocale("en-GB"); // "en-001"
getParentLocale("zh-Hant"); // undefined

// Load the first translation file that exists
const file = getFallbackChain(userLocale)
  .map((locale) => `messages/${locale}.json`)
  .find((path) => fs.existsSync(path));
```

The default export is `getFallbackChain`, with every export as a property:
`import getFallbackChain from "cldr-locale-fallback"`.

## API

Locales are BCP 47 language tags or `Intl.Locale` objects. Results are
canonical language tags, without extensions.

### `getFallbackChain(locale)`

Returns the locale followed by its ancestors, nearest first. The root
locale, which every locale ends up inheriting from, is left out.

### `getParentLocale(locale)`

Returns the locale that a locale inherits from, or `undefined` if that is
the root locale:

- The parent that CLDR lists for the locale, if any: `es-MX` → `es-419`,
  `en-GB` → `en-001`, `nb` → `no`.
- No parent for a language in a script that is not its usual one, so
  that scripts are never mixed: `zh-Hant`, `sr-Latn` and `ru-Latn`
  inherit from the root locale.
- Otherwise, the locale without its last subtag: `de-CH` → `de`. A region
  that implies another script than the usual one of the language leads
  to that script: `zh-TW` → `zh-Hant`, as `zh-TW` is short for
  `zh-Hant-TW`.

### `VERSION`

The CLDR version of the data, such as `"49.0.0"`.

## License

MIT. Includes data from the Unicode CLDR, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
