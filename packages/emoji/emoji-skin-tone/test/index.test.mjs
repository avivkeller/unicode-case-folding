import assert from "node:assert/strict";
import test from "node:test";
import {
  VERSION,
  getSkinTones,
  removeSkinTone,
  setSkinTone,
  supportsSkinTone,
} from "../dist/index.mjs";

const SKIN_TONES = ["light", "medium-light", "medium", "medium-dark", "dark"];

const emoji = (...codePoints) => String.fromCodePoint(...codePoints);
const [LIGHT, MEDIUM_LIGHT, MEDIUM, , DARK] = [
  0x1f3fb, 0x1f3fc, 0x1f3fd, 0x1f3fe, 0x1f3ff,
];
const ZWJ = 0x200d;
const VS16 = 0xfe0f;
const WAVE = emoji(0x1f44b);
const DETECTIVE = emoji(0x1f575, VS16);
const WOMAN_DETECTIVE = emoji(0x1f575, VS16, ZWJ, 0x2640, VS16);
const BEARD_MAN = emoji(0x1f9d4, ZWJ, 0x2642, VS16);
const WOMAN_AND_MAN = emoji(0x1f46b);
const HANDSHAKE = emoji(0x1f91d);
const KISS = emoji(0x1f48f);
const KISS_WOMAN_MAN = emoji(
  ...[0x1f469, ZWJ, 0x2764, VS16, ZWJ, 0x1f48b, ZWJ, 0x1f468],
);
const FAMILY = emoji(0x1f468, ZWJ, 0x1f469, ZWJ, 0x1f467);

test("setSkinTone", () => {
  assert.equal(setSkinTone(WAVE, "medium"), emoji(0x1f44b, MEDIUM));
  assert.equal(setSkinTone(emoji(0x1f44b, MEDIUM), "dark"), WAVE + emoji(DARK));
  assert.equal(setSkinTone(DETECTIVE, "light"), emoji(0x1f575, LIGHT));
  assert.equal(
    setSkinTone(WOMAN_DETECTIVE, "dark"),
    emoji(0x1f575, DARK, ZWJ, 0x2640, VS16),
  );
  assert.equal(
    setSkinTone(BEARD_MAN, "medium"),
    emoji(0x1f9d4, MEDIUM, ZWJ, 0x2642, VS16),
  );
  assert.equal(
    setSkinTone(emoji(0x261d), "light"),
    emoji(0x261d, LIGHT),
    "without its variation selector",
  );
});

test("setSkinTone leaves what takes no skin tone", () => {
  assert.equal(setSkinTone(emoji(0x1f642), "dark"), emoji(0x1f642));
  assert.equal(setSkinTone(FAMILY, "dark"), FAMILY);
  assert.equal(setSkinTone("a", "dark"), "a");
  assert.equal(setSkinTone("", "dark"), "");
  assert.equal(setSkinTone(WAVE + WAVE, "dark"), WAVE + WAVE);
});

test("setSkinTone on two people", () => {
  assert.equal(setSkinTone(WOMAN_AND_MAN, "dark"), emoji(0x1f46b, DARK));
  assert.equal(
    setSkinTone(WOMAN_AND_MAN, ["dark", "dark"]),
    emoji(0x1f46b, DARK),
  );
  assert.equal(
    setSkinTone(WOMAN_AND_MAN, ["light", "dark"]),
    emoji(0x1f469, LIGHT, ZWJ, 0x1f91d, ZWJ, 0x1f468, DARK),
  );
  assert.equal(
    setSkinTone(HANDSHAKE, ["medium", "light"]),
    emoji(0x1faf1, MEDIUM, ZWJ, 0x1faf2, LIGHT),
  );
  assert.equal(
    setSkinTone(KISS, ["light", "medium-light"]),
    emoji(
      ...[0x1f9d1, LIGHT, ZWJ, 0x2764, VS16, ZWJ, 0x1f48b, ZWJ],
      ...[0x1f9d1, MEDIUM_LIGHT],
    ),
  );
  assert.equal(
    setSkinTone(KISS_WOMAN_MAN, "medium"),
    emoji(
      ...[0x1f469, MEDIUM, ZWJ, 0x2764, VS16, ZWJ, 0x1f48b, ZWJ],
      ...[0x1f468, MEDIUM],
    ),
  );
  assert.equal(
    setSkinTone(setSkinTone(HANDSHAKE, ["medium", "light"]), "dark"),
    emoji(0x1f91d, DARK),
  );
});

