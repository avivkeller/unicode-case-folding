import assert from "node:assert/strict";
import test from "node:test";
import {
  VERSION,
  getDefaultPresentation,
  toEmojiPresentation,
  toTextPresentation,
} from "../dist/index.mjs";

const VS15 = "︎";
const VS16 = "️";
const SMILE = "☺";
const WATCH = "⌚";
const POINTING = "☝";
const GRINNING = "\u{1F600}";
const MEDIUM = "\u{1F3FD}";
const KEYCAP = "⃣";

test("toEmojiPresentation", async (t) => {
  const cases = [
    [SMILE, SMILE + VS16, "text by default"],
    [SMILE + VS15, SMILE + VS16, "replaces the text selector"],
    [SMILE + VS16, SMILE + VS16, "already an emoji"],
    [WATCH, WATCH, "emoji by default"],
    [WATCH + VS15, WATCH, "emoji by default, forced to text"],
    [WATCH + VS16, WATCH + VS16, "keeps a selector that is not needed"],
    [GRINNING, GRINNING, "no text presentation"],
    [`a ${SMILE}${SMILE} b`, `a ${SMILE}${VS16}${SMILE}${VS16} b`, "in a text"],
    ["© 2026 #1 *", "©️ 2026 #1 *", "numbers stay"],
    [
      `1${KEYCAP}#${VS15}${KEYCAP}`,
      `1${VS16}${KEYCAP}#${VS16}${KEYCAP}`,
      "keycaps",
    ],
    [`7${VS15}`, `7${VS16}`, "a digit with a selector"],
    [POINTING + MEDIUM, POINTING + MEDIUM, "a skin tone"],
    ["plain text", "plain text", "no emoji"],
    ["", "", "empty string"],
  ];
  for (const [input, expected, description] of cases) {
    await t.test(description, () => {
      assert.equal(toEmojiPresentation(input), expected);
      assert.equal(toEmojiPresentation(expected), expected, "idempotent");
    });
  }
});

test("toTextPresentation", async (t) => {
  const cases = [
    [SMILE, SMILE + VS15, "text by default"],
    [SMILE + VS16, SMILE + VS15, "replaces the emoji selector"],
    [WATCH, WATCH + VS15, "emoji by default"],
    [GRINNING, GRINNING, "no text presentation"],
    ["↩ © 2026 #1", `↩${VS15} ©${VS15} 2026 #1`, "in a text"],
    [`1${VS16}${KEYCAP}`, `1${VS15}${KEYCAP}`, "a keycap"],
    [POINTING + MEDIUM, POINTING + MEDIUM, "a skin tone"],
    ["", "", "empty string"],
  ];
  for (const [input, expected, description] of cases) {
    await t.test(description, () => {
      assert.equal(toTextPresentation(input), expected);
      assert.equal(toTextPresentation(expected), expected, "idempotent");
    });
  }
});

test("the results are emoji and text for the engine", () => {
  const rgi = /^\p{RGI_Emoji}$/v;
  const emojiPresentation = /^\p{Emoji_Presentation}$/u;
  for (let codePoint = 0x80; codePoint <= 0x1ffff; codePoint++) {
    const char = String.fromCodePoint(codePoint);
    if (toTextPresentation(char) === char || !/\p{Emoji}/u.test(char)) {
      continue;
    }
    const emoji = toEmojiPresentation(char);
    assert.ok(rgi.test(emoji), `U+${codePoint.toString(16)}`);
    assert.equal(emoji === char, emojiPresentation.test(char));
    assert.equal(toTextPresentation(emoji), char + VS15);
    assert.equal(rgi.test(toTextPresentation(emoji)), false);
  }
});

test("getDefaultPresentation", () => {
  assert.equal(getDefaultPresentation(0x263a), "text");
  assert.equal(getDefaultPresentation(0xa9), "text");
  assert.equal(getDefaultPresentation(0x31), "text", "a keycap base");
  assert.equal(getDefaultPresentation(0x231a), "emoji");
  assert.equal(getDefaultPresentation(0x1f600), "emoji");
  assert.equal(getDefaultPresentation(0x1f1ef), "emoji", "regional indicator");
  assert.equal(getDefaultPresentation(0x41), undefined);
  assert.equal(getDefaultPresentation(0x10ffff), undefined);
  assert.throws(() => getDefaultPresentation("A"), TypeError);
  assert.throws(() => getDefaultPresentation(-1), RangeError);
});

test("getDefaultPresentation agrees with the engine for known characters", () => {
  const assigned = /\p{Assigned}/u;
  const emoji = /\p{Emoji}/u;
  const emojiPresentation = /\p{Emoji_Presentation}/u;
  for (let codePoint = 0; codePoint <= 0x10ffff; codePoint++) {
    if (codePoint >= 0xd800 && codePoint <= 0xdfff) continue;
    const char = String.fromCodePoint(codePoint);
    if (!assigned.test(char)) continue;
    const expected = emojiPresentation.test(char)
      ? "emoji"
      : emoji.test(char)
        ? "text"
        : undefined;
    assert.equal(
      getDefaultPresentation(codePoint),
      expected,
      `U+${codePoint.toString(16)}`,
    );
  }
});

test("rejects invalid arguments", () => {
  assert.throws(() => toEmojiPresentation(0x263a), TypeError);
  assert.throws(() => toTextPresentation(null), TypeError);
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.toEmojiPresentation);
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
