# cldr-locale-matcher

Picks the supported locale that best fits a user's preferred locales, with
the language matching data of the [Unicode CLDR](https://cldr.unicode.org/)
([UTS #35](https://www.unicode.org/reports/tr35/tr35.html#LanguageMatching)),
as ICU's `LocaleMatcher` does. It knows that an Australian is better served
by British than by American English, that Latin American Spanish suits a
user from Argentina, that readers of Breton understand French, and that
Chinese for Hong Kong must not become Simplified Chinese.

## Installation

```sh
npm install cldr-locale-matcher
```

## Usage

```js
import { matchLocale, getBestMatch } from "cldr-locale-matcher";

const supported = ["en", "en-GB", "es", "es-419", "fr", "zh-CN", "zh-TW"];

matchLocale("en-AU", supported); // "en-GB"
matchLocale("es-AR", supported); // "es-419"
matchLocale("zh-HK", supported); // "zh-TW"
matchLocale("br", supported); // "fr"
matchLocale(["ja", "fr-CH"], supported); // "fr"
matchLocale("ja", supported); // "en", the first supported locale

// From a browser or an Accept-Language header
matchLocale(navigator.languages, supported);

getBestMatch(["de-AT", "fr"], ["fr", "de", "ja"]);
// { supported: "de", desired: "de-AT", distance: 4 }
```

The default export is `matchLocale`, with every export as a property:
`import matchLocale from "cldr-locale-matcher"`.

## API

Locales are BCP 47 language tags or `Intl.Locale` objects. Deprecated
codes are understood (`iw` matches `he`), and the likely script and region
are added before comparing, so that `zh-TW` matches `zh-Hant`.

### `matchLocale(desired, supported, options?)`

Returns the supported locale that is the closest to one of the desired
locales, as it was given in `supported`. `desired` is a locale or a list of
locales, most preferred first: a later one only wins if it matches better
by more than a difference of region.

If no supported locale is close enough, returns `options.defaultLocale`,
or the first supported locale if there is none.

| Option          | Default                    |                                                                                                              |
| --------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `defaultLocale` | The first supported locale | Returned if nothing matches; also wins among equally close locales                                           |
| `threshold`     | `50`                       | The distance from which a locale no longer matches                                                           |
| `favor`         | `"language"`               | `"script"` prefers another language in the user's script to the user's language in a script they cannot read |

Among equally close supported locales, the default locale wins, then the
main variety of a language (`en`, `en-GB`, `es`, `es-419`, `pt-BR`,
`pt-PT`), then the one given first.

### `getBestMatch(desired, supported, options?)`

Like `matchLocale()`, but returns `{ supported, desired, distance }`: the
supported locale, the desired locale it matched, and the distance between
them: `0` if they are equivalent, 3 to 5 for another region, and 50 or
more for a script or a language that the user is not expected to
understand. Returns `undefined` if no supported locale is close enough.

### `VERSION`

The CLDR version of the data, such as `"49.0.0"`.

## License

MIT. Includes data from the Unicode CLDR, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
