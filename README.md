# unicode-case-folding

A JavaScript library for Unicode case folding based on the official Unicode Character Database.

## What is Case Folding?

Case folding is the process of removing case distinctions in a string. It's similar to case conversion but specifically designed for case-insensitive comparisons rather than display.

Unlike simple case conversion, Unicode case folding follows specific rules defined in the Unicode standard to ensure proper internationalized case-insensitive comparisons.

## Installation

```bash
npm install unicode-case-folding
```

## Usage

```javascript
import { caseFold, caseFoldEquals } from 'unicode-case-folding';

// Basic case folding
const folded = caseFold('Hello World');
console.log(folded);  // "hello world"

// Case-insensitive comparison
console.log(caseFoldEquals('HELLO', 'hello'));  // true
console.log(caseFoldEquals('ẞ', 'ss'));  // true (German sharp S)
console.log(caseFoldEquals('Straße', 'strasse'));  // true

// Special case foldings
console.log(caseFold('ẞ'));  // "ss" (German sharp S folds to "ss")
```

## API

### caseFold(string)

Applies Unicode case folding to the input string.

- **Parameters:** `string` - The string to case fold
- **Returns:** The case-folded string

### caseFoldEquals(string1, string2)

Compares two strings for equality using Unicode case folding.

- **Parameters:**
  - `string1` - First string to compare
  - `string2` - Second string to compare
- **Returns:** `true` if the strings are case-fold equivalent, `false` otherwise

### lookupFolding(codePoint)

Returns the case folding mapping for a specific code point.

- **Parameters:** `codePoint` - Unicode code point as a number
- **Returns:** Array of code points this character folds to, or undefined if no folding exists

## License

MIT