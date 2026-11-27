# unicode-vertical-orientation

Tells whether a character stays upright or is rotated sideways when text is
set vertically, as in Japanese and Chinese, using the latest Unicode
Character Database
([VerticalOrientation.txt](https://www.unicode.org/Public/UCD/latest/ucd/VerticalOrientation.txt),
[UAX #50](https://www.unicode.org/reports/tr50/)). It is the data behind
CSS `text-orientation: mixed`, for renderers that lay out vertical text
themselves: canvas, PDF, SVG and terminals.

## Installation

```sh
npm install unicode-vertical-orientation
```

## Usage

```js
import { getVerticalOrientation } from "unicode-vertical-orientation";

getVerticalOrientation(0x65e5); // "U" (日 stays upright)
getVerticalOrientation(0x41); // "R" (A is rotated)
getVerticalOrientation(0x3001); // "Tu" (、 needs a vertical glyph)
```

The default export is `getVerticalOrientation`, with every export as a property:
`import getVerticalOrientation from "unicode-vertical-orientation"`.

## API

### `getVerticalOrientation(codePoint)`

Returns the Vertical_Orientation property of a code point:

| Value  | Meaning                                                                |
| ------ | ---------------------------------------------------------------------- |
| `"U"`  | Upright, as in horizontal text                                         |
| `"R"`  | Rotated 90° clockwise                                                  |
| `"Tu"` | Needs a different glyph in vertical text; upright if the font has none |
| `"Tr"` | Needs a different glyph in vertical text; rotated if the font has none |

### `VERSION`

The Unicode version of the data, such as `"18.0.0"`.

## License

MIT. Includes data from the Unicode Character Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
