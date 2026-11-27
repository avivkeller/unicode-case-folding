# unicode-kanji-readings

Japanese readings of kanji in kana, from the Unicode Han Database
([Unihan](https://www.unicode.org/reports/tr38/), the `kJapanese` field):
the Sino-Japanese on readings (音読み) and the native kun readings (訓読み).
Useful for search, sorting, dictionaries and study tools.

## Installation

```sh
npm install unicode-kanji-readings
```

## Usage

```js
import { getKanjiReadings } from "unicode-kanji-readings";

getKanjiReadings(0x5c71); // { on: ["サン", "セン"], kun: ["やま"] } (山)
getKanjiReadings(0x672c); // { on: ["ホン"], kun: ["もと"] } (本)
getKanjiReadings(0x41); // undefined
```

`getKanjiReadings` is also the default export, with every export as a
property: `import getKanjiReadings from "unicode-kanji-readings"`.

## API

### `getKanjiReadings(codePoint)`

Returns the readings of a kanji as `{ on, kun }`, or `undefined` if it
has none. On readings are in katakana and kun readings in hiragana, each in
the order of Unihan. Kun readings are dictionary forms with their okurigana
and no mark of where it starts, such as `"いきる"` for 生.

### `VERSION`

The Unicode version of the data, such as `"18.0.0"`.

## Notes

How a kanji is read depends on the word it is in, so this package has no
function that converts text: that needs a dictionary of words, which Unihan
does not have. The older `kJapaneseOn` and `kJapaneseKun` fields, which
romanize the readings of fewer characters, are not used.

## License

MIT. Includes data from the Unicode Han Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
