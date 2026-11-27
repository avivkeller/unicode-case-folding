# unicode-line-break

The [Unicode Line Breaking Algorithm](https://www.unicode.org/reports/tr14/)
(UAX #14), generated from the latest Unicode Character Database. It finds
where text may be wrapped onto a new line, and where it must be: after
spaces but not before punctuation, never inside numbers such as "$(12.35)"
or emoji sequences, and between most Chinese and Japanese characters.

It implements the default rules of UAX #14, without tailoring. Characters
whose class depends on the language or on a dictionary are resolved as rule
LB1 says to without more information: ambiguous characters (AI) act as
letters, small kana (CJ) as nonstarters, and the letters of Thai, Lao,
Khmer and Burmese (SA) as letters, so text in those languages only breaks at
spaces and punctuation.

## Installation

```sh
npm install unicode-line-break
```

## Usage

```js
import { findLineBreaks, splitAtLineBreaks } from "unicode-line-break";

findLineBreaks("Hello world\nBye");
// [
//   { index: 6, required: false },
//   { index: 12, required: true },
//   { index: 15, required: true },
// ]

splitAtLineBreaks("e.g. $(12.35) or 50%-off");
// ["e.g. ", "$(12.35) ", "or ", "50%-", "off"]
splitAtLineBreaks("A long-awaited “quote”");
// ["A ", "long-", "awaited ", "“quote”"]
splitAtLineBreaks("これは「引用」です。");
// ["こ", "れ", "は", "「引", "用」", "で", "す。"]
splitAtLineBreaks("Flags 🇯🇵🇺🇸 and 👋🏽!");
// ["Flags ", "🇯🇵", "🇺🇸 ", "and ", "👋🏽!"]
```

Wrapping text to a width, here measured in UTF-16 code units:

```js
function wrap(text, width) {
  const lines = [];
  let start = 0; // Start of the current line
  let end = 0; // Last break opportunity in the current line
  for (const { index, required } of findLineBreaks(text)) {
    if (index - start > width && end > start) {
      lines.push(text.slice(start, end).trimEnd());
      start = end;
    }
    if (required) {
      lines.push(text.slice(start, index).trimEnd());
      start = index;
    }
    end = index;
  }
  return lines;
}

wrap("The quick brown fox jumps over the lazy dog.\nA second paragraph.", 16);
// ["The quick brown", "fox jumps over", "the lazy dog.", "A second", "paragraph."]
```

The default export is `findLineBreaks`, with every export as a property:
`import findLineBreaks from "unicode-line-break"`.

## API

### `findLineBreaks(string)`

Returns the line break opportunities of a string, in order, as objects with
two properties:

- `index`: the UTF-16 offset of the break. A line may end after
  `string.slice(0, index)`.
- `required`: whether the line must end there: after a hard line break
  (such as `"\n"`, `"\r\n"` or U+2028 LINE SEPARATOR) and at the end of the
  string. Other breaks are opportunities.

A string that is not empty always ends with a required break; an empty
string has no breaks.

### `splitAtLineBreaks(string)`

Splits a string at its line break opportunities. Each segment keeps the
spaces and line terminators at its end, so the segments join back to the
string.

### `VERSION`

The Unicode version of the data, such as `"18.0.0"`.

## Conformance

The package passes every case of the Unicode line breaking test,
[LineBreakTest.txt](https://www.unicode.org/Public/UCD/latest/ucd/auxiliary/LineBreakTest.txt).

## License

MIT. Includes data from the Unicode Character Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
