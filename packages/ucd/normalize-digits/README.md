# unicode-normalize-digits

Converts the decimal digits of every script to ASCII `0`–`9`, and looks up
the numeric value of any character, using the latest Unicode Character
Database. Useful for parsing numbers typed with non-Latin digits, where
`Number("١٢٣")` is `NaN`.

## Installation

```sh
npm install unicode-normalize-digits
```

## Usage

```js
import { getNumericValue, normalizeDigits } from "unicode-normalize-digits";

normalizeDigits("١٢٣"); // "123" (Arabic-Indic)
normalizeDigits("۱۲۳"); // "123" (Persian)
normalizeDigits("१२३"); // "123" (Devanagari)
normalizeDigits("１２３"); // "123" (fullwidth)
Number(normalizeDigits("٤٢")); // 42

getNumericValue(0xbd); // 0.5 ("½")
getNumericValue(0x216b); // 12 ("Ⅻ")
getNumericValue(0x4e07); // 10000 ("万")
```

## API

### `normalizeDigits(text)`

Replaces every decimal digit (general category Nd) with the ASCII digit of
the same value. Other characters, including other kinds of numbers such as
"½", "²" or "万", are unchanged.

### `getDigitValue(codePoint)`

Returns the value (0–9) of a decimal digit of any script, or `undefined`.

### `getNumericValue(codePoint)`

Returns the numeric value of any character that has one: digits,
fractions, Roman numerals, CJK numerals and other numbers. Returns
`undefined` otherwise.

### `VERSION`

The Unicode version of the data, such as `"18.0.0"`.

## License

MIT. Includes data from the Unicode Character Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
