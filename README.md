# Unicode packages

Small, dependency-free JavaScript packages built from the official Unicode
data: the [Unicode Character Database](https://www.unicode.org/ucd/) (UCD)
and the [Unicode CLDR](https://cldr.unicode.org/). Each package is a single
tree-shakeable ES module with TypeScript declarations, regenerated from the
latest data every month.

## Packages

### From the Unicode Character Database

| Package                                                     | Description                                                                      |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [`unicode-case-folding`](packages/ucd/case-folding)         | Full case folding, for case-insensitive comparison                               |
| [`unicode-nfkc-casefolding`](packages/ucd/nfkc-casefolding) | NFKC case folding, for loose matching of identifiers and usernames               |
| [`unicode-lowercase`](packages/ucd/lowercase)               | Full lowercase mapping, with Final_Sigma and Lithuanian, Turkish and Azeri rules |
| [`unicode-uppercase`](packages/ucd/uppercase)               | Full uppercase mapping, with Lithuanian, Turkish and Azeri rules                 |
| [`unicode-titlecase`](packages/ucd/titlecase)               | Titlecasing as defined by the Unicode Standard                                   |
| [`unicode-normalize-digits`](packages/ucd/normalize-digits) | Digits of any script to ASCII ("١٢٣" → "123"), and numeric values                |
| [`unicode-display-width`](packages/ucd/display-width)       | How many terminal columns a string takes                                         |
| [`unicode-line-break`](packages/ucd/line-break)             | Line break opportunities (UAX #14)                                               |
| [`unicode-bidi`](packages/ucd/bidi)                         | The Unicode Bidirectional Algorithm (UAX #9)                                     |
| [`unicode-age`](packages/ucd/age)                           | The Unicode version that introduced a character                                  |
| [`unicode-pinyin`](packages/ucd/pinyin)                     | Mandarin readings of Chinese characters, from Unihan                             |

### From the Unicode security data

| Package                                                    | Description                                                                   |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [`unicode-spoof-checker`](packages/security/spoof-checker) | Confusable strings, mixed scripts and identifier restriction levels (UTS #39) |

### From the Unicode CLDR

| Package                                                 | Description                                                                 |
| ------------------------------------------------------- | --------------------------------------------------------------------------- |
| [`cldr-format-name`](packages/cldr/format-name)         | Person name formatting for any locale                                       |
| [`cldr-format-unit`](packages/cldr/format-unit)         | Unit conversion, and measurements in a region's preferred units             |
| [`cldr-number-to-words`](packages/cldr/number-to-words) | Numbers in words ("one hundred twenty-three"), ordinals and numeral systems |
| [`cldr-transliterate`](packages/cldr/transliterate)     | Romanization of other scripts ("Привет" → "Privet")                         |
| [`cldr-ascii-fallback`](packages/cldr/ascii-fallback)   | Readable ASCII for any text ("Crème brûlée" → "Creme brulee")               |
| [`cldr-smart-quotes`](packages/cldr/smart-quotes)       | Locale-correct quotation marks and smart quotes                             |
| [`cldr-text-direction`](packages/cldr/text-direction)   | Whether a locale is written right-to-left                                   |
| [`cldr-week-info`](packages/cldr/week-info)             | First day of the week and weekend of any locale                             |
| [`cldr-region-currency`](packages/cldr/region-currency) | The currency of a region, now or on a date, and its rounding                |
| [`cldr-windows-zones`](packages/cldr/windows-zones)     | Windows time zones ↔ IANA time zones                                        |
| [`cldr-yes-no`](packages/cldr/yes-no)                   | Yes/no answers in any language, for command-line prompts                    |

## Development

```sh
npm install
npm run build   # Build every package (or: npm run build -- <name>...)
npm test        # Test every package
npm run lint
npm run format
```

### Releases

A monthly workflow rebuilds every package from the latest data, compares
each with its latest release on npm, and publishes the ones that changed
with a patch version bump.

## License

The code is MIT licensed. The packages include data from the Unicode
Character Database and CLDR, © Unicode, Inc., under the
[Unicode License v3](https://www.unicode.org/license.txt).
