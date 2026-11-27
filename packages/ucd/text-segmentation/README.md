# unicode-text-segmentation

[Unicode Text Segmentation](https://www.unicode.org/reports/tr29/) (UAX #29),
generated from the latest Unicode Character Database. It splits text into
extended grapheme clusters (what a reader sees as one character, such as
"é", "👨‍👩‍👧" or "क्षि"), words and sentences.

Unlike `Intl.Segmenter`, whose results depend on the Unicode version and the
locale data of the JavaScript engine, the results follow the Unicode version
the package was built from, on every engine.

It implements the default rules of UAX #29, without tailoring, except for
the abbreviations of the [Unicode CLDR](https://cldr.unicode.org/), on
request: with a `locale`, a sentence does not end after "Mr.".

## Installation

```sh
npm install unicode-text-segmentation
```

## Usage

```js
import {
  countGraphemes,
  findWordBreaks,
  isWordLike,
  splitGraphemes,
  splitSentences,
  splitWords,
} from "unicode-text-segmentation";

splitGraphemes("🇯🇵🇺🇸👨‍👩‍👧👋🏽");
// ["🇯🇵", "🇺🇸", "👨‍👩‍👧", "👋🏽"]
splitGraphemes("e\u0301a\r\nक्षि한");
// ["e\u0301", "a", "\r\n", "क्षि", "한"]
countGraphemes("👨‍👩‍👧 family");
// 8

splitWords("Hello, world! It's 3.14.");
// ["Hello", ",", " ", "world", "!", " ", "It's", " ", "3.14", "."]
splitWords("can't stop: example.com, 1,234.5 and snake_case");
// ["can't", " ", "stop", ":", " ", "example.com", ",", " ", "1,234.5", " ", "and", " ", "snake_case"]
splitWords("The quick (“brown”) fox").filter(isWordLike);
// ["The", "quick", "brown", "fox"]
findWordBreaks("Hello, world!");
// [5, 6, 7, 12, 13]

splitSentences("Hello world. How are you? Fine, thanks!");
// ["Hello world. ", "How are you? ", "Fine, thanks!"]
splitSentences("She said “Go.” Then he left.\nNew line");
// ["She said “Go.” ", "Then he left.\n", "New line"]
splitSentences("It costs $3.50 in the U.S. today. Mr. Smith paid.");
// ["It costs $3.50 in the U.S. today. ", "Mr. ", "Smith paid."]
splitSentences("It costs $3.50 in the U.S. today. Mr. Smith paid.", {
  locale: "en",
});
// ["It costs $3.50 in the U.S. today. ", "Mr. Smith paid."]
```

The default export is `splitGraphemes`, with every export as a property:
`import splitGraphemes from "unicode-text-segmentation"`.

## API

Every function throws a `TypeError` if its first argument is not a string.

### `findGraphemeBreaks(string)`, `findWordBreaks(string)`, `findSentenceBreaks(string, options?)`

Return the boundaries of a string as UTF-16 offsets, in order. The boundary
at the start of the string is left out, and the last one is the length of
the string, so each offset is the end of a segment. An empty string has no
boundaries.

### `splitGraphemes(string)`, `splitWords(string)`, `splitSentences(string, options?)`

Split a string at its boundaries. The segments join back to the string:
words come with the spaces and punctuation between them as segments of their
own, and each sentence keeps the spaces and line terminators after it.

### Sentence options

- `locale`: a locale, as a string or an `Intl.Locale`. A sentence then goes
  on after the abbreviations of its language, as listed by the CLDR
  (the sentence break suppressions): "Mr. Smith" stays whole with `"en"`.
  The CLDR has lists for German, English, Spanish, French, Italian,
  Portuguese and Russian; other locales change nothing. An abbreviation is
  matched as written, with its capitals, after a space or punctuation.

  The lists are short: English has "Mr." and "Prof." but not "Dr.". A
  sentence that ends in an abbreviation ("It was 5 P.M. She left.") is not
  split either.

### `countGraphemes(string)`

Returns the number of extended grapheme clusters of a string, without
creating them.

### `isWordLike(segment)`

Tells whether a segment of `splitWords` is a word rather than spaces,
punctuation or symbols: whether it has a letter, a digit or a Katakana
character according to its Word*Break property, or another alphabetic
character (such as an ideograph, or a Hiragana or Thai letter). It is `false`
for emoji and for `"*"`.

### `VERSION`

The Unicode version of the data, such as `"18.0.0"`.

## What it does not do

- **Dictionary-based word breaking.** Thai, Lao, Khmer, Burmese, Chinese
  and Japanese are written without spaces between words, and finding their
  words takes a dictionary, which UAX #29 leaves to tailorings. With the
  default rules, each ideograph, each Hiragana character and each letter of
  Thai, Lao, Khmer or Burmese (with its combining marks) is a segment of its
  own, and only a run of Katakana stays together:
  `splitWords("東京タワーへ")` is `["東", "京", "タワー", "へ"]`, where
  `Intl.Segmenter` finds `["東京タワー", "へ"]`.
- **Locale tailoring.** Graphemes and words are the same for every locale,
  and so are sentences, but for the abbreviations of the `locale` option:
  the rules of the CLDR for Greek question marks, or for Japanese and
  Chinese words, are not applied.

## Conformance

The package passes every case of the Unicode segmentation tests:
[GraphemeBreakTest.txt](https://www.unicode.org/Public/UCD/latest/ucd/auxiliary/GraphemeBreakTest.txt),
[WordBreakTest.txt](https://www.unicode.org/Public/UCD/latest/ucd/auxiliary/WordBreakTest.txt)
and
[SentenceBreakTest.txt](https://www.unicode.org/Public/UCD/latest/ucd/auxiliary/SentenceBreakTest.txt).

## License

MIT. Includes data from the Unicode Character Database and the Unicode CLDR, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