test("setSkinTone rejects invalid arguments", () => {
  assert.throws(() => setSkinTone(WAVE, "pale"), RangeError);
  assert.throws(() => setSkinTone(WAVE), RangeError);
  assert.throws(() => setSkinTone(WAVE, ["light", "dark"]), RangeError);
  assert.throws(() => setSkinTone(HANDSHAKE, ["light"]), RangeError);
  assert.throws(() => setSkinTone(HANDSHAKE, ["light", "pale"]), RangeError);
  assert.throws(() => setSkinTone(0x1f44b, "light"), TypeError);
});

test("removeSkinTone", () => {
  assert.equal(removeSkinTone(emoji(0x1f44b, MEDIUM)), WAVE);
  assert.equal(removeSkinTone(WAVE), WAVE);
  assert.equal(removeSkinTone(emoji(0x1f575, DARK)), DETECTIVE);
  assert.equal(
    removeSkinTone(emoji(0x1f575, DARK, ZWJ, 0x2640, VS16)),
    WOMAN_DETECTIVE,
  );
  assert.equal(
    removeSkinTone(emoji(0x1faf1, MEDIUM, ZWJ, 0x1faf2, LIGHT)),
    HANDSHAKE,
  );
  assert.equal(
    removeSkinTone(setSkinTone(WOMAN_AND_MAN, ["light", "dark"])),
    WOMAN_AND_MAN,
  );
  assert.equal(removeSkinTone(setSkinTone(KISS, ["light", "dark"])), KISS);
  assert.equal(removeSkinTone("abc"), "abc");
});

test("getSkinTones", () => {
  assert.deepEqual(getSkinTones(emoji(0x1f44b, MEDIUM)), ["medium"]);
  assert.deepEqual(getSkinTones(WAVE), []);
  assert.deepEqual(getSkinTones("a"), []);
  assert.deepEqual(getSkinTones(emoji(0x1f46b, DARK)), ["dark", "dark"]);
  assert.deepEqual(
    getSkinTones(setSkinTone(WOMAN_AND_MAN, ["light", "dark"])),
    ["light", "dark"],
  );
  assert.deepEqual(getSkinTones(emoji(MEDIUM)), [], "a modifier alone");
});

test("supportsSkinTone", () => {
  assert.equal(supportsSkinTone(WAVE), true);
  assert.equal(supportsSkinTone(emoji(0x1f44b, MEDIUM)), true);
  assert.equal(supportsSkinTone(HANDSHAKE), true);
  assert.equal(supportsSkinTone(FAMILY), false);
  assert.equal(supportsSkinTone("a"), false);
});

test("the results are emoji for the engine", () => {
  const native = /^\p{RGI_Emoji}$/v;
  const check = (base, tone) => {
    const variant = setSkinTone(base, tone);
    assert.ok(native.test(variant), variant);
    assert.equal(removeSkinTone(variant), base);
  };
  for (const first of SKIN_TONES) {
    for (const base of [WAVE, DETECTIVE, BEARD_MAN, WOMAN_AND_MAN, KISS]) {
      check(base, first);
    }
    for (const second of SKIN_TONES) {
      check(WOMAN_AND_MAN, [first, second]);
      check(KISS, [first, second]);
    }
  }
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.setSkinTone);
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+$/);
});
