# cldr-script-info

Tells how the text of a writing system has to be handled, with the script
metadata of the [Unicode CLDR](https://cldr.unicode.org/): whether a script
has uppercase letters, whether typing it takes an input method, whether
lines break between any two characters, whether it needs text shaping, and
which character can stand for it in a font menu. Also tells which scripts
a language is written in.

For the script of a character, see
[`unicode-script-property`](https://www.npmjs.com/package/unicode-script-property),
and for the direction of a script,
[`cldr-text-direction`](https://www.npmjs.com/package/cldr-text-direction).

## Installation

```sh
npm install cldr-script-info
```

## Usage

```js
import {
  getScriptInfo,
  getBaseScripts,
  getLanguageScripts,
} from "cldr-script-info";

getScriptInfo("Arab");
// {
//   sampleCharacter: "ب",
//   hasCase: false,
//   needsInputMethod: false,
//   breaksBetweenLetters: false,
//   shaping: "required",
// }

getScriptInfo("Thai").breaksBetweenLetters; // true: no spaces between words
getScriptInfo("Hani").needsInputMethod; // true
getScriptInfo("Deva").hasCase; // false: "text-transform: uppercase" does nothing

getBaseScripts("Jpan"); // ["Hani", "Hira", "Kana"]
getLanguageScripts("sr").primary; // ["Cyrl", "Latn"]
```

The default export is `getScriptInfo`, with every export as a property:
`import getScriptInfo from "cldr-script-info"`.

## API

Scripts are [ISO 15924](https://www.unicode.org/iso15924/) codes, such as
`"Latn"`, in any case.

### `getScriptInfo(script)`

Returns the properties of a script, or `undefined` if CLDR has no data for
it. A property that is unknown, as those of `"Zyyy"` (common), is
`undefined`.

| Property               |                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| `sampleCharacter`      | A character that stands for the script, as in a font of last resort                                           |
| `hasCase`              | Whether uppercase and lowercase are customary                                                                 |
| `needsInputMethod`     | Whether typing the major languages of the script takes an input method (IME)                                  |
| `breaksBetweenLetters` | Whether lines break between letters, not only at spaces                                                       |
| `shaping`              | `"required"` if letters join, reorder or change form, `"minimal"` if only marks are positioned, else `"none"` |

### `getBaseScripts(script)`

Returns the scripts that a code stands for: those that a script combines
(`"Jpan"`, `"Kore"`), is a subset of (`"Hans"`, `"Hant"`) or is a style of
(`"Aran"`, Arabic in Nastaliq style). Any other script is returned alone.

### `getLanguageScripts(locale)`

Returns `{ primary, secondary }` for the language of a BCP 47 language tag
or `Intl.Locale`: the scripts in customary modern use, then the historic
and less common ones. Both are empty for a language without data.

### `VERSION`

The CLDR version of the data, such as `"49.0.0"`.

## License

MIT. Includes data from the Unicode CLDR, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
