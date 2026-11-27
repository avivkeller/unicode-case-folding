# cldr-ascii-fallback

Converts any text to readable ASCII, using the
[Unicode CLDR](https://cldr.unicode.org/) Latin-ASCII transform and
character fallbacks, then Unicode compatibility decompositions. Useful for
slugs, file names, search keys and systems that only accept ASCII.

## Installation

```sh
npm install cldr-ascii-fallback
```

## Usage

```js
import { toAscii } from "cldr-ascii-fallback";

toAscii("Crème brûlée"); // "Creme brulee"
toAscii("Ærøskøbing, Łódź"); // "AEroskobing, Lodz"
toAscii("“Smart” quotes — and…"); // "\"Smart\" quotes - and..."
toAscii("© 2026 ½ €5 ™"); // "(C) 2026  1/2 EUR5 TM"

toAscii("日本"); // "??"
toAscii("Café 日本", { replacement: "" }); // "Cafe "
toAscii("Café 日本", { replacement: null }); // "Cafe 日本"
```

The default export is `toAscii`, with every export as a property:
`import toAscii from "cldr-ascii-fallback"`.

## API

### `toAscii(text, options?)`

Returns the ASCII form of the text:

1. Accents are removed from Latin letters and digits ("é" → "e").
2. The Latin-ASCII transform spells out letters and symbols ("ß" → "ss",
   "Æ" → "AE", "©" → "(C)") and simplifies punctuation ("“” – …" →
   `"" - ...`).
3. CLDR's character fallbacks cover more characters ("€" → "EUR").
4. Compatibility decompositions cover the rest where they are ASCII ("™" →
   "TM", "①" → "1").

Characters with no ASCII form, such as letters of other scripts, become
`options.replacement` (default `"?"`), or are kept when it is `null`.

### `VERSION`

The CLDR version of the data, such as `"49.0.0"`.

## License

MIT. Includes data from the Unicode CLDR and the Unicode Character Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
