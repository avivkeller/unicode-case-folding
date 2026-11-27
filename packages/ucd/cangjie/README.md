# unicode-cangjie

Cangjie input method codes of Chinese characters, from the Unicode Han
Database ([Unihan](https://www.unicode.org/reports/tr38/), the `kCangjie`
field). Useful for showing how to type a character and for teaching the
input method.

## Installation

```sh
npm install unicode-cangjie
```

## Usage

```js
import { getCangjie, toCangjieRadicals } from "unicode-cangjie";

getCangjie(0x660e); // "AB" (明)
toCangjieRadicals("AB"); // "日月"
```

The default export is `getCangjie`, with every export as a property:
`import getCangjie from "unicode-cangjie"`.

## API

### `getCangjie(codePoint)`

Returns the Cangjie code of a character as the letters of its keys, or
`undefined` if it has none.

### `toCangjieRadicals(code)`

Converts the letters of a code to the radicals printed on the keys: A is 日, B is 月, and so
on to Y (卜), with X (難) for characters that are hard to decompose and Z
(重) for the special key. Lowercase letters are accepted.

### `VERSION`

The Unicode version of the data, such as `"18.0.0"`.

## License

MIT. Includes data from the Unicode Han Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
