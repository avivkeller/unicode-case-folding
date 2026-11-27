# unicode-east-asian-width

Finds the East_Asian_Width of a character: whether East Asian typography
treats it as wide or narrow, using the latest Unicode Character Database
([EastAsianWidth.txt](https://www.unicode.org/Public/UCD/latest/ucd/EastAsianWidth.txt),
[UAX #11](https://www.unicode.org/reports/tr11/)).

This is the raw property. To measure how many terminal columns a string
takes, with emoji, combining marks and escape codes handled, use
[`unicode-display-width`](../display-width).

## Installation

```sh
npm install unicode-east-asian-width
```

## Usage

```js
import { getEastAsianWidth } from "unicode-east-asian-width";

getEastAsianWidth(0x4e2d); // "W" (中)
getEastAsianWidth(0x41); // "Na" (A)
getEastAsianWidth(0xff21); // "F" (Ａ, fullwidth)
getEastAsianWidth(0xa1); // "A" (¡, wide only in East Asian contexts)
```

The default export is `getEastAsianWidth`, with every export as a property:
`import getEastAsianWidth from "unicode-east-asian-width"`.

## API

### `getEastAsianWidth(codePoint)`

Returns the East_Asian_Width property of a code point:

| Value  | Meaning                                                            |
| ------ | ------------------------------------------------------------------ |
| `"F"`  | Fullwidth: the wide form of a character that also has a narrow one |
| `"H"`  | Halfwidth: the narrow form of a character that is otherwise wide   |
| `"W"`  | Wide, such as ideographs, kana, Hangul syllables and most emoji    |
| `"Na"` | Narrow, such as ASCII                                              |
| `"A"`  | Ambiguous: wide in East Asian legacy contexts, narrow elsewhere    |
| `"N"`  | Neutral: not used in East Asian typography, in practice narrow     |

### `VERSION`

The Unicode version of the data, such as `"18.0.0"`.

## License

MIT. Includes data from the Unicode Character Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
