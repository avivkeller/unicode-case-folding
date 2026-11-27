# unicode-emoji-list

The list of every emoji, in the order of an emoji keyboard, with its English
name, group, subgroup and the Emoji version that introduced it. It is
generated from the latest Unicode emoji data
([emoji-test.txt](https://www.unicode.org/Public/emoji/latest/emoji-test.txt),
[UTS #51](https://www.unicode.org/reports/tr51/)), and made for emoji
pickers, search and autocompletion.

## Installation

```sh
npm install unicode-emoji-list
```

## Usage

```js
import { getEmojiGroups, getEmojiInfo, getEmojiList } from "unicode-emoji-list";

getEmojiList()[0];
// {
//   emoji: "😀",
//   name: "grinning face",
//   group: "Smileys & Emotion",
//   subgroup: "face-smiling",
//   version: "1.0",
//   status: "fully-qualified",
// }

// A picker: one section per group, without the skin tone variants
for (const { group } of getEmojiGroups()) {
  const section = getEmojiList({ group, skinTones: false });
}

getEmojiInfo("👋🏽").name; // "waving hand: medium skin tone"
getEmojiInfo("🫩").version; // "16.0"
```

The default export is `getEmojiList`, with every export as a property:
`import getEmojiList from "unicode-emoji-list"`.

## API

### `getEmojiList(options?)`

Returns the emoji in keyboard order: smileys first, flags last. Each is an
object with:

- `emoji`: the emoji, as a string.
- `name`: its English name, in lowercase.
- `group` and `subgroup`: where it is in the keyboard, such as
  `"People & Body"` and `"hand-fingers-open"`.
- `version`: the Emoji version that introduced it, such as `"13.1"`.
  `"0.6"`, `"0.7"` and `"1.0"` are for the emoji older than the versions.
- `status`: `"fully-qualified"`.

Options:

- `group`: only the emoji of a group, by its name.
- `skinTones`: `false` leaves out the variants of an emoji with a skin tone,
  about half of the list. `true` by default.

### `getEmojiInfo(emoji)`

Returns the same object for one emoji, or `undefined` if the string is not
one. It also knows the forms that occur in text but are not in the list,
with their `status`: the emoji that lack some or all of their variation
selectors (`"minimally-qualified"` and `"unqualified"`), and the skin tone
and hair components (`"component"`).

### `getEmojiGroups()`

Returns the groups in keyboard order, each as `{ group, subgroups }`. The
group of the components, which has no emoji of its own, is left out.

### `VERSION`

The Emoji version of the data, such as `"18.0"`.

## License

MIT. Includes data from the Unicode emoji data files, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
