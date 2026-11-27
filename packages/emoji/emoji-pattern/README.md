# unicode-emoji-pattern

A regular expression that matches every emoji recommended for general
interchange (the `RGI_Emoji` set of
[UTS #51](https://www.unicode.org/reports/tr51/)): single emoji, keycaps,
flags, skin tones and ZWJ sequences such as "👨‍👩‍👧", each as one match. It is
generated from the latest Unicode emoji data
([emoji-sequences.txt](https://www.unicode.org/Public/emoji/latest/emoji-sequences.txt)
and
[emoji-zwj-sequences.txt](https://www.unicode.org/Public/emoji/latest/emoji-zwj-sequences.txt)).

JavaScript has `/\p{RGI_Emoji}/v`, but with the emoji of the engine's
Unicode version: an older engine splits a newer emoji into pieces, or misses
it. This package matches the same emoji on every engine.

## Installation

```sh
npm install unicode-emoji-pattern
```

## Usage

```js
import {
  countEmoji,
  emojiRegex,
  findEmoji,
  isEmoji,
  stripEmoji,
} from "unicode-emoji-pattern";

"Hi 👋🏽 from 🇯🇵".match(emojiRegex()); // ["👋🏽", "🇯🇵"]

isEmoji("👨‍👩‍👧"); // true
isEmoji("👍 ok"); // false

findEmoji("a 👍🏽 b"); // [{ emoji: "👍🏽", index: 2 }]
countEmoji("👨‍👩‍👧🇯🇵"); // 2
stripEmoji("Hi 👋🏽!"); // "Hi !"
```

The default export is `emojiRegex`, with every export as a property:
`import emojiRegex from "unicode-emoji-pattern"`.

## API

### `emojiRegex(flags?)`

Returns a new `RegExp` that matches one emoji, the longest possible at each
position. The flags are `"gu"` by default, and must include `"u"` or `"v"`.

### `isEmoji(text)`

Returns whether a string is exactly one emoji.

### `findEmoji(text)`

Returns the emoji of a string in order, each as `{ emoji, index }`, where
`index` is a UTF-16 offset.

### `countEmoji(text)`

Returns the number of emoji of a string.

### `stripEmoji(text)`

Returns a string without its emoji. The text around them is not changed:
spaces stay.

### `VERSION`

The Emoji version of the data, such as `"18.0"`.

## What is an emoji

Only the sequences of the `RGI_Emoji` set match, in their fully-qualified
form:

- A character that is text by default, such as "©" or "☺", only matches
  with the emoji presentation selector U+FE0F ("©️", "☺️"). Digits, "#" and
  "\*" only match in a keycap sequence ("1️⃣").
- A sequence that is well-formed but not recommended, such as a flag of two
  arbitrary regional indicators or an unlisted ZWJ sequence, matches as the
  emoji it is made of, if any.

## License

MIT. Includes data from the Unicode emoji data files, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
