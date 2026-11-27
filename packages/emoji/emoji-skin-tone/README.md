# unicode-emoji-skin-tone

Applies, changes, reads and removes the skin tone of an emoji, using the
latest Unicode emoji data
([emoji-test.txt](https://www.unicode.org/Public/emoji/latest/emoji-test.txt),
[UTS #51](https://www.unicode.org/reports/tr51/)).

Appending a skin tone modifier to an emoji is not enough: "🕵️" loses its
variation selector, the tone of "🧔‍♂️" goes in the middle of the sequence,
and a couple of two skin tones, such as "👩🏻‍🤝‍👨🏿", is a different sequence
from "👫". This package only returns the emoji that are recommended for
general interchange (`RGI_Emoji`), which keyboards and fonts support.

## Installation

```sh
npm install unicode-emoji-skin-tone
```

## Usage

```js
import {
  getSkinTones,
  removeSkinTone,
  setSkinTone,
} from "unicode-emoji-skin-tone";

setSkinTone("👋", "medium"); // "👋🏽"
setSkinTone("👋🏽", "dark"); // "👋🏿"
setSkinTone("🧔‍♂️", "light"); // "🧔🏻‍♂️"
setSkinTone("🙂", "dark"); // "🙂", which has no skin tone

// Two people
setSkinTone("👫", "dark"); // "👫🏿"
setSkinTone("👫", ["light", "dark"]); // "👩🏻‍🤝‍👨🏿"
setSkinTone("🤝", ["medium", "light"]); // "🫱🏽‍🫲🏻"

getSkinTones("👋🏽"); // ["medium"]
getSkinTones("👩🏻‍🤝‍👨🏿"); // ["light", "dark"]
removeSkinTone("👩🏻‍🤝‍👨🏿"); // "👫"
```

The default export is `setSkinTone`, with every export as a property:
`import setSkinTone from "unicode-emoji-skin-tone"`.

## API

A skin tone is `"light"`, `"medium-light"`, `"medium"`, `"medium-dark"` or
`"dark"`. An emoji is a string of one emoji, with or without a skin tone.
Its variation selectors (U+FE0F) may be missing.

### `setSkinTone(emoji, tone)`

Returns the emoji with a skin tone, in place of the one it has. An emoji of
two people takes one tone for both, or an array of two tones, in the order of
the two people in the emoji. An emoji that takes no skin tone, or a string that
is not an emoji, is returned as is.

It throws a `RangeError` for an invalid tone, and for two tones on an emoji
of one person.

### `removeSkinTone(emoji)`

Returns the emoji without skin tone.

### `getSkinTones(emoji)`

Returns the skin tones of an emoji: an array of one tone, of two tones for
an emoji of two people (even if they are the same), or an empty array for an
emoji without skin tone.

### `supportsSkinTone(emoji)`

Returns whether an emoji takes a skin tone.

### `VERSION`

The Emoji version of the data, such as `"18.0"`.

## License

MIT. Includes data from the Unicode emoji data files, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
