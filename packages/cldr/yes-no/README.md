# cldr-yes-no

Understands yes/no answers in any language, using the answers the
[Unicode CLDR](https://cldr.unicode.org/) lists for each locale. Useful for
command-line prompts.

## Installation

```sh
npm install cldr-yes-no
```

## Usage

```js
import { getYesNo, parseYesNo } from "cldr-yes-no";

parseYesNo("y", "en"); // true
parseYesNo("Nein", "de"); // false
parseYesNo("はい", "ja"); // true
parseYesNo("maybe", "en"); // undefined

const { yes, no } = getYesNo("de"); // { yes: ["ja", "j"], no: ["nein", "n"] }
const prompt = `Fortfahren? [${yes.at(-1)}/${no.at(-1)}] `; // "Fortfahren? [j/n] "
```

## API

### `parseYesNo(answer, locale)`

Returns `true` if the answer means yes in the locale's language, `false` if
it means no, and `undefined` otherwise. Case and surrounding whitespace are
ignored.

### `getYesNo(locale)`

Returns `{ yes, no }`: the answers the locale accepts, full words first.

### `VERSION`

The CLDR version of the data, such as `"49.0.0"`.

## License

MIT. Includes data from the Unicode CLDR, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
