# unicode-simplified-traditional

Converts Chinese text between simplified and traditional characters, one
character at a time, with the variants of the Unicode Han Database
([Unihan](https://www.unicode.org/reports/tr38/), the `kSimplifiedVariant`
and `kTraditionalVariant` fields). Useful for search, matching and showing
text to readers of the other form.

## Installation

```sh
npm install unicode-simplified-traditional
```

## Usage

```js
import {
  getTraditionalVariants,
  toSimplified,
  toTraditional,
} from "unicode-simplified-traditional";

toSimplified("漢語"); // "汉语"
toTraditional("汉语"); // "漢語"

// 后 is also a traditional character (empress), so it is kept by default
toTraditional("后来"); // "后來"
toTraditional("后来", { ambiguous: "convert" }); // "後來"

getTraditionalVariants(0x53d1); // ["發", "髮"] (发)
getTraditionalVariants(0x540e); // ["后", "後"]
```

The default export is `toSimplified`, with every export as a property:
`import toSimplified from "unicode-simplified-traditional"`.

## API

### `toSimplified(text, options?)`

Replaces each traditional character with its simplified form and keeps
other text.

### `toTraditional(text, options?)`

Replaces each simplified character with its traditional form and keeps
other text.

### Options

- `ambiguous`: what to do with a character that is used in both forms and
  is also the simplified or traditional form of other characters, such as
  后 (traditional 后 or 後). `"keep"` (the default) leaves it unchanged;
  `"convert"` replaces it with the first of its other variants.

### `getSimplifiedVariants(codePoint)`

Returns every simplified form of a character, as an array of characters.
The character itself comes first if it is one of them. The array is empty
if Unihan lists none, as for characters that are the same in both forms.

### `getTraditionalVariants(codePoint)`

Returns every traditional form of a character, in the same way.

### `VERSION`

The Unicode version of the data, such as `"18.0.0"`.

## Notes

The conversion is character by character, with no dictionary of words or
phrases. A character with several variants gets the first one Unihan lists,
whatever the word it is in: 发 always becomes 發, although 头发 (hair) is
頭髮. Regional vocabulary is not converted either: 硬盘 becomes 硬盤, not
the 硬碟 used in Taiwan. Use the variant lookups to build something more
precise.

## License

MIT. Includes data from the Unicode Han Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
