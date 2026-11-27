# unicode-link-detection

Finds the URLs and email addresses of plain text, and formats URLs with as
few percent-escapes as possible, implementing Unicode Link Detection and
Formatting ([UTS #58](https://www.unicode.org/reports/tr58/)). It decides
where a link ends in any script: the period after `example.com/path.` is
left out, the closing parenthesis of `wiki/Mercury_(planet)` is kept, and
`https://ja.wikipedia.org/wiki/アルベルト・アインシュタイン` is one link.

It passes the conformance tests of UTS #58, `LinkDetectionTest.txt` and
`LinkFormattingTest.txt`.

## Installation

```sh
npm install unicode-link-detection
```

## Usage

```js
import { findLinks, formatLink } from "unicode-link-detection";

const text = "See (https://example.com/a_(b)). Or mail jane.doe@example.org.";
findLinks(text);
// [
//   { type: "url", start: 5, end: 30 },   "https://example.com/a_(b)"
//   { type: "email", start: 41, end: 61 } "jane.doe@example.org"
// ]

// As few percent-escapes as link detection allows
formatLink(
  "https://hi.wikipedia.org/wiki/%E0%A4%97%E0%A4%BE%E0%A4%82%E0%A4%A7%E0%A5%80",
);
// "https://hi.wikipedia.org/wiki/गांधी"
formatLink({ base: "https://example.com", path: ["a/b", "c."] });
// "https://example.com/a%2Fb/c%2E"
```

The default export is `findLinks`, with every export as a property:
`import findLinks from "unicode-link-detection"`.

## API

Offsets are UTF-16 offsets, as `String.prototype.slice()` takes them.

### `findLinks(text, options?)`

Returns the links of a text in order, each as `{ type, start, end }`, where
`type` is `"url"` or `"email"`.

A URL starts at `http://` or `https://`, or at a domain name without a
scheme, and may have a port, a path, a query and a fragment. An email
address has an unquoted local-part, and includes `mailto:` if it is there.

UTS #58 defines where a link ends, not where it starts: this package takes
every domain name of at least two labels whose last one is made of letters.
That includes `readme.md`. To be stricter, pass `options.acceptDomain`, a
function that is given each domain name and returns whether to link it, for
example from the
[list of top-level domains](https://data.iana.org/TLD/tlds-alpha-by-domain.txt).

Not linked: URLs with another scheme or with userinfo
(`http://user@example.com`), IP addresses without a scheme, and domain names
that directly follow `/`, `\` or `_`.

### `findLinkEnd(text, start)`

The termination algorithm of UTS #58, for use with another link detector:
given the offset just after the host and port of a URL, returns the offset
where its path, query and fragment end.

### `formatLink(link)`

Returns a URL with only the percent-escapes it needs for link detection to
find all of it, and for browsers to read it the same way. `link` is either a
URL, whose escapes are decoded where possible, or its unescaped parts:

- `base`: the scheme, host and port, copied as is
- `path`: the segments
- `query`: `[key, value]` or `[key]` pairs
- `fragment`
- `directives`: [text directives](https://wicg.github.io/scroll-to-text-fragment/),
  with their syntax, such as `"text=start,end"`

The scheme and host of a URL are not changed. If the escapes of a URL are
not all UTF-8, its non-ASCII characters stay escaped.

### `formatEmail(localPart, domain)`

Returns an email address, with the local-part quoted if it has characters
that email detection would not include.

### `VERSION`

The Unicode version of the data, such as `"18.0.0"`.

## License

MIT. Includes data from the Unicode Character Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
