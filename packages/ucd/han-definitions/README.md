# unicode-han-definitions

English definitions of Chinese characters, from the Unicode Han Database
([Unihan](https://www.unicode.org/reports/tr38/), the `kDefinition`
field). Useful for tooltips, dictionaries and study tools.

## Installation

```sh
npm install unicode-han-definitions
```

## Usage

```js
import { getDefinition } from "unicode-han-definitions";

getDefinition(0x5c71); // "mountain, hill, peak" (山)
getDefinition(0x4e00); // "one; a, an; alone" (一)
getDefinition(0x41); // undefined
```

`getDefinition` is also the default export, with every export as a
property: `import getDefinition from "unicode-han-definitions"`.

## API

### `getDefinition(codePoint)`

Returns the definition of a character, or `undefined` if it has none.
Unihan defines about 23,000 characters.

Definitions are for modern written Chinese. Major senses are usually
separated by semicolons and minor ones by commas, but both also appear
within a sense, so a definition cannot be split reliably. A sense specific
to another language is marked, such as `(Cant.)` for Cantonese or `(J)`
for Japanese.

### `VERSION`

The Unicode version of the data, such as `"18.0.0"`.

## License

MIT. Includes data from the Unicode Han Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
