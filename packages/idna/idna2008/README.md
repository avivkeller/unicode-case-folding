# unicode-idna2008

Checks whether a domain name is valid under IDNA2008
([RFC 5891](https://www.rfc-editor.org/rfc/rfc5891),
[RFC 5892](https://www.rfc-editor.org/rfc/rfc5892) and
[RFC 5893](https://www.rfc-editor.org/rfc/rfc5893)), the strict rules that
domain registries apply, using the latest Unicode
[IDNA2008 data](https://www.unicode.org/Public/idna/latest/Idna2008.txt).

Unlike [`unicode-idna`](../idna), which converts what people type into a
domain name as browsers do, this package maps nothing: `Bücher.de` and
`☕.us` are not valid IDNA2008 domain names, `bücher.de` is.

## Installation

```sh
npm install unicode-idna2008
```

## Usage

```js
import {
  getIdna2008Property,
  isValidDomain,
  isValidLabel,
} from "unicode-idna2008";

isValidDomain("bücher.de"); // true
isValidDomain("xn--bcher-kva.de"); // true
isValidDomain("Bücher.de"); // false (uppercase letters are disallowed)
isValidDomain("☕.us"); // false (symbols are disallowed)

isValidLabel("l·l"); // true (a middle dot is allowed between two "l")
isValidLabel("a·b"); // false

getIdna2008Property(0xfc); // "PVALID" (ü)
getIdna2008Property(0xb7); // "CONTEXTO" (·)
```

The default export is `isValidDomain`, with every export as a property:
`import isValidDomain from "unicode-idna2008"`.

## API

### `isValidDomain(domain)`

Returns whether every label of a domain name is valid, the Bidi rule holds
for the domain name, and the name fits in the DNS (labels of 1 to 63
characters and 253 in total, once in ASCII). Labels are separated by `.`
only, and a trailing dot is not accepted.

A label is valid if it is one of:

- an ASCII label of letters, digits and hyphens, in any case, without a
  hyphen at its start, at its end, or in both its third and fourth positions;
- a U-label: in Normalization Form C, not starting with a combining mark,
  and made of code points that are `PVALID`, or `CONTEXTJ` or `CONTEXTO` in
  a context that the rules of RFC 5892 (appendix A) allow;
- an A-label: `xn--` followed by the Punycode of a U-label, in any case.

### `isValidLabel(label)`

Returns whether a single label is valid.

### `getIdna2008Property(codePoint)`

Returns the IDNA2008 derived property of a code point: `"PVALID"`,
`"CONTEXTJ"`, `"CONTEXTO"`, `"DISALLOWED"` or `"UNASSIGNED"`.

### `VERSION`

The Unicode version of the data, such as `"18.0.0"`.

## License

MIT. Includes data from the Unicode IDNA tables and the Unicode Character Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
