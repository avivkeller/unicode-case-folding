import assert from "node:assert/strict";
import test from "node:test";
import {
  VERSION,
  fromPresentationForms,
  getJoiningGroup,
  getJoiningType,
  toPresentationForms,
} from "../dist/index.mjs";

const chars = (...codePoints) => String.fromCodePoint(...codePoints);

test("toPresentationForms", async (t) => {
  const cases = [
    ["محمد", chars(0xfee3, 0xfea4, 0xfee4, 0xfeaa), "initial, medial, final"],
    [
      "العربية",
      chars(0xfe8d, 0xfedf, 0xfecc, 0xfeae, 0xfe91, 0xfef4, 0xfe94),
      "right-joining letters do not join the next one",
    ],
    ["سلام", chars(0xfeb3, 0xfefc, 0xfee1), "final lam-alef"],
    ["لا لأ", chars(0xfefb, 0x20, 0xfef7), "isolated lam-alef"],
    ["ء", chars(0xfe80), "non-joining letter"],
    ["پژ", chars(0xfb58, 0xfb8b), "Persian letters"],
    ["بَبّ", chars(0xfe91, 0x64e, 0xfe90, 0x651), "marks are transparent"],
    ["لَا", chars(0xfefb, 0x64e), "marks go after a ligature"],
    ["ـبـ", chars(0x640, 0xfe92, 0x640), "tatweel joins"],
    ["ب‍ب", chars(0xfe91, 0x200d, 0xfe90), "zero width joiner"],
    ["ب‌ب", chars(0xfe8f, 0x200c, 0xfe8f), "zero width non-joiner"],
    ["بaب", chars(0xfe8f, 0x61, 0xfe8f), "other letters do not join"],
    ["\u{1e922}ب", chars(0x1e922, 0xfe90), "joins to an Adlam letter"],
    ["Node.js", "Node.js", "no Arabic"],
    ["", "", "empty string"],
  ];
  for (const [input, expected, description] of cases) {
    await t.test(description, () => {
      assert.equal(toPresentationForms(input), expected);
    });
  }

  await t.test("without ligatures", () => {
    assert.equal(
      toPresentationForms("سلام", { ligatures: false }),
      chars(0xfeb3, 0xfee0, 0xfe8e, 0xfee1),
    );
  });

  await t.test("rejects invalid arguments", () => {
    assert.throws(() => toPresentationForms(1), TypeError);
  });
});

test("fromPresentationForms", () => {
  assert.equal(fromPresentationForms(chars(0xfeb3, 0xfefc, 0xfee1)), "سلام");
  assert.equal(fromPresentationForms(chars(0xfdf2)), "الله", "other ligatures");
  assert.equal(fromPresentationForms("abc"), "abc");
  assert.throws(() => fromPresentationForms(1), TypeError);

  const text =
    "يولد جميع الناس أحرارًا متساوين في الكرامة والحقوق. تمام انسان‌ها آزاد به دنیا می‌آیند";
  const shaped = toPresentationForms(text);
  assert.doesNotMatch(shaped, /[ء-ي]/);
  assert.equal(fromPresentationForms(shaped), text);
});

test("getJoiningType", () => {
  assert.equal(getJoiningType(0x628), "D");
  assert.equal(getJoiningType(0x627), "R");
  assert.equal(getJoiningType(0xa872), "L", "Phags-pa superfixed letter");
  assert.equal(getJoiningType(0x640), "C");
  assert.equal(getJoiningType(0x64e), "T");
  assert.equal(getJoiningType(0x621), "U");
  assert.equal(getJoiningType(0x41), "U");
  assert.equal(getJoiningType(0x10ffff), "U");
  assert.throws(() => getJoiningType("ب"), TypeError);
});

test("getJoiningGroup", () => {
  assert.equal(getJoiningGroup(0x628), "Beh");
  assert.equal(getJoiningGroup(0x62a), "Beh");
  assert.equal(getJoiningGroup(0x6cc), "Farsi_Yeh");
  assert.equal(getJoiningGroup(0x710), "Alaph");
  assert.equal(getJoiningGroup(0x41), undefined);
  assert.throws(() => getJoiningGroup(-1), RangeError);
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.toPresentationForms);
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
