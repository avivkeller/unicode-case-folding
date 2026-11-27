# unicode-general-category

Finds the General_Category of a character: whether it is a letter, a mark,
a number, punctuation, a symbol, a separator or something else, and of which
kind, using the latest Unicode Character Database
([DerivedGeneralCategory.txt](https://www.unicode.org/Public/UCD/latest/ucd/extracted/DerivedGeneralCategory.txt),
[UAX #44](https://www.unicode.org/reports/tr44/)). JavaScript only offers
this property as regular expression tests, such as `\p{Lu}`, and with the
data of the engine's Unicode version.

## Installation

```sh
npm install unicode-general-category
```

## Usage

```js
import {
  getGeneralCategory,
  getGeneralCategoryName,
  isInCategory,
} from "unicode-general-category";

getGeneralCategory(0x41); // "Lu" (A)
getGeneralCategory(0x1f600); // "So" (😀)
getGeneralCategoryName("Lu"); // "Uppercase_Letter"

isInCategory(0x4e2d, "L"); // true (中 is a letter)
isInCategory(0x4e2d, "Lu"); // false
```

The default export is `getGeneralCategory`, with every export as a property:
`import getGeneralCategory from "unicode-general-category"`.

## API

### `getGeneralCategory(codePoint)`

Returns the two-letter General_Category of a code point, `"Cn"` for
unassigned code points and noncharacters:

| Group           | Categories                               |
| --------------- | ---------------------------------------- |
| `L` Letter      | `Lu`, `Ll`, `Lt`, `Lm`, `Lo`             |
| `M` Mark        | `Mn`, `Mc`, `Me`                         |
| `N` Number      | `Nd`, `Nl`, `No`                         |
| `P` Punctuation | `Pc`, `Pd`, `Ps`, `Pe`, `Pi`, `Pf`, `Po` |
| `S` Symbol      | `Sm`, `Sc`, `Sk`, `So`                   |
| `Z` Separator   | `Zs`, `Zl`, `Zp`                         |
| `C` Other       | `Cc`, `Cf`, `Cs`, `Co`, `Cn`             |

### `getGeneralCategoryName(category)`

Returns the long name of a category or group, such as `"Decimal_Number"`
for `"Nd"` and `"Letter"` for `"L"`.

### `isInCategory(codePoint, category)`

Returns whether a code point is in a category (`"Lu"`) or in a group of
categories: one of the letters above, or `"LC"` for the cased letters
(`Lu`, `Ll` and `Lt`).

### `VERSION`

The Unicode version of the data, such as `"18.0.0"`.

## License

MIT. Includes data from the Unicode Character Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
