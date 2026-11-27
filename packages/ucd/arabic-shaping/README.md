# unicode-arabic-shaping

Joins Arabic letters for renderers that do not shape text, such as
terminals, canvases and PDF generators, where each letter would show in its
isolated shape. It replaces every letter with the Unicode character of its
contextual shape (isolated, initial, medial or final) and joins lam and alef
into their ligature, for Arabic, Persian, Urdu and the other languages of
the script, and turns those characters back into ordinary letters.

It uses the latest Unicode Character Database
([ArabicShaping.txt](https://www.unicode.org/Public/UCD/latest/ucd/ArabicShaping.txt)
and the presentation forms of
[UnicodeData.txt](https://www.unicode.org/Public/UCD/latest/ucd/UnicodeData.txt))
and the joining rules of the
[Unicode Standard](https://www.unicode.org/versions/latest/core-spec/chapter-9/).

## Installation

```sh
npm install unicode-arabic-shaping
```

## Usage

```js
import {
  fromPresentationForms,
  toPresentationForms,
} from "unicode-arabic-shaping";

toPresentationForms("سلام"); // "ﺳﻼﻡ" (U+FEB3 U+FEFC U+FEE1)
fromPresentationForms("ﺳﻼﻡ"); // "سلام"
```

The text stays in logical order. To show it where right-to-left text is not
reordered either, shape it first, then reorder it with
[`unicode-bidi`](https://www.npmjs.com/package/unicode-bidi):

```js
import { toVisualString } from "unicode-bidi";

console.log(toVisualString(toPresentationForms("مرحبا بالعالم")));
```

The default export is `toPresentationForms`, with every export as a
property: `import toPresentationForms from "unicode-arabic-shaping"`.

## API

### `toPresentationForms(text, options?)`

Replaces the Arabic letters of a text with their presentation forms,
according to the letters around them. Marks such as vowel signs do not
interrupt the joining, the tatweel and the zero width joiner join, and the
zero width non-joiner separates. Letters that Unicode has no presentation
forms for, and everything else, are kept.

Lam followed by alef becomes one of the lam-alef ligatures, with the marks
of the lam after it. Pass `{ ligatures: false }` to keep the two letters.

Shaped text is for display only: searching and sorting need the ordinary
letters.

### `fromPresentationForms(text)`

Replaces the Arabic presentation forms of a text, including the ligatures
that `toPresentationForms` does not make (such as U+FDF2 ﷲ), with their
letters. It restores a shaped text, except that marks between a lam and an
alef end up after the alef.

### `getJoiningType(codePoint)`

Returns the Joining_Type property of a code point, for any cursive script:

| Type  | Meaning                                             |
| ----- | --------------------------------------------------- |
| `"D"` | Dual-joining: joins on both sides, such as ب        |
| `"R"` | Right-joining: joins the previous letter, such as ا |
| `"L"` | Left-joining: joins the next letter                 |
| `"C"` | Join-causing, such as the tatweel                   |
| `"T"` | Transparent: marks, which the joining goes through  |
| `"U"` | Non-joining: everything else                        |

### `getJoiningGroup(codePoint)`

Returns the Joining_Group property of a code point: the name of the letter
whose shapes it has, such as `"Beh"` for ب, ت and ث, or `undefined`.

### `VERSION`

The Unicode version of the data, such as `"18.0.0"`.

## License

MIT. Includes data from the Unicode Character Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
