# cldr-number-to-words

Spell out numbers in words for any locale, using the rule-based number
formats (RBNF) of the [Unicode CLDR](https://cldr.unicode.org/): cardinals
("one hundred twenty-three"), ordinals ("twenty-first", "21st"), years
("nineteen ninety-nine"), grammatical genders and cases, and numbering
systems such as roman numerals.

The rules are compiled from CLDR at build time, so formatting needs no
parsing at run time, and the output matches ICU's `RuleBasedNumberFormat`
(the implementation behind CLDR's data), with the difference that integers
of any size are handled exactly.

## Installation

```bash
npm install cldr-number-to-words
```

## Usage

```javascript
import { getRuleSets, numberToWords } from "cldr-number-to-words";

numberToWords(123, "en"); // "one hundred twenty-three"
numberToWords(-36.5, "en"); // "minus thirty-six point five"
numberToWords(21, "en", { ruleSet: "spellout-ordinal" }); // "twenty-first"
numberToWords(21, "en", { ruleSet: "digits-ordinal" }); // "21st"
numberToWords(1999, "en", { ruleSet: "spellout-numbering-year" }); // "nineteen ninety-nine"
numberToWords(1984, "en", { ruleSet: "roman-upper" }); // "MCMLXXXIV"

numberToWords(97, "fr"); // "quatre-vingt-dix-sept"
numberToWords(80, "fr-CH"); // "huitante"
numberToWords(2, "ru", { ruleSet: "spellout-cardinal-feminine" }); // "две"
numberToWords(10000, "ja"); // "一万"
numberToWords(9007199254740993n, "en"); // "nine quadrillion seven trillion … ninety-three"

getRuleSets("de"); // ["spellout-numbering-year", "spellout-numbering", …]
```

The default export is `numberToWords`, with every export as a property:
`import numberToWords from "cldr-number-to-words"`.

## API

### numberToWords(value, locale, options?)

Formats `value` (a number or a bigint) with a rule set of `locale` (a string
or an `Intl.Locale`).

- `options.ruleSet` - The rule set to use (default `"spellout-numbering"`).
  Which ones exist depends on the locale; see `getRuleSets()`. Common ones
  are `spellout-cardinal`, `spellout-ordinal`, `spellout-numbering-year` and
  `digits-ordinal`, gendered variants such as `spellout-cardinal-feminine`,
  and the numbering systems `roman-upper`, `roman-lower`, `hebrew`,
  `greek-lower`, `armenian-upper`, `georgian`, `ethiopic` and `tamil`.

Throws a `RangeError` for rule sets the locale does not have.

### getRuleSets(locale)

Returns the names of the rule sets available for a locale.

### VERSION

The version of CLDR the data comes from, e.g. `"49.0.0"`.

## Notes

- Locales fall back to their CLDR parent locales (`es-MX` uses `es-419`,
  `de-AT` uses `de`) and finally to the root locale, which formats numbers
  as digits.
- Number symbols (such as the decimal separator inside `"1,234th"`) and
  plural rules come from the JavaScript engine's `Intl` data.
- Numbers beyond the largest rule (10<sup>18</sup> in most locales) are
  formatted as digits, as in CLDR.

## License

MIT. Includes data from the Unicode CLDR, © Unicode, Inc., under the
[Unicode License v3](https://www.unicode.org/license.txt).
