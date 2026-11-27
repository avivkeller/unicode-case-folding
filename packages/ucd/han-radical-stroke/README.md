# unicode-han-radical-stroke

The radical and the stroke counts of Chinese characters, and sorting in
radical-stroke order as dictionaries do, from the Unicode Han Database
([Unihan](https://www.unicode.org/reports/tr38/), the `kRSUnicode` and
`kTotalStrokes` fields) and the radicals of the Unicode Character Database
([CJKRadicals.txt](https://www.unicode.org/Public/UCD/latest/ucd/CJKRadicals.txt)
and
[EquivalentUnifiedIdeograph.txt](https://www.unicode.org/Public/UCD/latest/ucd/EquivalentUnifiedIdeograph.txt)).

## Installation

```sh
npm install unicode-han-radical-stroke
```

## Usage

```js
import {
  compareRadicalStroke,
  getEquivalentIdeograph,
  getRadicalCharacter,
  getRadicalStroke,
  getTotalStrokes,
} from "unicode-han-radical-stroke";

getRadicalStroke(0x6f22); // 漢
// { radical: 85, residualStrokes: 11, totalStrokes: 14 }

getTotalStrokes(0x9f98); // 48 (龘)

getRadicalCharacter(85); // "⽔" (U+2F54 KANGXI RADICAL WATER)
getEquivalentIdeograph(0x2f54); // "水" (U+6C34)

["水", "林", "一", "人"].sort(compareRadicalStroke); // ["一", "人", "林", "水"]
```

The default export is `getRadicalStroke`, with every export as a property:
`import getRadicalStroke from "unicode-han-radical-stroke"`.

## API

### `getRadicalStroke(codePoint)`

Returns the radical-stroke index of a character, or `undefined` if it has
none:

- `radical`: the Kangxi radical number, from 1 to 214.
- `residualStrokes`: the strokes besides the radical. It is negative for a
  few characters made by removing strokes from a radical.
- `totalStrokes`: every stroke of the character.

A character filed under several radicals gets the first one Unihan lists.

### `getTotalStrokes(codePoint)`

Returns the total number of strokes of a character, or `undefined`.

### `getRadicalCharacter(radical)`

Returns the character of a radical in the Kangxi Radicals block, given its
number.

### `getEquivalentIdeograph(codePoint)`

Returns the ideograph equivalent to a radical or stroke character (`"山"`
for U+2F2D ⼭), or `undefined`. Useful to find text whatever the form of
the radical that was typed.

### `compareRadicalStroke(a, b)`

Compares two strings for `Array.prototype.sort()`, character by character:
by radical (a simplified form after the traditional one), then by residual
strokes, then by code point. Characters without a radical come before the
others, in code point order.

### `VERSION`

The Unicode version of the data, such as `"18.0.0"`.

## Notes

Stroke counts follow the conventions of the IRG, the group that maintains
the Han characters of Unicode. They can differ by a stroke or two from the
counts of a regional dictionary.

## License

MIT. Includes data from the Unicode Han Database and the Unicode Character Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
