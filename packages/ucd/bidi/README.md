# unicode-bidi

The Unicode Bidirectional Algorithm ([UAX #9](https://www.unicode.org/reports/tr9/)),
generated from the latest Unicode Character Database. It finds the
embedding levels of text that mixes left-to-right and right-to-left
scripts, such as Arabic and Hebrew, reorders lines for display, and finds
the characters that are displayed mirrored, such as parentheses in
right-to-left text.

It passes all of the Unicode conformance tests, `BidiTest.txt` and
`BidiCharacterTest.txt`.

## Installation

```sh
npm install unicode-bidi
```

## Usage

```js
import { getEmbeddingLevels, reorderLine, toVisualString } from "unicode-bidi";

// Text in display order, for terminals and other plain-text output
toVisualString("שלום world"); // "world םולש"
toVisualString("hello (שלום)!"); // "hello (םולש)!"
toVisualString("שלום world", { direction: "ltr" }); // "םולש world"

// Embedding levels: even levels are left-to-right, odd levels right-to-left
const text = "(שלום) abc";
const embeddingLevels = getEmbeddingLevels(text);
// {
//   paragraphs: [{ start: 0, end: 10, level: 1 }],
//   levels: Uint8Array [1, 1, 1, 1, 1, 1, 1, 2, 2, 2],
// }

// The order in which to display a line, from left to right, and the
// characters to display with mirrored glyphs
reorderLine(text, embeddingLevels);
// { order: [7, 8, 9, 6, 5, 4, 3, 2, 1, 0], mirrored: [0, 5] }

// Lines of a paragraph that is broken into several lines are reordered
// one at a time
reorderLine(text, embeddingLevels, 0, 7);
// { order: [6, 5, 4, 3, 2, 1, 0], mirrored: [0, 5] }
```

The default export is `getEmbeddingLevels`, with every export as a property:
`import getEmbeddingLevels from "unicode-bidi"`.

## API

### `getEmbeddingLevels(text, options?)`

Runs the algorithm up to the resolution of levels (rules P1–I2, and L1 for
each paragraph as a single line). Returns `{ paragraphs, levels }`:

- `paragraphs`: the paragraphs of the text, as `{ start, end, level }`,
  where `start` and `end` are indices of UTF-16 code units (`end` includes
  the paragraph separator) and `level` is 0 for a left-to-right paragraph
  and 1 for a right-to-left one. Paragraphs end after paragraph separators
  such as `"\n"`, `"\r\n"` and U+2029.
- `levels`: a `Uint8Array` with the level of each code unit of the text.
  Characters that the algorithm ignores, such as directional embeddings and
  zero width joiners (rule X9), have the level of the character before
  them.

`options.direction` sets the paragraph direction: `"ltr"`, `"rtl"`, or
`"auto"` (the default), which takes the direction of the first strong
character of each paragraph, and left-to-right without one.

### `reorderLine(text, embeddingLevels, start?, end?)`

Reorders a line of text for display (rules L1 and L2). `embeddingLevels` is
the result of `getEmbeddingLevels()` for the text, and `start` and `end`
are the code unit indices of the line, the whole text by default; a line
that spans several paragraphs is reordered one paragraph at a time. Returns
`{ order, mirrored }`:

- `order`: the indices of the line's code units, in the order in which they
  are displayed from left to right. The code units of a surrogate pair stay
  in order.
- `mirrored`: the indices of the characters that are displayed with mirrored
  glyphs (rule L4), such as `(` in right-to-left text.
  `getMirroredCharacter()` gives a character that looks mirrored, where
  there is one.

Combining marks stay before their base characters in right-to-left text,
as rule L2 orders them; renderers that expect them after (rule L3) must
reorder them.

### `toVisualString(text, options?)`

Converts text to the order in which it is displayed, for output that is
shown from left to right without reordering, such as most terminals. Each
paragraph, and each line ended by U+2028 LINE SEPARATOR, is reordered as one
line. Right-to-left text is reversed by grapheme cluster, so that combining
marks and emoji sequences stay whole
(rule L3), mirrored characters are replaced with their mirror images (L4),
and directional formatting characters are removed. `options` are those of
`getEmbeddingLevels()`.

Line breaking and the shaping of Arabic letters are up to the display.

### `getMirroredCharacter(codePoint)`

Returns the code point of the character whose glyph is the mirror image of
the code point's (its Bidi_Mirroring_Glyph), such as `0x29` for `(`, or
`undefined` if there is none. A mirror image may not have the same length
in UTF-16: U+221D ∝ and U+1DB10 mirror each other.

### `getBidiClass(codePoint)`

Returns the Bidi_Class of a code point, such as `"L"`, `"R"` or `"AN"`.

### `VERSION`

The Unicode version of the data, such as `"18.0.0"`.

## License

MIT. Includes data from the Unicode Character Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
