# unicode-character-properties

Looks up the properties of a character in one place: its general category,
script, block, age, East Asian width and vertical orientation, using the
latest Unicode Character Database
([UAX #44](https://www.unicode.org/reports/tr44/)).

This package has no data of its own. It bundles the six packages below,
re-exports their functions, and adds `getProperties()`, which returns every
property of a code point as one object.

| Functions                                                      | Package                                                                    |
| -------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `getGeneralCategory`, `getGeneralCategoryName`, `isInCategory` | [`unicode-general-category`](../../ucd/general-category)                   |
| `getScript`, `getScriptExtensions`, `hasScript`                | [`unicode-script-property`](../../ucd/script-property)                     |
| `getBlock`, `getBlocks`                                        | [`unicode-block-property`](../../ucd/block-property)                       |
| `getAge`, `getRequiredVersion`, `isAssignedIn`                 | [`unicode-age`](../../ucd/age)                                             |
| `getEastAsianWidth`                                            | [`unicode-east-asian-width-property`](../../ucd/east-asian-width-property) |
| `getVerticalOrientation`                                       | [`unicode-vertical-orientation`](../../ucd/vertical-orientation)           |

## Installation

```sh
npm install unicode-character-properties
```

## Usage

```js
import {
  getBlock,
  getGeneralCategory,
  getProperties,
  getScript,
} from "unicode-character-properties";

getProperties(0x30fc); // ー
// {
//   generalCategory: "Lm",
//   script: "Zyyy",
//   scriptExtensions: ["Hira", "Kana"],
//   block: "Katakana",
//   age: "1.1",
//   eastAsianWidth: "W",
//   verticalOrientation: "Tr",
// }

getGeneralCategory(0x41); // "Lu" (A)
getScript(0x416); // "Cyrl" (Ж)
getBlock(0x1f600).name; // "Emoticons" (😀)
```

The default export is `getProperties`, with every export as a property:
`import getProperties from "unicode-character-properties"`.

## API

### `getProperties(codePoint)`

Returns the properties of a code point:

| Property              | Value                                                         |
| --------------------- | ------------------------------------------------------------- |
| `generalCategory`     | Two letters such as `"Lu"`; `"Cn"` if unassigned              |
| `script`              | ISO 15924 code such as `"Latn"`                               |
| `scriptExtensions`    | Every script the character is used in                         |
| `block`               | Name such as `"Basic Latin"`, or `undefined`                  |
| `age`                 | Unicode version such as `"6.1"`, or `undefined` if unassigned |
| `eastAsianWidth`      | `"F"`, `"H"`, `"W"`, `"Na"`, `"A"` or `"N"`                   |
| `verticalOrientation` | `"U"`, `"R"`, `"Tu"` or `"Tr"`                                |

### Other functions

Documented in the package each comes from, listed above.

### `VERSION`

The Unicode version of the data, such as `"18.0.0"`.

## License

MIT. Includes data from the Unicode Character Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
