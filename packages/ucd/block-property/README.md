# unicode-block-property

Finds the block of a character (Basic Latin, Cyrillic, Emoticons…) and lists
every block with its range, using the latest Unicode Character Database
([Blocks.txt](https://www.unicode.org/Public/UCD/latest/ucd/Blocks.txt)).
Useful for character pickers, font coverage reports and debugging text.

## Installation

```sh
npm install unicode-block-property
```

## Usage

```js
import { getBlock, getBlocks } from "unicode-block-property";

getBlock(0x416); // { name: "Cyrillic", start: 0x400, end: 0x4ff } (Ж)
getBlock(0x1f600)?.name; // "Emoticons" (😀)

getBlocks()[1]; // { name: "Latin-1 Supplement", start: 0x80, end: 0xff }
```

The default export is `getBlock`, with every export as a property:
`import getBlock from "unicode-block-property"`.

## API

### `getBlock(codePoint)`

Returns the block of a code point as `{ name, start, end }`, where `start`
and `end` are its first and last code points, or `undefined` if the code
point is in no block. A block also contains its unassigned code points.

### `getBlocks()`

Returns every block, in code point order.

### `VERSION`

The Unicode version of the data, such as `"18.0.0"`.

## License

MIT. Includes data from the Unicode Character Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
