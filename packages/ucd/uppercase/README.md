# unicode-uppercase

Full Unicode uppercase mapping, generated from the latest Unicode Character
Database. It implements the default case conversion of the Unicode Standard
(Section 3.13), including multi-character mappings, context-sensitive rules
and the language-specific rules of Lithuanian, Turkish and Azeri from
SpecialCasing.txt.

`String.prototype.toUpperCase()` does the same with the JavaScript engine's
Unicode version; this package always uses the latest Unicode release, gives
the same results in every engine, and looks up single code points.

## Installation

```sh
npm install unicode-uppercase
```

## Usage

```js
import { toUppercase, isUppercase, lookupUppercase } from "unicode-uppercase";

toUppercase("straße"); // "STRASSE"
toUppercase("ﬁx"); // "FIX"
toUppercase("istanbul", { locale: "tr" }); // "İSTANBUL"

isUppercase("STRASSE"); // true
```

The default export is `toUppercase`, with every export as a property:
`import toUppercase from "unicode-uppercase"`.

## API

### `toUppercase(string, options?)`

Returns the uppercase form of a string. Set `options.locale` (a string or
`Intl.Locale`) to apply language-specific rules; other locales use the
default rules.

### `isUppercase(string, options?)`

Returns whether `toUppercase()` leaves the string unchanged.

### `lookupUppercase(codePoint)`

Returns the code points of the full, unconditional uppercase mapping of a code
point, or `undefined` if it maps to itself.

### `VERSION`

The Unicode version of the data, such as `"18.0.0"`.

## License

MIT. Includes data from the Unicode Character Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
