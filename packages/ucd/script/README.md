# unicode-script-property

Finds the script of a character (Latin, Cyrillic, Han…) and the scripts it
is used in, using the latest Unicode Character Database
([Scripts.txt](https://www.unicode.org/Public/UCD/latest/ucd/Scripts.txt) and
[ScriptExtensions.txt](https://www.unicode.org/Public/UCD/latest/ucd/ScriptExtensions.txt),
[UAX #24](https://www.unicode.org/reports/tr24/)). JavaScript only offers
these properties as regular expression tests, such as `\p{Script=Latin}`,
and with the data of the engine's Unicode version.

## Installation

```sh
npm install unicode-script-property
```

## Usage

```js
import {
  getScript,
  getScriptExtensions,
  hasScript,
} from "unicode-script-property";

getScript(0x416); // "Cyrl" (Ж)
getScript(0x1f600); // "Zyyy" (😀, common to all scripts)

// The prolonged sound mark "ー" is used in both Japanese syllabaries
getScriptExtensions(0x30fc); // ["Hira", "Kana"]
hasScript(0x30fc, "Hira"); // true
```

## API

Scripts are [ISO 15924](https://www.unicode.org/iso15924/) codes, such as
`"Latn"`.

### `getScript(codePoint)`

Returns the Script property of a code point: `"Zyyy"` for characters common
to all scripts, `"Zinh"` for marks that inherit the script of their base,
and `"Zzzz"` for unassigned code points.

### `getScriptExtensions(codePoint)`

Returns the Script_Extensions property: the sorted list of scripts a code
point is used in. For most characters, it is only their script.

### `hasScript(codePoint, script)`

Returns whether a script is among the Script_Extensions of a code point.

### `VERSION`

The Unicode version of the data, such as `"18.0.0"`.

## License

MIT. Includes data from the Unicode Character Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
