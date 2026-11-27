# unicode-spoof-checker

Detects look-alike and mixed-script strings with the Unicode Security
Mechanisms of [UTS #39](https://www.unicode.org/reports/tr39/), generated
from the latest [Unicode security data](https://www.unicode.org/Public/security/latest/)
and Unicode Character Database: confusable skeletons, mixed-script detection,
restriction levels, and the identifier status and type of characters.

Skeletons follow the current definition of UTS #39, which first lays a
string out for display with the Unicode Bidirectional Algorithm, so that text
with right-to-left characters is compared as it is shown.

## Installation

```sh
npm install unicode-spoof-checker
```

## Usage

```js
import {
  areConfusable,
  getConfusableType,
  getRestrictionLevel,
  isMixedScript,
  skeleton,
} from "unicode-spoof-checker";

// "paypal" with two Cyrillic letters a
areConfusable("paypal", "pаypаl"); // true
skeleton("pаypаl"); // "paypal"
skeleton("m"); // "rn"
getConfusableType("paypal", "pаypаl"); // "mixed-script"
getConfusableType("scope", "ѕсоре"); // "whole-script"

isMixedScript("pаypal"); // true

getRestrictionLevel("paypal"); // "ascii-only"
getRestrictionLevel("Ελλάδα"); // "single-script"
getRestrictionLevel("abcひらがな漢字"); // "highly-restrictive"
getRestrictionLevel("Toys-Я-Us"); // "minimally-restrictive"
getRestrictionLevel("a‍b"); // "unrestricted" (ZWJ is not allowed)
```

## API

### `skeleton(string, options?)`

Returns the skeleton of a string (UTS #39, Section 4). Two strings are
confusable when their skeletons are equal. Skeletons are for comparison
only: they are not meant to be displayed, and they change between Unicode
versions, so stored skeletons must be recomputed after an update.

The string is laid out for display with the Unicode Bidirectional Algorithm,
normalized to NFD, stripped of default ignorable characters (such as soft
hyphens and zero width joiners), mapped to the prototypes of
confusables.txt, and normalized to NFD again.

`options.direction` is the paragraph direction the string is displayed in:
`"ltr"` (the default, which is the `skeleton` of UTS #39), `"rtl"`, or
`"auto"` (the direction of the first strong character, as with
`dir="auto"` in HTML). `"rtl"` and `"auto"` give the `bidiSkeleton` of UTS #39
for those directions.

### `areConfusable(string1, string2, options?)`

Returns whether the skeletons of two strings are equal. Takes the same
options as `skeleton()`.

```js
// Equal when displayed left to right, but not right to left
const s1 = "A1<שׂ";
const s2 = "Αשֺ>1";
areConfusable(s1, s2); // true
areConfusable(s1, s2, { direction: "rtl" }); // false
```

### `getConfusableType(string1, string2)`

Classifies two confusable strings by their scripts (UTS #39, Section 4):

- `"single-script"`: their resolved script sets share a script, as for
  "ljeto" written with and without U+01C9 LATIN SMALL LETTER LJ.
- `"whole-script"`: they share no script, and each is single-script, as for
  "scope" in Latin and in Cyrillic letters.
- `"mixed-script"`: they share no script, and one of them is mixed-script, as
  for "paypal" with a Cyrillic "a".

Returns `null` if the strings are not confusable.

### `getResolvedScripts(string)`

Returns the resolved script set of a string (UTS #39, Section 5.1): the
sorted [ISO 15924](https://www.unicode.org/iso15924/) codes of the scripts
that every character belongs to, by its Script_Extensions property. Han
characters also belong to the writing systems Hanb, Hntl, Jpan and Kore,
Hiragana and Katakana to Jpan, Hangul to Kore, Bopomofo to Hanb, and Latin to
Hntl.

The array is empty for a mixed-script string. Returns `null` when any script
would do: for strings of only Common and Inherited characters, such as
digits and punctuation, and for the empty string.

```js
getResolvedScripts("Circle"); // ["Hntl", "Latn"]
getResolvedScripts("ねガ"); // ["Jpan"]
getResolvedScripts("pаypal"); // []
getResolvedScripts("2024"); // null
```

### `isMixedScript(string)`

Returns whether a string is mixed-script, i.e. whether its resolved script
set is empty.

### `getRestrictionLevel(identifier)`

Returns the restriction level of an identifier (UTS #39, Section 5.2), for
the General Security Profile:

| Level                      | Identifier                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| `"ascii-only"`             | Only ASCII characters                                                                            |
| `"single-script"`          | One script, such as Greek, or Japanese kana and kanji                                            |
| `"highly-restrictive"`     | Latin with Han and Hiragana or Katakana, with Han and Bopomofo, or with Han and Hangul           |
| `"moderately-restrictive"` | Latin and one other recommended script, except Cyrillic and Greek                                |
| `"minimally-restrictive"`  | Any other mixture of scripts                                                                     |
| `"unrestricted"`           | Has a character that the General Security Profile does not allow (see `isAllowedInIdentifier()`) |

Characters of the Common and Inherited scripts, such as digits, go with any
script. The identifier is compared in NFC, and a character is allowed if it
is, or if the characters it decomposes to are, so canonically equivalent
identifiers have the same level. The identifier syntax is not checked.

Since Unicode 17, Bopomofo is a Limited Use script, which the General
Security Profile does not allow, so Latin with Han and Bopomofo is
`"unrestricted"`.

### `isAllowedInIdentifier(codePoint)`

Returns whether the General Security Profile for Identifiers (UTS #39,
Section 3.1) allows a code point: whether its Identifier_Status is Allowed.

### `getIdentifierTypes(codePoint)`

Returns the Identifier_Type values of a code point, which tell why a
character is restricted in identifiers (such as `"Obsolete"` or
`"Not_NFKC"`), or why it is allowed (`"Recommended"` or `"Inclusion"`).
Values are in the order of Table 1 of UTS #39.

```js
getIdentifierTypes(0x61); // ["Recommended"]
getIdentifierTypes(0x0138); // ["Obsolete"] (ĸ)
getIdentifierTypes(0x2460); // ["Not_NFKC"] (①)
```

### `VERSION`

The version of the Unicode security data, such as `"18.0.0"`.

## Conformance

The package implements Section 4 (confusable detection, including the
single-script, mixed-script and whole-script classes of two strings),
Section 5.1 (mixed-script detection) and Section 5.2 (restriction levels) of
UTS #39. Its Unicode Bidirectional Algorithm passes all 770,241 test cases of
BidiTest.txt and all 91,707 of BidiCharacterTest.txt.

Not implemented: finding whether a string has any whole-script or
mixed-script confusable (Sections 4.1 and 4.2), mixed-number detection
(Section 5.3), the contexts for joining controls (Section 3.1.1), and the IDN
and email profiles (Sections 3.2 and 3.3).

NFD and NFC come from the JavaScript engine (`String.prototype.normalize()`),
so characters newer than the engine's Unicode version are not normalized.

## License

MIT. Includes data from the Unicode security data (UTS #39) and the Unicode Character Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
