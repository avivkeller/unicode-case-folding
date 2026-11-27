# unicode-normalize

[Unicode normalization](https://www.unicode.org/reports/tr15/) (UAX #15),
generated from the latest Unicode Character Database. It converts strings to
the four normalization forms, NFC, NFD, NFKC and NFKD, so that texts that
mean the same compare equal: "é" as one character and as "e" followed by a
combining accent, or, in the compatibility forms, "ﬁ" and "fi".

`String.prototype.normalize()` does the same with the data of the
JavaScript engine, so its results depend on the engine's Unicode version.
This package gives the same results everywhere. For example, with the data
of Unicode 18, `normalize("\u209D", "NFKC")` is `"w"`, while an engine with
Unicode 17 leaves that character as it is.

## Installation

```sh
npm install unicode-normalize
```

## Usage

```js
import {
  getCombiningClass,
  isNormalized,
  lookupDecomposition,
  normalize,
} from "unicode-normalize";

normalize("e\u0301"); // "\u00E9" (é)
normalize("\u00E9", "NFD"); // "e\u0301"
normalize("\uFB01", "NFKC"); // "fi"
normalize("x\u00B2", "NFKC"); // "x2"
normalize("한", "NFD"); // "\u1112\u1161\u11AB"
normalize("\u1112\u1161\u11AB"); // "\uD55C" (한)

// Combining marks are put in canonical order
normalize("a\u0301\u0323", "NFD"); // "a\u0323\u0301"
normalize("q\u0307\u0323"); // "q\u0323\u0307"

isNormalized("\u00E9"); // true
isNormalized("e\u0301"); // false
isNormalized("e\u0301", "NFD"); // true

lookupDecomposition(0x1e69); // [0x73, 0x323, 0x307] (ṩ)
lookupDecomposition(0xfb01); // undefined
lookupDecomposition(0xfb01, { compatibility: true }); // [0x66, 0x69]

getCombiningClass(0x301); // 230
getCombiningClass(0x323); // 220
```

The four forms of "ẛ̣" (`"\u1E9B\u0323"`):

| Form | Result                 |
| ---- | ---------------------- |
| NFC  | `"\u1E9B\u0323"`       |
| NFD  | `"\u017F\u0323\u0307"` |
| NFKC | `"\u1E69"`             |
| NFKD | `"s\u0323\u0307"`      |

The default export is `normalize`, with every export as a property:
`import normalize from "unicode-normalize"`.

## API

### `normalize(string, form = "NFC")`

Returns the string in the normalization form `"NFC"`, `"NFD"`, `"NFKC"` or
`"NFKD"`. A string that is already in that form is returned as it is. Lone
surrogates are kept.

Throws a `TypeError` if the input is not a string, and a `RangeError` for
any other form.

### `isNormalized(string, form = "NFC")`

Returns whether the string is in the normalization form, that is whether
`normalize()` would return it unchanged.

### `lookupDecomposition(codePoint, { compatibility = false })`

Returns the full decomposition of a code point, as the code points of its
NFD form, or of its NFKD form with `compatibility: true`. Returns
`undefined` if the code point does not decompose. Hangul syllables
decompose to their jamo.

### `getCombiningClass(codePoint)`

Returns the Canonical_Combining_Class of a code point, from 0 to 254. It is
0 for starters, which is most characters; combining marks with other
classes are sorted by class in every normalization form.

### `VERSION`

The Unicode version of the data, such as `"18.0.0"`.

## Conformance

The package passes every case of the Unicode normalization test,
[NormalizationTest.txt](https://www.unicode.org/Public/UCD/latest/ucd/NormalizationTest.txt).

## License

MIT. Includes data from the Unicode Character Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
