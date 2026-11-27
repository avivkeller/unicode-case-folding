# unicode-character-name

Gets the name of a character, such as `LATIN SMALL LETTER A`, and finds a
character by its name, using the latest Unicode Character Database
([DerivedName.txt](https://www.unicode.org/Public/UCD/latest/ucd/extracted/DerivedName.txt),
[NameAliases.txt](https://www.unicode.org/Public/UCD/latest/ucd/NameAliases.txt)
and
[NamedSequences.txt](https://www.unicode.org/Public/UCD/latest/ucd/NamedSequences.txt)).
JavaScript has no access to character names. Useful for character pickers,
debugging invisible or look-alike characters, and `\N{…}`-style escapes.

## Installation

```sh
npm install unicode-character-name
```

## Usage

```js
import { fromName, getAliases, getName } from "unicode-character-name";

getName(0x61); // "LATIN SMALL LETTER A"
getName(0x1f600); // "GRINNING FACE"
getName(0x4e2d); // "CJK UNIFIED IDEOGRAPH-4E2D"
getName(0xd55c); // "HANGUL SYLLABLE HAN"

fromName("GRINNING FACE"); // "😀"
fromName("latin small letter a"); // "a"
fromName("NBSP"); // " ", by an alias
fromName("KEYCAP DIGIT ONE"); // "1️⃣", a named sequence of three characters

getAliases(0x0a)[0]; // { alias: "LINE FEED", type: "control" }
```

The default export is `getName`, with every export as a property:
`import getName from "unicode-character-name"`.

## API

### `getName(codePoint)`

Returns the Name property of a code point, or `undefined` if it has none:
controls, private-use characters, surrogates, noncharacters and unassigned
code points are unnamed. The names of Hangul syllables and of ideographs are
derived from the code point. Controls are known by their aliases.

### `getAliases(codePoint)`

Returns the formal aliases of a code point, as `{ alias, type }`, in the
order of the data. An empty array for most characters. The types are:

| Type             | Aliases                                                      |
| ---------------- | ------------------------------------------------------------ |
| `"correction"`   | Corrections of a name that has a mistake; names never change |
| `"control"`      | Names of control codes, such as `LINE FEED`                  |
| `"alternate"`    | Widely used other names, such as `BYTE ORDER MARK`           |
| `"figment"`      | Documented names of controls that no standard ever approved  |
| `"abbreviation"` | Abbreviations, such as `LF`, `NBSP` and `ZWJ`                |

### `fromName(name)`

Returns the character with a name or an alias, or the string of a
[named sequence](https://www.unicode.org/reports/tr34/), or `undefined` if
there is none.

Names are matched loosely, as specified by
[UAX #44](https://www.unicode.org/reports/tr44/#UAX44-LM2): case, spaces,
underscores and hyphens between two letters or digits are ignored, so
`"zero_width_joiner"` and `"Zero-Width Joiner"` both find U+200D. A hyphen
next to a space is kept, since it tells `TIBETAN LETTER -A` from
`TIBETAN LETTER A`.

The first call builds an index of every name, which takes about 25 ms.

### `VERSION`

The Unicode version of the data, such as `"18.0.0"`.

## License

MIT. Includes data from the Unicode Character Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
