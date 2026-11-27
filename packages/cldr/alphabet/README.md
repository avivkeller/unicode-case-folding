# cldr-alphabet

Gives the alphabet of a language: the letters it is written with, in its
alphabetical order, and the labels of its alphabetical index, from the
exemplar characters of the [Unicode CLDR](https://cldr.unicode.org/)
([UTS #35](https://www.unicode.org/reports/tr35/tr35-general.html#Character_Elements)).
Useful for the A–Z bar of a contact list, for on-screen keyboards and
word games, and for checking that a font covers a language.

## Installation

```sh
npm install cldr-alphabet
```

## Usage

```js
import {
  getAlphabet,
  getIndexCharacters,
  getExemplarCharacters,
} from "cldr-alphabet";

getAlphabet("de").join(" ");
// "a ä b c d e f g h i j k l m n o ö p q r s ß t u ü v w x y z"
getAlphabet("da").slice(-3); // ["æ", "ø", "å"]
getAlphabet("cs").includes("ch"); // true: one letter in Czech

getIndexCharacters("es").join("");
// "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ"
getIndexCharacters("ja").join(""); // "あかさたなはまやらわ"

getExemplarCharacters("es", "punctuation").includes("¿"); // true
```

The default export is `getAlphabet`, with every export as a property:
`import getAlphabet from "cldr-alphabet"`.

## API

Locales are BCP 47 language tags or `Intl.Locale` objects. A locale
without data of its own gets that of its language in the likely script:
`zh-TW` gets Traditional Chinese. A language that CLDR does not have
gets empty lists.

### `getAlphabet(locale)`

Returns the letters that the language is written with, lowercase and in
the order of the language. A letter can be several characters, such as
the Czech `"ch"`; marks that combine with letters are listed too, as in
Arabic or Hindi. Languages written with Chinese characters or Hangul
syllables get the thousands of characters in common use.

### `getIndexCharacters(locale)`

Returns the labels under which an alphabetical index groups its entries,
uppercase for the scripts that have case.

### `getExemplarCharacters(locale, type?)`

Returns one of the sets of exemplar characters of the language:

| Type            |                                                            |
| --------------- | ---------------------------------------------------------- |
| `"main"`        | The letters of the language, as `getAlphabet()` (default)  |
| `"auxiliary"`   | Letters of foreign words and names, such as "é" in English |
| `"index"`       | The labels of an index, as `getIndexCharacters()`          |
| `"numbers"`     | The digits and symbols of numbers                          |
| `"punctuation"` | The punctuation marks in common use                        |

### `VERSION`

The CLDR version of the data, such as `"49.0.0"`.

## License

MIT. Includes data from the Unicode CLDR, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
