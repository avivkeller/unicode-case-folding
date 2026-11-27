# unicode-display-width

Measures how many columns a string takes in a terminal, like `wcwidth`,
using the latest Unicode Character Database. Wide CJK characters and emoji
take two columns, combining marks and invisible characters none, and ANSI
escape sequences (colors, hyperlinks) are ignored. Useful for aligning
tables and text in command-line output.

## Installation

```sh
npm install unicode-display-width
```

## Usage

```js
import { codePointWidth, displayWidth } from "unicode-display-width";

displayWidth("abc"); // 3
displayWidth("日本語"); // 6
displayWidth("👨‍👩‍👧 🇺🇸"); // 5
displayWidth("é"); // 1 (e + combining acute accent)
displayWidth("\u001b[31mred\u001b[0m"); // 3
displayWidth("±", { ambiguousIsWide: true }); // 2

codePointWidth(0x4e00); // 2
```

## API

### `displayWidth(text, options?)`

Returns the number of columns the text takes. Each grapheme cluster takes
the width of its first character that has one:

- 2 for East Asian Wide and Fullwidth characters, and emoji (including
  text-style emoji followed by VARIATION SELECTOR-16, as in "❤️");
- 0 for nonspacing and enclosing marks, format and control characters,
  default-ignorable characters and conjoining Hangul vowels and final
  consonants;
- 1 for everything else, including East Asian Ambiguous characters unless
  `options.ambiguousIsWide` is true (as in CJK terminals).

Tabs count as zero columns, since their width depends on the cursor
position.

### `codePointWidth(codePoint, options?)`

Returns the width (0, 1 or 2) of a single character on its own.

### `VERSION`

The Unicode version of the data, such as `"18.0.0"`.

## License

MIT. Includes data from the Unicode Character Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
