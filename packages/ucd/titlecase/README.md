# unicode-titlecase

Titlecasing as defined by the Unicode Standard (toTitlecase, Section 3.13),
generated from the latest Unicode Character Database: the first cased
character of each word is mapped to titlecase, and the rest of the word to
lowercase. Words are found with the Unicode word boundaries (UAX #29), from
the same data, unless you pass your own segmenter.

## Installation

```sh
npm install unicode-titlecase
```

## Usage

```js
import { toTitlecase, isTitlecase, lookupTitlecase } from "unicode-titlecase";

toTitlecase("hello WORLD"); // "Hello World"
toTitlecase("ǆemal"); // "ǅemal" (titlecase digraph)
toTitlecase("ΣΑΣ ΑΣ"); // "Σας Ας" (final sigma)
toTitlecase("istanbul", { locale: "tr" }); // "İstanbul"

isTitlecase("Hello World"); // true
lookupTitlecase(0xdf); // [0x53, 0x73] ("ß" → "Ss")
```

The default export is `toTitlecase`, with every export as a property:
`import toTitlecase from "unicode-titlecase"`.

## API

### `toTitlecase(string, options?)`

Returns the titlecased string. Options:

- `locale`: a string or `Intl.Locale`, used for the Lithuanian, Turkish and
  Azeri casing rules.
- `segmenter`: an object with a `segment(string)` method returning
  `{ segment }` objects that cover the string, such as an
  `Intl.Segmenter`. Each segment is treated as a word.

### `isTitlecase(string, options?)`

Returns whether `toTitlecase()` leaves the string unchanged.

### `lookupTitlecase(codePoint)`

Returns the code points of the full, unconditional titlecase mapping of a
code point, or `undefined` if it maps to itself.

### `VERSION`

The Unicode version of the data, such as `"18.0.0"`.

## License

MIT. Includes data from the Unicode Character Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
