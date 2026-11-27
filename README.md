# Unicode packages

Small, dependency-free JavaScript packages built from the official Unicode
data: the [Unicode Character Database](https://www.unicode.org/ucd/) (UCD),
the emoji, IDNA and security data, and the
[Unicode CLDR](https://cldr.unicode.org/). Each package is a single
tree-shakeable ES module with TypeScript declarations, regenerated from the
latest data every month.

## Packages

### From the Unicode Character Database

| Package                                                                       | Description                                                                      |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [`unicode-case-folding`](packages/ucd/case-folding)                           | Full case folding, for case-insensitive comparison                               |
| [`unicode-nfkc-casefolding`](packages/ucd/nfkc-casefolding)                   | NFKC case folding, for loose matching of identifiers and usernames               |
| [`unicode-lowercase`](packages/ucd/lowercase)                                 | Full lowercase mapping, with Final_Sigma and Lithuanian, Turkish and Azeri rules |
| [`unicode-uppercase`](packages/ucd/uppercase)                                 | Full uppercase mapping, with Lithuanian, Turkish and Azeri rules                 |
| [`unicode-titlecase`](packages/ucd/titlecase)                                 | Titlecasing as defined by the Unicode Standard                                   |
| [`unicode-normalize-digits`](packages/ucd/normalize-digits)                   | Digits of any script to ASCII ("١٢٣" → "123"), and numeric values                |
| [`unicode-display-width`](packages/ucd/display-width)                         | How many terminal columns a string takes                                         |
| [`unicode-line-break`](packages/ucd/line-break)                               | Line break opportunities (UAX #14)                                               |
| [`unicode-bidi`](packages/ucd/bidi)                                           | The Unicode Bidirectional Algorithm (UAX #9)                                     |
| [`unicode-age`](packages/ucd/age)                                             | The Unicode version that introduced a character                                  |
| [`unicode-normalize`](packages/ucd/normalize)                                 | Normalization: NFC, NFD, NFKC and NFKD (UAX #15)                                 |
| [`unicode-text-segmentation`](packages/ucd/text-segmentation)                 | Grapheme cluster, word and sentence boundaries (UAX #29)                         |
| [`unicode-script-property`](packages/ucd/script-property)                     | The script of a character and its script extensions (UAX #24)                    |
| [`unicode-pinyin`](packages/ucd/pinyin)                                       | Mandarin readings of Chinese characters, from Unihan                             |
| [`unicode-character-name`](packages/ucd/character-name)                       | The name of a character, and the character of a name                             |
| [`unicode-general-category`](packages/ucd/general-category)                   | The general category of a character (Lu, Nd, Zs…)                                |
| [`unicode-block-property`](packages/ucd/block-property)                       | The block a character belongs to (Basic Latin, Cyrillic…)                        |
| [`unicode-east-asian-width-property`](packages/ucd/east-asian-width-property) | The East Asian Width of a character (UAX #11)                                    |
| [`unicode-vertical-orientation`](packages/ucd/vertical-orientation)           | Whether a character stays upright in vertical text (UAX #50)                     |
| [`unicode-collation`](packages/ucd/collation)                                 | Sorting in the default Unicode order, with sort keys (UTS #10)                   |
| [`unicode-identifier`](packages/ucd/identifier)                               | Programming language identifiers (UAX #31)                                       |
| [`unicode-link-detection`](packages/ucd/link-detection)                       | Where URLs and email addresses end in text (UTS #58)                             |
| [`unicode-arabic-shaping`](packages/ucd/arabic-shaping)                       | Arabic letters to their joined presentation forms, and back                      |
| [`unicode-hangul-jamo`](packages/ucd/hangul-jamo)                             | Korean syllables to jamo and back, and initial consonant search                  |
| [`unicode-discouraged-sequences`](packages/ucd/discouraged-sequences)         | Finds and fixes the sequences that should not be emitted                         |
| [`unicode-simplified-traditional`](packages/ucd/simplified-traditional)       | Simplified ↔ traditional Chinese characters, from Unihan                         |
| [`unicode-jyutping`](packages/ucd/jyutping)                                   | Cantonese readings of Chinese characters, from Unihan                            |
| [`unicode-kanji-readings`](packages/ucd/kanji-readings)                       | On and kun readings of kanji, from Unihan                                        |
| [`unicode-hanja-readings`](packages/ucd/hanja-readings)                       | Korean readings of Han characters, from Unihan                                   |
| [`unicode-vietnamese-readings`](packages/ucd/vietnamese-readings)             | Vietnamese readings of Han characters, from Unihan                               |
| [`unicode-han-definitions`](packages/ucd/han-definitions)                     | English definitions of Han characters, from Unihan                               |
| [`unicode-han-radical-stroke`](packages/ucd/han-radical-stroke)               | Radical and stroke count of Han characters, and their order                      |
| [`unicode-cangjie`](packages/ucd/cangjie)                                     | Cangjie input codes of Han characters, from Unihan                               |

### Aggregates

Several packages as one.

| Package                                                                    | Description                                                                 |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [`unicode-character-properties`](packages/aggregates/character-properties) | Every property package: category, script, block, age, width and orientation |

### From the Unicode emoji data

| Package                                                           | Description                                            |
| ----------------------------------------------------------------- | ------------------------------------------------------ |
| [`unicode-emoji-pattern`](packages/emoji/emoji-pattern)           | Matches, finds, counts and strips every emoji          |
| [`unicode-emoji-list`](packages/emoji/emoji-list)                 | Every emoji in keyboard order, with its name and group |
| [`unicode-emoji-skin-tone`](packages/emoji/emoji-skin-tone)       | Applies, changes and removes the skin tone of an emoji |
| [`unicode-emoji-presentation`](packages/emoji/emoji-presentation) | Emoji or text presentation of a character (☺️ ↔ ☺︎)     |

### From the Unicode IDNA data

| Package                                      | Description                                          |
| -------------------------------------------- | ---------------------------------------------------- |
| [`unicode-idna`](packages/idna/idna)         | Domain names to ASCII (Punycode) and back (UTS #46)  |
| [`unicode-idna2008`](packages/idna/idna2008) | Whether a domain name is valid under strict IDNA2008 |

### From the Unicode security data

| Package                                                    | Description                                                                   |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [`unicode-spoof-checker`](packages/security/spoof-checker) | Confusable strings, mixed scripts and identifier restriction levels (UTS #39) |

### From the Unicode CLDR

| Package                                                           | Description                                                                 |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [`cldr-format-name`](packages/cldr/format-name)                   | Person name formatting for any locale                                       |
| [`cldr-format-unit`](packages/cldr/format-unit)                   | Unit conversion, and measurements in a region's preferred units             |
| [`cldr-number-to-words`](packages/cldr/number-to-words)           | Numbers in words ("one hundred twenty-three"), ordinals and numeral systems |
| [`cldr-transliterate`](packages/cldr/transliterate)               | Romanization of other scripts ("Привет" → "Privet")                         |
| [`cldr-ascii-fallback`](packages/cldr/ascii-fallback)             | Readable ASCII for any text ("Crème brûlée" → "Creme brulee")               |
| [`cldr-smart-quotes`](packages/cldr/smart-quotes)                 | Locale-correct quotation marks and smart quotes                             |
| [`cldr-text-direction`](packages/cldr/text-direction)             | Whether a locale is written right-to-left                                   |
| [`cldr-week-info`](packages/cldr/week-info)                       | First day of the week and weekend of any locale                             |
| [`cldr-region-currency`](packages/cldr/region-currency)           | The currency of a region, now or on a date, and its rounding                |
| [`cldr-windows-zones`](packages/cldr/windows-zones)               | Windows time zones ↔ IANA time zones                                        |
| [`cldr-yes-no`](packages/cldr/yes-no)                             | Yes/no answers in any language, for command-line prompts                    |
| [`cldr-likely-subtags`](packages/cldr/likely-subtags)             | The likely script and region of a locale ("zh-TW" ↔ "zh-Hant-TW")           |
| [`cldr-locale-matcher`](packages/cldr/locale-matcher)             | The best supported locale for a user's languages                            |
| [`cldr-canonicalize-locale`](packages/cldr/canonicalize-locale)   | Replaces deprecated locale codes ("iw" → "he")                              |
| [`cldr-locale-fallback`](packages/cldr/locale-fallback)           | The fallback chain of a locale ("es-MX" → "es-419" → "es")                  |
| [`cldr-alphabet`](packages/cldr/alphabet)                         | The letters a language is written with, and its index labels                |
| [`cldr-script-info`](packages/cldr/script-info)                   | How to handle a script, and the scripts of a language                       |
| [`cldr-group-gender`](packages/cldr/group-gender)                 | The grammatical gender of a group of people                                 |
| [`cldr-grammatical-features`](packages/cldr/grammatical-features) | The cases, genders and definiteness forms of a language                     |
| [`cldr-region-codes`](packages/cldr/region-codes)                 | Alpha-2 ↔ alpha-3 ↔ numeric region codes                                    |
| [`cldr-region-containment`](packages/cldr/region-containment)     | Whether a country is in a continent, the EU or the eurozone                 |
| [`cldr-region-languages`](packages/cldr/region-languages)         | The languages spoken in a region, and their official status                 |
| [`cldr-subdivision-names`](packages/cldr/subdivision-names)       | Names of states and provinces ("US-CA" → "California")                      |
| [`cldr-metazones`](packages/cldr/metazones)                       | Metazones of IANA time zones, for time zone pickers                         |
| [`cldr-hour-cycle`](packages/cldr/hour-cycle)                     | Whether a locale uses the 12-hour or the 24-hour clock                      |
| [`cldr-preferred-calendars`](packages/cldr/preferred-calendars)   | The calendars used in the region of a locale                                |

## Development

```sh
npm install
npm run build   # Build every package (or: npm run build -- <name>...)
npm test        # Test every package
npm run lint
npm run format
```

A package can import another one by its name, such as
`import { toTitlecase } from "unicode-titlecase"`: the build bundles it, so
the published packages stay dependency-free.

The default export of a package is its main function, with every named
export as a property: `transliterate()`, `transliterate.toLatin()`,
`transliterate.VERSION`.

### Specifications

A package that implements an algorithm of a Unicode report, rather than
only reading its data, records the revision it was checked against in the
`specs` of its `package.json`:

```json
"specs": { "https://www.unicode.org/reports/tr29/": 49 }
```

Every week, the [Spec Changes workflow](.github/workflows/spec-changes.yml)
opens an issue for each report with a newer revision, listing the packages
to review. Once they are up to date, record the new revision:

```sh
npm run specs                         # List the reports that changed
npm run specs -- --update <package>   # Record their latest revisions
```

### Releases

Packages are released in two ways, both by the
[Release workflow](.github/workflows/bump-version.yml):

- **New data.** Every month, the workflow rebuilds every package from the
  latest data, compares each with its latest release on npm, and publishes
  the ones that changed with a patch version bump, without a pull request.
- **Changes made by people.** A pull request that changes a package adds a
  changeset, always a minor one:

  ```sh
  npx changeset add --minor <package> -m "What changed, for the users of the package"
  ```

  With changesets on `main`, the workflow keeps a "Version Packages" pull
  request open, which bumps the versions and writes the changelogs. Merging
  it publishes the packages. Until then, the monthly release skips the
  packages that have a changeset.

A new package is published once by hand (`npm publish packages/…/dist`),
then set up for trusted publishing from the Release workflow.

## License

The code is MIT licensed. The packages include data from the Unicode
Character Database and CLDR, © Unicode, Inc., under the
[Unicode License v3](https://www.unicode.org/license.txt).
