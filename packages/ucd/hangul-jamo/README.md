# unicode-hangul-jamo

Splits Korean Hangul syllables into their jamo letters and joins them back,
converts between the two kinds of jamo in Unicode, and extracts the initial
consonants of a text, using the latest Unicode Character Database
([HangulSyllableType.txt](https://www.unicode.org/Public/UCD/latest/ucd/HangulSyllableType.txt)
and [UnicodeData.txt](https://www.unicode.org/Public/UCD/latest/ucd/UnicodeData.txt)).
Useful for initial-consonant (초성) search, autocomplete while a syllable is
being typed, and sorting or analyzing Korean text.

Unicode has two kinds of jamo:

- **Conjoining jamo** (U+1100…) have separate characters for initial
  consonants, vowels and final consonants, and are displayed joined into a
  syllable block: `ᄒ` + `ᅡ` + `ᆫ` shows as `한`.
- **Compatibility jamo** (U+3131…) are the standalone letters of keyboards,
  such as `ㅎ`, `ㅏ` and `ㄴ`, with one character per letter wherever it is
  in the syllable.

To only decompose and compose syllables with conjoining jamo as part of
Unicode normalization, see [`unicode-normalize`](../normalize).

## Installation

```sh
npm install unicode-hangul-jamo
```

## Usage

```js
import { fromJamo, getInitialConsonants, toJamo } from "unicode-hangul-jamo";

toJamo("한글", { jamo: "compatibility" }); // "ㅎㅏㄴㄱㅡㄹ"
toJamo("한글"); // "한글", as six conjoining jamo

fromJamo("ㅎㅏㄴㄱㅡㄹ"); // "한글"

// Initial-consonant search: "ㅇㄴㅋㄷ" finds "유니코드"
getInitialConsonants("유니코드"); // "ㅇㄴㅋㄷ"
```

The default export is `toJamo`, with every export as a property:
`import toJamo from "unicode-hangul-jamo"`.

## API

### `toJamo(text, options?)`

Splits each Hangul syllable of a text into two or three jamo, and keeps
other text. With `{ jamo: "compatibility" }`, the result is in
compatibility jamo, including the conjoining jamo the text already had;
by default, in conjoining jamo.

### `fromJamo(text)`

Joins the jamo of a text into syllables. Compatibility jamo do not say where
they are in a syllable, so they are read as a keyboard would: a consonant
before a vowel starts a syllable, and a consonant after a consonant and a
vowel ends it. Jamo that form no syllable stay as they are (`"ㅋㅋㅋ"`), as
do the archaic jamo that no precomposed syllable has.

`fromJamo` reverses `toJamo` for text made of syllables, but not for text
that already mixed syllables and standalone jamo: `"ㅋㅋ하"`, once split,
reads as `"ㅋ카"`.

### `toCompatibilityJamo(text)`

Converts the conjoining jamo of a text to compatibility jamo, leaving
syllables whole. The few archaic jamo without a compatibility form stay.

### `toConjoiningJamo(text)`

Converts the compatibility jamo of a text to conjoining initials, vowels
and finals, placed as `fromJamo` does, without joining them into syllables.
Unlike `fromJamo`, it also converts the archaic finals that no precomposed
syllable has.

### `getInitialConsonants(text, options?)`

Replaces each syllable with its initial consonant and keeps other text, so
that a text can be searched by initial consonants. The result is in
compatibility jamo, as typed on a keyboard, or in conjoining jamo with
`{ jamo: "conjoining" }`.

### `getHangulSyllableType(codePoint)`

Returns the Hangul_Syllable_Type property: `"L"` (initial consonant),
`"V"` (vowel) or `"T"` (final consonant) for conjoining jamo, `"LV"` or
`"LVT"` for syllables, and `undefined` otherwise, including for
compatibility jamo.

### `VERSION`

The Unicode version of the data, such as `"18.0.0"`.

## License

MIT. Includes data from the Unicode Character Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
