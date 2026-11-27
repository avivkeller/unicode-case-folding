# unicode-idna

Converts internationalized domain names to ASCII (Punycode) and back, and
validates them, with Unicode IDNA Compatibility Processing
([UTS #46](https://www.unicode.org/reports/tr46/)) and the latest
[IDNA mapping table](https://www.unicode.org/Public/idna/latest/IdnaMappingTable.txt).
It is the algorithm browsers apply to the host of a URL. Unlike
`url.domainToASCII()` of Node.js, it works in any runtime, uses the data of
the latest Unicode version, and lets you choose how strict to be.

It passes every case of the official
[IdnaTestV2.txt](https://www.unicode.org/Public/idna/latest/IdnaTestV2.txt)
conformance file.

## Installation

```sh
npm install unicode-idna
```

## Usage

```js
import { domainToASCII, domainToUnicode } from "unicode-idna";

domainToASCII("Bücher.de"); // "xn--bcher-kva.de"
domainToASCII("日本語。ＪＰ"); // "xn--wgv71a119e.jp"
domainToASCII("faß.de"); // "xn--fa-hia.de"
domainToASCII("a_b.com"); // undefined (not a letter, digit or hyphen)
domainToASCII("xn--u-ccb.com"); // undefined (not in Normalization Form C)

domainToUnicode("xn--bcher-kva.de"); // "bücher.de"
domainToUnicode("EXAMPLE.com"); // "example.com"

// As the URL standard does for hosts
const options = {
  checkHyphens: false,
  useStd3AsciiRules: false,
  verifyDnsLength: false,
};
domainToASCII("_dmarc.example.com", options); // "_dmarc.example.com"
```

The default export is `domainToASCII`, with every export as a property:
`import domainToASCII from "unicode-idna"`.

## API

### `domainToASCII(domain, options?)`

Returns the domain name with each label that has non-ASCII characters in
Punycode, or `undefined` if the domain name is invalid. The domain is
mapped first: lowercased, normalized, and with its compatibility characters
and its other dots (such as `。`) replaced.

### `domainToUnicode(domain, options?)`

Returns the domain name with its Punycode labels decoded, mapped the same
way. An invalid domain name is converted as far as possible; use `toUnicode`
to learn whether it was valid.

### `toASCII(domain, options?)` and `toUnicode(domain, options?)`

The ToASCII and ToUnicode operations of UTS #46. Both return
`{ domain, error }`, where `domain` is the converted string, also when
`error` is `true`.

### Options

The options are the flags of UTS #46. Every check is on by default.

| Option                  | Default | When `true`                                                                                                    |
| ----------------------- | ------- | -------------------------------------------------------------------------------------------------------------- |
| `checkHyphens`          | `true`  | A label may not start or end with a hyphen, nor have hyphens in its third and fourth positions                 |
| `checkBidi`             | `true`  | Labels of a domain name with right-to-left characters follow the Bidi rule of RFC 5893                         |
| `checkJoiners`          | `true`  | Zero width joiners and non-joiners are only allowed where RFC 5892 allows them                                 |
| `useStd3AsciiRules`     | `true`  | The only ASCII characters allowed are letters, digits and hyphens                                              |
| `verifyDnsLength`       | `true`  | `toASCII` and `domainToASCII` only: labels have 1 to 63 characters, and the domain name at most 253            |
| `transitional`          | `false` | Deprecated transitional processing: `ß` becomes `ss`, `ς` becomes `σ`, and joiners are removed, as in IDNA2003 |
| `ignoreInvalidPunycode` | `false` | A label that starts with `xn--` but is not valid Punycode is left as it is, without an error                   |

With `verifyDnsLength`, an empty label is an error, including the one after
a trailing dot (`"example.com."`).

### `VERSION`

The Unicode version of the data, such as `"18.0.0"`.

## License

MIT. Includes data from the Unicode IDNA mapping table and the Unicode Character Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
