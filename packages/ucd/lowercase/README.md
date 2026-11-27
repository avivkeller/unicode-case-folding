# unicode-lowercase

Full Unicode lowercase mapping, generated from the latest Unicode Character
Database. It implements the default case conversion of the Unicode Standard
(Section 3.13), including multi-character mappings, context-sensitive rules
and the language-specific rules of Lithuanian, Turkish and Azeri from
SpecialCasing.txt.

`String.prototype.toLowerCase()` does the same with the JavaScript engine's
Unicode version; this package always uses the latest Unicode release, gives
the same results in every engine, and looks up single code points.

## Installation

```sh
npm install unicode-lowercase
```

## Usage

```js
import { toLowercase, isLowercase, lookupLowercase } from "unicode-lowercase";

toLowercase("HELLO Wörld"); // "hello wörld"
toLowercase("ΟΔΥΣΣΕΥΣ"); // "οδυσσευς"
toLowercase("Iİ", { locale: "tr" }); // "ıi"

isLowercase("hello wörld"); // true
```

The default export is `toLowercase`, with every export as a property:
`import toLowercase from "unicode-lowercase"`.

## API

### `toLowercase(string, options?)`

Returns the lowercase form of a string. Set `options.locale` (a string or
`Intl.Locale`) to apply language-specific rules; other locales use the
default rules.

### `isLowercase(string, options?)`

Returns whether `toLowercase()` leaves the string unchanged.

### `lookupLowercase(codePoint)`

Returns the code points of the full, unconditional lowercase mapping of a code
point, or `undefined` if it maps to itself.

### `VERSION`

The Unicode version of the data, such as `"18.0.0"`.

## License

MIT. Includes data from the Unicode Character Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
