# unicode-hanja-readings

Korean readings of Chinese characters (hanja) in hangul, from the Unicode
Han Database ([Unihan](https://www.unicode.org/reports/tr38/), the
`kHangul` field). Useful for search, sorting and showing readings of hanja
in Korean text.

## Installation

```sh
npm install unicode-hanja-readings
```

## Usage

```js
import { getHanjaReadings, toHangul } from "unicode-hanja-readings";

toHangul("大韓民國"); // "대한민국"
toHangul("漢字 (한자)"); // "한자 (한자)"

getHanjaReadings(0x91d1); // ["금", "김"] (金)
```

The default export is `toHangul`, with every export as a property:
`import toHangul from "unicode-hanja-readings"`.

## API

### `toHangul(text)`

Replaces each Chinese character with its most customary reading and keeps
other text.

### `getHanjaReadings(codePoint)`

Returns the readings of a character as hangul syllables, or an empty array
if it has none. The readings taught in South Korean schools (한문 교육용
기초 한자) come first, then the others in the order of Unihan.

### `VERSION`

The Unicode version of the data, such as `"18.0.0"`.

## Notes

Characters with several readings are read the same way in every word: 樂
is always 락, although 音樂 is 음악. The initial sound rule (두음법칙) is
not applied either: 女子 becomes 녀자, not 여자. Both need a dictionary of
words, which Unihan does not have.

## License

MIT. Includes data from the Unicode Han Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
