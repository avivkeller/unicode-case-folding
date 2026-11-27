# cldr-smart-quotes

Locale-correct quotation marks, from the [Unicode CLDR](https://cldr.unicode.org/):
look up a locale's quotation marks, quote text with them, or turn straight
quotes into them ("smart quotes").

## Installation

```sh
npm install cldr-smart-quotes
```

## Usage

```js
import { getQuotes, quote, smartQuotes } from "cldr-smart-quotes";

getQuotes("de");
// { start: "„", end: "“", alternateStart: "‚", alternateEnd: "‘" }

quote("Bonjour", "fr"); // "«Bonjour»"
quote("やあ", "ja"); // "「やあ」"

smartQuotes(`"She said 'don't'," he wrote.`, "en");
// "“She said ‘don’t’,” he wrote."
smartQuotes(`"She said 'hi'"`, "de");
// "„She said ‚hi‘“"
```

The default export is `smartQuotes`, with every export as a property:
`import smartQuotes from "cldr-smart-quotes"`.

## API

### `getQuotes(locale)`

Returns `{ start, end, alternateStart, alternateEnd }`: the quotation marks
of a locale, and the alternate marks used for quotes inside quotes.

### `quote(text, locale, options?)`

Wraps text in the locale's quotation marks, or its alternate marks with
`{ alternate: true }`.

### `smartQuotes(text, locale)`

Replaces straight double quotes with the locale's quotation marks, straight
single quotes with its alternate marks, and apostrophes (as in "don't",
"students'" and "'90s") with ’.

### `VERSION`

The CLDR version of the data, such as `"49.0.0"`.

## Locales

`locale` is a BCP 47 language tag or an `Intl.Locale`. Locales fall back to
their parents ("de-AT" uses "de") and finally to the CLDR root locale, and
use the likely script of their region ("zh-TW" uses Traditional Chinese
marks). Lookup does not depend on the JavaScript engine's locale data.

## License

MIT. Includes data from the Unicode CLDR, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
