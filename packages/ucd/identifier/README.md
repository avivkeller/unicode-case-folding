# unicode-identifier

Checks identifiers of programming languages, query languages and file
formats in any script, with the default identifier syntax of Unicode
Identifiers and Syntax ([UAX #31](https://www.unicode.org/reports/tr31/))
and the latest Unicode Character Database
([DerivedCoreProperties.txt](https://www.unicode.org/Public/UCD/latest/ucd/DerivedCoreProperties.txt)
and [PropList.txt](https://www.unicode.org/Public/UCD/latest/ucd/PropList.txt)).
JavaScript only offers these properties as regular expression tests, such as
`\p{XID_Start}`, and with the data of the engine's Unicode version.

To find whether an identifier can be confused with another one, or mixes
scripts, see
[`unicode-spoof-checker`](https://www.npmjs.com/package/unicode-spoof-checker).

## Installation

```sh
npm install unicode-identifier
```

## Usage

```js
import {
  isIdentifier,
  isIdentifierContinue,
  isIdentifierStart,
} from "unicode-identifier";

isIdentifier("переменная"); // true
isIdentifier("2fast"); // false
isIdentifier("kebab-case", { extraContinue: "-" }); // true

// JavaScript identifiers
isIdentifier("$el", {
  xid: false,
  extraStart: "$_",
  extraContinue: "‌‍",
}); // true

isIdentifierStart(0x3c0); // true (π)
isIdentifierContinue(0x31); // true (1)
```

The default export is `isIdentifier`, with every export as a property:
`import isIdentifier from "unicode-identifier"`.

## API

### `isIdentifier(text, options?)`

Returns whether a text is an identifier: one character that can start an
identifier, then any number of characters that can continue one
([UAX31-R1](https://www.unicode.org/reports/tr31/#R1)). The text is not
normalized; use NFC for case-sensitive identifiers and NFKC for
case-insensitive ones.

### `isIdentifierStart(codePoint, options?)`

Returns whether a code point can start an identifier: the XID_Start
property, such as letters.

### `isIdentifierContinue(codePoint, options?)`

Returns whether a code point can continue an identifier: the `XID_Continue`
property, which adds digits, combining marks and connector punctuation such
as the low line.

### Options

- `xid` (default `true`): use XID_Start and XID_Continue, which stay
  identifiers when normalized to NFKC. With `false`, use ID_Start and
  ID_Continue, as JavaScript does.
- `extraStart` (`isIdentifier` only): more characters to allow anywhere,
  such as `"$_"`.
- `extraContinue` (`isIdentifier` only): more characters to allow after the
  first one, such as `"-"`.

### `isPatternSyntax(codePoint)`

Returns the Pattern_Syntax property: whether a code point is reserved for
the syntax of patterns and languages, such as `+` or `→`. The property never
changes between versions of Unicode.

### `isPatternWhiteSpace(codePoint)`

Returns the Pattern_White_Space property: whether a code point is white
space between tokens, which also never changes.

### `VERSION`

The Unicode version of the data, such as `"18.0.0"`.

## License

MIT. Includes data from the Unicode Character Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
