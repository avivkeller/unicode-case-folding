import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  VERSION,
  countEmoji,
  emojiRegex,
  findEmoji,
  isEmoji,
  stripEmoji,
} from "../dist/index.mjs";

const FAMILY = "\u{1F468}‍\u{1F469}‍\u{1F467}";
const WAVE = "\u{1F44B}\u{1F3FD}";
const JAPAN = "\u{1F1EF}\u{1F1F5}";
const KEYCAP = "1️⃣";

const cases = fs
  .readFileSync(new URL("emoji-test.txt", import.meta.url), "utf8")
  .split("\n")
  .filter((line) => line && !line.startsWith("#"))
  .map((line) => {
    const [codePoints, status, version] = line.split(" ; ");
    const emoji = String.fromCodePoint(
      ...codePoints.split(" ").map((hex) => parseInt(hex, 16)),
    );
    return { line, emoji, status, version: Number(version) };
  });
const isRecommended = ({ status }) =>
  status === "fully-qualified" || status === "component";

test("emojiRegex", () => {
  const text = `a${WAVE}b${JAPAN}${FAMILY} ${KEYCAP}`;
  assert.deepEqual(text.match(emojiRegex()), [WAVE, JAPAN, FAMILY, KEYCAP]);
  assert.equal(emojiRegex().flags, "gu");
  assert.equal(emojiRegex("v").flags, "v");
  assert.notEqual(emojiRegex(), emojiRegex(), "a new RegExp each time");
  assert.throws(() => emojiRegex("g"), RangeError);
  assert.throws(() => emojiRegex(1), TypeError);
});

test("the longest emoji wins, and its pieces match when it is not one", () => {
  const man = "\u{1F468}";
  assert.deepEqual(`${man}‍${man}`.match(emojiRegex()), [man, man]);
  assert.deepEqual("\u{1F1EF}".match(emojiRegex()), null);
  assert.deepEqual("\u{1F1FA}\u{1F1F8}\u{1F1EF}".match(emojiRegex()), [
    "\u{1F1FA}\u{1F1F8}",
  ]);
});

test("isEmoji", () => {
  assert.equal(isEmoji(FAMILY), true);
  assert.equal(isEmoji(JAPAN), true);
  assert.equal(isEmoji(KEYCAP), true);
  assert.equal(isEmoji("©️"), true);
  assert.equal(isEmoji("©"), false, "text by default");
  assert.equal(isEmoji("1"), false);
  assert.equal(isEmoji(`${WAVE} `), false);
  assert.equal(isEmoji(WAVE + WAVE), false);
  assert.equal(isEmoji(""), false);
  assert.throws(() => isEmoji(0x1f600), TypeError);
});

test("findEmoji", () => {
  assert.deepEqual(findEmoji(`a ${WAVE} b${JAPAN}`), [
    { emoji: WAVE, index: 2 },
    { emoji: JAPAN, index: 8 },
  ]);
  assert.deepEqual(findEmoji("no emoji: 123 #"), []);
  assert.deepEqual(findEmoji(WAVE), findEmoji(WAVE), "no state is kept");
});

test("countEmoji", () => {
  assert.equal(countEmoji(FAMILY + JAPAN + WAVE), 3);
  assert.equal(countEmoji("abc"), 0);
});

test("stripEmoji", () => {
  assert.equal(stripEmoji(`Hi ${WAVE}!`), "Hi !");
  assert.equal(stripEmoji(`${FAMILY}${KEYCAP}`), "");
  assert.equal(stripEmoji("1 # *"), "1 # *");
});

test("emoji-test.txt", () => {
  assert.ok(cases.length >= 5000);
  const failures = cases
    .filter((entry) => isEmoji(entry.emoji) !== isRecommended(entry))
    .map(({ line }) => line);
  assert.deepEqual(failures, []);
});

test("agrees with the engine's \\p{RGI_Emoji} on the emoji it knows", () => {
  const native = /^\p{RGI_Emoji}$/v;
  const engine = Number(process.versions.unicode);
  const known = cases.filter(({ version }) => version <= engine);
  assert.ok(known.length >= 4000);
  const failures = known
    .filter(({ emoji }) => isEmoji(emoji) !== native.test(emoji))
    .map(({ line }) => line);
  assert.deepEqual(failures, []);
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.emojiRegex);
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+$/);
});
