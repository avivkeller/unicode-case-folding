# cldr-group-gender

Finds the grammatical gender to use for a group of people, from the gender
of each person, with the gender rules of the
[Unicode CLDR](https://cldr.unicode.org/)
([UTS #35](https://www.unicode.org/reports/tr35/tr35-general.html#List_Gender)).
A message such as "Tom and Mary are online" needs it wherever the verb or
the adjective agrees with the subject: in French, a group with one man is
masculine ("connectés"), and a group of women is feminine ("connectées").

## Installation

```sh
npm install cldr-group-gender
```

## Usage

```js
import { getGroupGender } from "cldr-group-gender";

getGroupGender(["female", "male"], "fr"); // "male"
getGroupGender(["female", "female"], "fr"); // "female"
getGroupGender(["female", "male"], "el"); // "other"
getGroupGender(["female", "female"], "en"); // "other"
```

The default export is `getGroupGender`, with every export as a property:
`import getGroupGender from "cldr-group-gender"`.

## API

Genders are `"male"`, `"female"` or `"other"`, the values of the `select`
argument of ICU MessageFormat. Locales are BCP 47 language tags or
`Intl.Locale` objects.

### `getGroupGender(genders, locale)`

Returns the gender of a group, given the gender of each person. A single
person keeps their gender, and an empty group is `"other"`. For two people
or more, the language follows one of three rules:

| Gender of the group                                  | Languages                            |
| ---------------------------------------------------- | ------------------------------------ |
| `"other"`                                            | English, German, Japanese and others |
| The gender that everyone shares, `"other"` otherwise | Greek, Icelandic                     |
| `"female"` if everyone is, `"male"` otherwise        | French, Spanish, Arabic and others   |

Languages without data follow the first.

### `VERSION`

The CLDR version of the data, such as `"49.0.0"`.

## License

MIT. Includes data from the Unicode CLDR, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
