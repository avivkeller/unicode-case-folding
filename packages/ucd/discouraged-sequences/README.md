# unicode-discouraged-sequences

Finds the character sequences that the Unicode Standard says not to emit in
new text, and replaces them with their preferred form, using the latest
Unicode Character Database
([DoNotEmit.txt](https://www.unicode.org/Public/UCD/latest/ucd/DoNotEmit.txt)).
These are deprecated characters, legacy spellings of Indic letters, and
combinations that look like another character but are not equivalent to it,
so normalization does not fix them. Useful for input methods, text linting
and for treating both forms alike in search.

## Installation

```sh
npm install unicode-discouraged-sequences
```

## Usage

```js
import {
  findDiscouragedSequences,
  replaceDiscouragedSequences,
} from "unicode-discouraged-sequences";

// "ŉ" (U+0149) is deprecated in favor of "ʼn" as two characters
replaceDiscouragedSequences("ŉ"); // "’n"

// The Devanagari letter AA typed as the letter A and a vowel sign
replaceDiscouragedSequences("अा"); // "आ" (आ)

findDiscouragedSequences("aŉ");
// [{ index: 1, sequence: "ŉ", replacement: "’n", type: "Deprecated" }]
```

The default export is `replaceDiscouragedSequences`, with every export as a
property: `import replaceDiscouragedSequences from "unicode-discouraged-sequences"`.

## API

### `replaceDiscouragedSequences(text, options?)`

Replaces every discouraged sequence of a text with its preferred form. Where
several sequences start at the same place, the longest is replaced. The text
is read once: a replacement is not searched again.

### `findDiscouragedSequences(text, options?)`

Returns the discouraged sequences of a text, in order and without overlaps,
as `{ index, sequence, replacement, type }`, where `index` is a UTF-16
offset.

### `getDiscouragedSequences()`

Returns every sequence of the data as `{ sequence, replacement, type }`.

### `getDiscouragedTypes()`

Returns the types of the data:

| Type                                                                       | Sequences                                                      |
| -------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `Deprecated`                                                               | Deprecated characters that have a replacement                  |
| `Discouraged`                                                              | Other characters and sequences the standard discourages        |
| `Preferred_Spelling`                                                       | Characters for which the standard prefers another spelling     |
| `Precomposed_Form`                                                         | Base and overlay sequences for which a single character exists |
| `Dotless_Form`                                                             | Dotless i and j followed by a combining dot above              |
| `Indic_Vowel_Letter`, `Indic_Atomic_Consonant`, `Indic_Consonant_Conjunct` | Sequences that only look like an Indic letter or conjunct      |
| `Bengali_Khanda_Ta`, `Malayalam_Chillu`, `Tamil_Shrii`                     | Representations from before Unicode 4.1 and 5.1                |
| `Arabic_Tashkil`, `Hamza_Form`                                             | Arabic mark combinations to avoid                              |

### Options

- `types`: only consider these types. Every type by default.

The data notes that the `Malayalam_Chillu` sequences may also appear in
legitimate Malayalam text unrelated to chillus. To leave them alone:

```js
const types = getDiscouragedTypes().filter(
  (type) => type !== "Malayalam_Chillu",
);
replaceDiscouragedSequences(text, { types });
```

### `VERSION`

The Unicode version of the data, such as `"18.0.0"`.

## License

MIT. Includes data from the Unicode Character Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
