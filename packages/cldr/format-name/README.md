# cldr-format-name

Format people's names for any locale, with the person name patterns of the
[Unicode CLDR](https://cldr.unicode.org/). Implements the formatting
algorithm of [UTS #35, Part 8: Person Names](https://www.unicode.org/reports/tr35/tr35-personNames.html):
name order, length, formality, initials, monograms, and the spacing of
foreign names.

## Installation

```sh
npm install cldr-format-name
```

## Usage

```js
import { formatName } from "cldr-format-name";

formatName({ given: "John", surname: "Smith" }, { locale: "en" });
// "John Smith"

const name = {
  title: "Dr.",
  given: "Robert",
  "given-informal": "Bob",
  given2: "James",
  surname: "Smith",
};
formatName(name, { locale: "en", length: "long", formality: "formal" });
// "Dr. Robert James Smith"
formatName(name, { locale: "en", usage: "addressing", formality: "informal" });
// "Bob"
formatName(name, {
  locale: "en",
  usage: "monogram",
  length: "long",
  formality: "formal",
});
// "RJS"
formatName(name, { locale: "en", order: "sorting" });
// "Smith, Bob"

// Names are ordered and spaced by the name's locale
formatName({ given: "一郎", surname: "安藤" }, { locale: "ja" });
// "安藤一郎"
formatName(
  { given: "アルベルト", surname: "アインシュタイン", locale: "de" },
  { locale: "ja" },
);
// "アルベルト・アインシュタイン"

// Prefixes such as "van den" are kept out of the way when sorting
formatName(
  { given: "Johannes", "surname-prefix": "van den", "surname-core": "Berg" },
  { locale: "nl", order: "sorting", length: "long", formality: "formal" },
);
// "Berg, Johannes van den"
```

The default export is `formatName`, with every export as a property:
`import formatName from "cldr-format-name"`.

## API

### `formatName(name, options)`

Formats a name. Returns a string.

`name` is an object of CLDR name fields: `title`, `given`, `given2`,
`surname`, `surname2`, `generation` and `credentials`. A given name or a
surname is required. A field followed by modifiers gives a variant of it:
`given-informal` is a nickname, and `surname-prefix` and `surname-core` split
a surname such as "van den Berg". Inflected forms, such as `given-vocative`,
are used where the locale's patterns ask for them. Two more keys are
optional:

- `locale`: the locale of the name, which decides its order and spacing. If
  missing, it is inferred from the script the name is written in.
- `preferredOrder`: `"givenFirst"` or `"surnameFirst"`, overriding the order
  from the locale.

`options`:

- `locale` (required): the locale to format for, as a BCP 47 language tag or
  an `Intl.Locale`.
- `order`: `"givenFirst"`, `"surnameFirst"` or `"sorting"` (for sorted lists,
  such as "Smith, John"). Forces an order; by default it comes from the
  name.
- `length`: `"long"`, `"medium"` or `"short"`. Defaults to the locale's usual
  length.
- `usage`: `"referring"` (talking about someone, the default), `"addressing"`
  (talking to someone) or `"monogram"` (initials).
- `formality`: `"formal"` or `"informal"`. Defaults to the locale's usual
  formality.

A name written in a different script than the locale is formatted with a
locale for that script, so a Latin-script name in Japanese is formatted as
in English.

### `VERSION`

The CLDR version of the data, such as `"49.0.0"`.

## Conformance

The package passes CLDR's person name conformance tests for all 111 locales
it covers, except one Burmese case where the JavaScript engine's word
segmentation, which initials depend on, differs from the reference
implementation's. The words that initials are taken from are found with
the engine's `Intl.Segmenter`, for its dictionaries of languages written
without spaces; capitalization, grapheme clusters, the script of a name and
its likely locale come from Unicode data.

## License

MIT. Includes data from the Unicode CLDR, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
