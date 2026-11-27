# unicode-jyutping

Cantonese jyutping readings of Chinese characters, from the Unicode Han
Database ([Unihan](https://www.unicode.org/reports/tr38/), the `kCantonese`
field). Useful for search, sorting and showing readings of Chinese text.

## Installation

```sh
npm install unicode-jyutping
```

## Usage

```js
import { getJyutping, toJyutping } from "unicode-jyutping";

toJyutping("香港"); // "hoeng1 gong2"
toJyutping("你好，世界"); // "nei5 hou2，sai3 gaai3"
toJyutping("香港", { tone: "none", separator: "" }); // "hoenggong"

getJyutping(0x7cb5); // "jyut6" (粵)
```

The default export is `toJyutping`, with every export as a property:
`import toJyutping from "unicode-jyutping"`.

## API

### `toJyutping(text, options?)`

Replaces each Chinese character with its reading and keeps other text.
Readings are separated from each other and from adjacent letters and digits
by `options.separator` (default `" "`); punctuation attaches directly.

### `getJyutping(codePoint, options?)`

Returns the reading of a character, or `undefined` if it has none.

### Options

- `tone`: `"number"` (`hoeng1`, the default) or `"none"` (`hoeng`).

### `VERSION`

The Unicode version of the data, such as `"18.0.0"`.

## Notes

Each character gets its most customary reading. Characters with several
readings are read the same way in every word; telling them apart needs a
dictionary of words, which Unihan does not have.

## License

MIT. Includes data from the Unicode Han Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
