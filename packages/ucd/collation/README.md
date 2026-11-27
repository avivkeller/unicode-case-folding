# unicode-collation

Compares and sorts strings of any script in the default Unicode order: the
[Unicode Collation Algorithm](https://www.unicode.org/reports/tr10/)
(UTS #10) with the latest Default Unicode Collation Element Table
([allkeys.txt](https://www.unicode.org/Public/UCA/latest/allkeys.txt)).
Unlike `Intl.Collator`, it gives the same order in every engine and
version, and it makes sort keys.

It passes the conformance tests of the algorithm. The order is the default
one, without the tailorings of a language: for those, use `Intl.Collator`.

## Installation

```sh
npm install unicode-collation
```

## Usage

```js
import { compare, sortKey } from "unicode-collation";

["Zebra", "b", "á", "B", "a", "zebra"].sort(compare);
// ["a", "á", "b", "B", "zebra", "Zebra"]

compare("résumé", "resume"); // 1
compare("résumé", "resume", { strength: "primary" }); // 0
compare("co-op", "coop", { alternate: "shifted", strength: "tertiary" }); // 0

// Sort keys compare with < and >, and can be stored or indexed
const people = [{ name: "Émile" }, { name: "Zoë" }, { name: "eve" }];
const keys = new Map(people.map((person) => [person, sortKey(person.name)]));
people.sort((a, b) => (keys.get(a) < keys.get(b) ? -1 : 1));
// Émile, eve, Zoë
```

The default export is `compare`, with every export as a property:
`import compare from "unicode-collation"`.

## API

### `compare(a, b, options?)`

Returns `-1` if `a` sorts before `b`, `1` if it sorts after, and `0` if they
are equal at the strength compared. Canonically equivalent strings, such as
`"é"` and `"é"`, are always equal.

### `sortKey(text, options?)`

Returns the sort key of a string, as a string of binary data: two keys made
with the same options compare with `<`, `>` and `===` as `compare()` orders
their strings. Sorting many strings by their keys is several times faster
than sorting them with `compare()`.

### Options

- `strength`: the last level of difference that counts.
  - `"primary"`: base letters only (`a` < `b`)
  - `"secondary"`: and accents (`a` < `á`)
  - `"tertiary"`: and case and variants (`a` < `A`), the default
  - `"quaternary"`: and, with `"shifted"`, punctuation; its default
  - `"identical"`: and at last the code points of the normalized strings,
    which leaves only canonically equivalent strings equal
- `alternate`: how spaces, punctuation and symbols are weighted.
  - `"non-ignorable"`: as characters of their own, before digits and
    letters (`de luge` < `death`), the default
  - `"shifted"`: ignored up to the tertiary level (`death` < `de luge`
    < `deluge`)

### `VERSION`

The Unicode version of the data, such as `"18.0.0"`.

## License

MIT. Includes data from the Unicode Collation Algorithm, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
