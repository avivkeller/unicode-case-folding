# unicode-case-folding

Full Unicode case folding, generated from the latest
[CaseFolding.txt](https://www.unicode.org/Public/UCD/latest/ucd/CaseFolding.txt).

Case folding removes case distinctions so that strings can be compared
case-insensitively. Unlike `toLowerCase()`, it follows the Unicode rules
designed for comparison: "ß", "ẞ" and "SS" all fold to "ss".

## Installation

```sh
npm install unicode-case-folding
```

## Usage

```js
import { caseFold, caseFoldEquals, lookupFolding } from "unicode-case-folding";

caseFold("Hello World"); // "hello world"
caseFold("Straße"); // "strasse"

caseFoldEquals("HELLO", "hello"); // true
caseFoldEquals("ẞ", "ss"); // true

lookupFolding(0xdf); // [0x73, 0x73] ("ß" → "ss")
```

## API

### `caseFold(string)`

Returns the string with full case folding (the C and F mappings) applied.

### `caseFoldEquals(string1, string2)`

Returns whether two strings are equal after case folding.

### `lookupFolding(codePoint)`

Returns the code points a code point folds to, or `undefined` if it folds
to itself.

### `VERSION`

The Unicode version of the data, such as `"18.0.0"`.

## License

MIT. Includes data from the Unicode Character Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
