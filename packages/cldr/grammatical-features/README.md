# cldr-grammatical-features

Tells which grammatical cases, genders and definiteness forms the nouns of
a language have, with the grammatical features of the
[Unicode CLDR](https://cldr.unicode.org/)
([UTS #35](https://www.unicode.org/reports/tr35/tr35-general.html#Grammatical_Features)).
Translation and message formatting tools use it to know which forms of a
term a translator has to provide: four cases and three genders in German,
fourteen cases in Finnish, none in English.

## Installation

```sh
npm install cldr-grammatical-features
```

## Usage

```js
import { getGrammaticalFeatures } from "cldr-grammatical-features";

getGrammaticalFeatures("de");
// {
//   cases: ["nominative", "genitive", "dative", "accusative"],
//   genders: ["masculine", "feminine", "neuter"],
//   definiteness: [],
// }

getGrammaticalFeatures("sv").definiteness; // ["definite", "indefinite"]
getGrammaticalFeatures("fi").cases.length; // 14
getGrammaticalFeatures("en"); // { cases: [], genders: [], definiteness: [] }
getGrammaticalFeatures("eo"); // undefined: no data
```

The default export is `getGrammaticalFeatures`, with every export as a
property: `import getGrammaticalFeatures from "cldr-grammatical-features"`.

## API

### `getGrammaticalFeatures(locale)`

Returns `{ cases, genders, definiteness }` for the language of a BCP 47
language tag or `Intl.Locale`. Each is a list of CLDR's names for the
forms, empty if nouns do not vary that way. Returns `undefined` for the
languages that CLDR has no data for.

"Gender" stands for any noun class: the values include `"animate"`,
`"inanimate"`, `"personal"` and `"common"` besides `"masculine"`,
`"feminine"` and `"neuter"`.

### `VERSION`

The CLDR version of the data, such as `"49.0.0"`.

## License

MIT. Includes data from the Unicode CLDR, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
