# unicode-vietnamese-readings

Vietnamese readings of Chinese characters (Hán Nôm) in the Vietnamese
alphabet, from the Unicode Han Database
([Unihan](https://www.unicode.org/reports/tr38/), the `kVietnamese`
field). Useful for search, sorting and showing readings of Hán Nôm text.

## Installation

```sh
npm install unicode-vietnamese-readings
```

## Usage

```js
import {
  getVietnameseReadings,
  toVietnamese,
} from "unicode-vietnamese-readings";

toVietnamese("越南"); // "việt nam"
toVietnamese("大學", { separator: "-" }); // "đại-học"

getVietnameseReadings(0x62d1); // ["kiềm", "cùm"] (拑)
```

The default export is `toVietnamese`, with every export as a property:
`import toVietnamese from "unicode-vietnamese-readings"`.

## API

### `toVietnamese(text, options?)`

Replaces each Chinese character with its first reading and keeps other
text. Readings are separated from each other and from adjacent letters and
digits by `options.separator` (default `" "`); punctuation attaches
directly.

### `getVietnameseReadings(codePoint)`

Returns the readings of a character in the order of Unihan, or an empty
array if it has none.

### `VERSION`

The Unicode version of the data, such as `"18.0.0"`.

## Notes

Unihan has Vietnamese readings for about 8,300 characters. A character
with several readings is read the same way in every word.

## License

MIT. Includes data from the Unicode Han Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
