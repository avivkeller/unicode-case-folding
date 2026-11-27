# unicode-pinyin

Mandarin pinyin readings of Chinese characters, from the Unicode Han
Database ([Unihan](https://www.unicode.org/reports/tr38/), the `kMandarin`
field). Useful for search, sorting and showing readings of Chinese text.

## Installation

```sh
npm install unicode-pinyin
```

## Usage

```js
import { getPinyin, toPinyin } from "unicode-pinyin";

toPinyin("中文"); // "zhōng wén"
toPinyin("你好，世界"); // "nǐ hǎo，shì jiè"
toPinyin("中文", { tone: "number" }); // "zhong1 wen2"
toPinyin("中文", { tone: "none", separator: "" }); // "zhongwen"

getPinyin(0x5973); // "nǚ"
getPinyin(0x5256, { locale: "zh-TW" }); // "pǒ" (pōu in mainland China)
```

## API

### `toPinyin(text, options?)`

Replaces each Chinese character with its reading and keeps other text.
Readings are separated from each other and from adjacent letters and digits
by `options.separator` (default `" "`); punctuation attaches directly.

### `getPinyin(codePoint, options?)`

Returns the reading of a character, or `undefined` if it has none.

### Options

- `tone`: `"mark"` (`zhōng`, the default), `"number"` (`zhong1`; the
  neutral tone gets no number) or `"none"` (`zhong`).
- `locale`: `"zh-TW"` or `"zh-Hant"` uses the readings customary in Taiwan
  where they differ.

### `VERSION`

The Unicode version of the data, such as `"18.0.0"`.

## Notes

Each character gets its most customary reading. Characters with several
readings (多音字) are read the same way in every word; telling them apart
needs a dictionary of words, which Unihan does not have.

## License

MIT. Includes data from the Unicode Han Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
