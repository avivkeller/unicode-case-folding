# unicode-nfkc-casefolding

NFKC case folding (`toNFKC_Casefold` from the Unicode Standard), generated
from the latest Unicode Character Database. It removes differences of case,
compatibility variants (fullwidth, circled, mathematical and other forms)
and default-ignorable characters (such as soft hyphens and zero-width
joiners), which makes it the recommended way to compare identifiers and
usernames loosely ([UTS #31](https://www.unicode.org/reports/tr31/)).

## How it differs from `unicode-case-folding`

[`unicode-case-folding`](../case-folding) only removes case differences,
and is the right choice for ordinary case-insensitive comparison. This
package goes further: it also treats characters that are only visual or
compatibility variants of each other as equal, and ignores invisible
characters. Its API is the same, so you can switch between them.

| Input                         | `unicode-case-folding` | `unicode-nfkc-casefolding` |
| ----------------------------- | ---------------------- | -------------------------- |
| `"Straße"`                    | `"strasse"`            | `"strasse"`                |
| `"ＡＢＣ"` (fullwidth)        | `"ａｂｃ"`             | `"abc"`                    |
| `"①②"`                        | `"①②"`                 | `"12"`                     |
| `"𝐀𝐁"` (mathematical bold)    | `"𝐀𝐁"`                 | `"ab"`                     |
| `"ad\u00ADmin"` (soft hyphen) | `"ad\u00ADmin"`        | `"admin"`                  |
| `"\u212B"` (Angstrom sign)    | `"å"`                  | `"å"`                      |

## Installation

```sh
npm install unicode-nfkc-casefolding
```

## Usage

```js
import {
  caseFold,
  caseFoldEquals,
  lookupFolding,
} from "unicode-nfkc-casefolding";

caseFold("ＡＤＭＩＮ"); // "admin"
caseFold("①②"); // "12"
caseFold("Straße"); // "strasse"

caseFoldEquals("ad\u00ADmin", "Admin"); // true
lookupFolding(0xad); // [] (removed)
```

## API

### `caseFold(string)`

Maps each character of the string's NFD form with the NFKC_Casefold
property, then normalizes the result to NFC.

### `caseFoldEquals(a, b)`

Returns whether two strings are equal after `caseFold()`.

### `lookupFolding(codePoint)`

Returns the code points a code point maps to (an empty array if it is
removed), or `undefined` if it maps to itself.

### `VERSION`

The Unicode version of the data, such as `"18.0.0"`.

## Notes

Normalization uses the same Unicode version as the folding, not the
JavaScript engine's.

## License

MIT. Includes data from the Unicode Character Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
