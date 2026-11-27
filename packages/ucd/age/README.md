# unicode-age

Finds the Unicode version that introduced a character, or the version a
string needs, using the latest Unicode Character Database
([DerivedAge.txt](https://www.unicode.org/Public/UCD/latest/ucd/DerivedAge.txt)).
Useful to tell whether text, especially emoji, can display on systems that
support an older Unicode version.

## Installation

```sh
npm install unicode-age
```

## Usage

```js
import { getAge, getRequiredVersion, isAssignedIn } from "unicode-age";

getAge(0x1f600); // "6.1" (😀)
getRequiredVersion("Hello 🫨"); // "15.0"
isAssignedIn(0x1fae8, "14.0"); // false
```

## API

### `getAge(codePoint)`

Returns the version (as `"major.minor"`) that assigned a code point, or
`undefined` if it is unassigned.

### `getRequiredVersion(text)`

Returns the newest version that assigned one of the text's characters, or
`undefined` if the text contains unassigned code points.

### `isAssignedIn(codePoint, version)`

Returns whether a code point is assigned in a Unicode version such as
`"15.1"`. As in the UCD's Age property, noncharacters (such as U+FFFE)
count as assigned from the version that designated them.

### `VERSION`

The Unicode version of the data, such as `"18.0.0"`.

## License

MIT. Includes data from the Unicode Character Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
