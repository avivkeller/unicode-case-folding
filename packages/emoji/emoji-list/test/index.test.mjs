import assert from "node:assert/strict";
import test from "node:test";
import {
  VERSION,
  getEmojiGroups,
  getEmojiInfo,
  getEmojiList,
} from "../dist/index.mjs";

const WAVE = "\u{1F44B}";
const WAVE_MEDIUM = "\u{1F44B}\u{1F3FD}";

test("getEmojiList", () => {
  const list = getEmojiList();
  assert.ok(list.length >= 3900);
  assert.deepEqual(list[0], {
    emoji: "\u{1F600}",
    name: "grinning face",
    group: "Smileys & Emotion",
    subgroup: "face-smiling",
    version: "1.0",
    status: "fully-qualified",
  });
  assert.equal(list.at(-1).group, "Flags");
  assert.ok(list.every(({ status }) => status === "fully-qualified"));
  assert.equal(new Set(list.map(({ emoji }) => emoji)).size, list.length);
  assert.ok(list.every(({ name }) => /^\P{Cc}+$/u.test(name)));
  assert.ok(list.every(({ version }) => /^\d+\.\d$/.test(version)));

  list[0].name = "mutated";
  assert.equal(getEmojiList()[0].name, "grinning face", "returns copies");
});

test("getEmojiList keeps the keyboard order", () => {
  const emojis = getEmojiList().map(({ emoji }) => emoji);
  assert.ok(emojis.indexOf(WAVE) < emojis.indexOf(WAVE_MEDIUM));
  assert.ok(emojis.indexOf(WAVE_MEDIUM) < emojis.indexOf("\u{1F436}"));
  assert.equal(emojis.indexOf(WAVE_MEDIUM), emojis.indexOf(WAVE) + 3);
});

test("getEmojiList options", () => {
  const all = getEmojiList();
  const flags = getEmojiList({ group: "Flags" });
  assert.ok(flags.length > 250);
  assert.ok(flags.every(({ group }) => group === "Flags"));
  assert.deepEqual(flags, all.slice(-flags.length));

  const plain = getEmojiList({ skinTones: false });
  assert.ok(plain.length < all.length / 2);
  assert.ok(plain.some(({ emoji }) => emoji === WAVE));
  assert.ok(plain.every(({ name }) => !name.includes("skin tone")));

  assert.deepEqual(getEmojiList({ group: "Component" }), []);

  assert.throws(() => getEmojiList({ group: "flags" }), RangeError);
  assert.throws(() => getEmojiList({ group: 1 }), TypeError);
});

test("getEmojiInfo", () => {
  assert.deepEqual(getEmojiInfo(WAVE_MEDIUM), {
    emoji: WAVE_MEDIUM,
    name: "waving hand: medium skin tone",
    group: "People & Body",
    subgroup: "hand-fingers-open",
    version: "1.0",
    status: "fully-qualified",
  });
  assert.equal(getEmojiInfo("\u{1F1EF}\u{1F1F5}").name, "flag: Japan");
  assert.equal(
    getEmojiInfo("\u{1F469}\u{1F3FB}‍❤️‍\u{1F468}\u{1F3FE}").name,
    "couple with heart: woman, man, light skin tone, medium-dark skin tone",
  );
  assert.equal(getEmojiInfo("☺").status, "unqualified");
  assert.equal(getEmojiInfo("☺").name, "smiling face");
  assert.equal(getEmojiInfo("\u{1F3FB}").status, "component");
  assert.equal(getEmojiInfo("a"), undefined);
  assert.equal(getEmojiInfo(""), undefined);
  assert.throws(() => getEmojiInfo(0x1f600), TypeError);
});

test("getEmojiGroups", () => {
  const groups = getEmojiGroups();
  assert.deepEqual(
    groups.map(({ group }) => group),
    [
      "Smileys & Emotion",
      "People & Body",
      "Animals & Nature",
      "Food & Drink",
      "Travel & Places",
      "Activities",
      "Objects",
      "Symbols",
      "Flags",
    ],
  );
  assert.equal(groups[0].subgroups[0], "face-smiling");
  assert.deepEqual(groups.at(-1).subgroups, [
    "flag",
    "country-flag",
    "subdivision-flag",
  ]);

  const listed = groups.flatMap(({ group }) => getEmojiList({ group }));
  assert.deepEqual(listed, getEmojiList());
  const subgroups = groups.flatMap(({ subgroups }) => subgroups);
  assert.deepEqual(
    [...new Set(listed.map(({ subgroup }) => subgroup))],
    subgroups,
  );
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.getEmojiList);
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+$/);
});
