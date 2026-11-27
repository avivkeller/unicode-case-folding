# unicode-emoji-presentation

Tells whether a character shows as a colorful emoji or as a text symbol by
default, and forces one presentation or the other with the variation
selectors U+FE0F (emoji) and U+FE0E (text), using the latest Unicode
Character Database
([emoji-data.txt](https://www.unicode.org/Public/UCD/latest/ucd/emoji/emoji-data.txt)
and
[emoji-variation-sequences.txt](https://www.unicode.org/Public/UCD/latest/ucd/emoji/emoji-variation-sequences.txt),
[UTS #51](https://www.unicode.org/reports/tr51/)).

Many symbols older than emoji, such as "☺", "✔", "↩" or "©", have both
presentations, and which one a bare character gets depends on the platform.
A variation selector after the character settles it: "↩︎" stays an arrow in
a text font, "☺️" is always a smiley.

## Installation

```sh
npm install unicode-emoji-presentation
```

## Usage

```js
import {
  getDefaultPresentation,
  toEmojiPresentation,
  toTextPresentation,
} from "unicode-emoji-presentation";

toEmojiPresentation("I ❤ U ☺"); // "I ❤️ U ☺️"
toTextPresentation("Back ↩ © 2026"); // "Back ↩︎ ©︎ 2026"
toTextPresentation("☺️"); // "☺︎"

getDefaultPresentation(0x263a); // "text" (☺)
getDefaultPresentation(0x1f600); // "emoji" (😀)
getDefaultPresentation(0x41); // undefined (A is not an emoji)
```

The default export is `toEmojiPresentation`, with every export as a
property: `import toEmojiPresentation from "unicode-emoji-presentation"`.

## API

### `toEmojiPresentation(text)`

Returns the text with the emoji presentation of each character that has both
presentations: U+FE0F is added after the characters that are text by
default, and replaces U+FE0E. After the characters that are emoji by
default, such as "⌚", U+FE0E is removed and nothing is added, as these need
no selector.

### `toTextPresentation(text)`

Returns the text with the text presentation of each character that has both
presentations: U+FE0E is added after it, and replaces U+FE0F. Whether the
result shows as text depends on the fonts; emoji without a text presentation,
such as "😀", are not changed.

In both functions:

- The digits, "#" and "\*" are only changed where they already have a
  variation selector or start a keycap ("1⃣" → "1️⃣"), so that numbers stay
  as they are.
- A character followed by a skin tone modifier ("☝🏽") is not changed: the
  modifier already makes it an emoji.

### `getDefaultPresentation(codePoint)`

Returns `"emoji"` if a character shows as an emoji without a variation
selector (the Emoji_Presentation property), `"text"` if it is an emoji that
shows as text by default, and `undefined` if it is not an emoji. The digits,
"#" and "\*" are `"text"`: they are emoji as the base of a keycap.

### `VERSION`

The Unicode version of the data, such as `"18.0.0"`.

## License

MIT. Includes data from the Unicode Character Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
