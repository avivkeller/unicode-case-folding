import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { findLineBreaks, splitAtLineBreaks, VERSION } from "../dist/index.mjs";
import { parseLineBreakTest } from "./line-break-test.mjs";

const breaksOf = (text) =>
  findLineBreaks(text).map(({ index, required }) =>
    required ? `${index}!` : `${index}`,
  );

test("LineBreakTest.txt", () => {
  const cases = parseLineBreakTest(
    fs.readFileSync(new URL("LineBreakTest.txt", import.meta.url), "utf8"),
  );
  assert.ok(cases.length > 1000);
  const failures = cases
    .filter(({ text, breaks }) => {
      const actual = findLineBreaks(text).map(({ index }) => index);
      return actual.join() !== breaks.join();
    })
    .map(({ line }) => line);
  assert.deepEqual(failures, []);
});

test("findLineBreaks", async (t) => {
  await t.test("breaks after spaces, not inside words", () => {
    assert.deepEqual(breaksOf("Hello world"), ["6", "11!"]);
    assert.deepEqual(breaksOf("a  b"), ["3", "4!"]);
  });

  await t.test("requires breaks after line terminators", () => {
    assert.deepEqual(breaksOf("a\nb"), ["2!", "3!"]);
    assert.deepEqual(breaksOf("a\r\nb"), ["3!", "4!"], "CR LF is one break");
    assert.deepEqual(breaksOf("a\rb"), ["2!", "3!"]);
    assert.deepEqual(breaksOf("a\u2028b"), ["2!", "3!"], "LINE SEPARATOR");
    assert.deepEqual(breaksOf("a\u0085b"), ["2!", "3!"], "NEXT LINE");
    assert.deepEqual(breaksOf("\n\n"), ["1!", "2!"]);
  });

  await t.test("has no breaks in an empty text", () => {
    assert.deepEqual(findLineBreaks(""), []);
  });

  await t.test("returns UTF-16 offsets", () => {
    assert.deepEqual(breaksOf("\u{1F600} \u{1F600}"), ["3", "5!"]);
    assert.deepEqual(breaksOf("\u{1F600}\u{1F600}"), ["2", "4!"]);
  });

  await t.test("keeps punctuation with words", () => {
    assert.deepEqual(breaksOf("Hi, there!"), ["4", "10!"]);
    assert.deepEqual(breaksOf("(person(s))"), ["11!"]);
    assert.deepEqual(breaksOf("e.g. this"), ["5", "9!"]);
  });

  await t.test("breaks after hyphens, except in numbers", () => {
    assert.deepEqual(breaksOf("well-known"), ["5", "10!"]);
    assert.deepEqual(breaksOf("-5"), ["2!"]);
    assert.deepEqual(breaksOf("$(12.35) 12.54%"), ["9", "15!"]);
  });

  await t.test("breaks between ideographs", () => {
    assert.deepEqual(breaksOf("日本語ですっ。"), ["1", "2", "3", "4", "7!"]);
    assert.deepEqual(breaksOf("漢字「かな」"), ["1", "2", "4", "6!"]);
  });

  await t.test("keeps combining marks with their base", () => {
    assert.deepEqual(breaksOf("e\u0301 e\u0301"), ["3", "5!"]);
    assert.deepEqual(breaksOf("a \u0301b"), ["2", "4!"]);
  });

  await t.test("keeps emoji sequences together", () => {
    const family = "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}";
    assert.deepEqual(breaksOf(family + family), ["8", "16!"]);
    assert.deepEqual(breaksOf("\u{1F44B}\u{1F3FD}\u{1F44B}"), ["4", "6!"]);
    assert.deepEqual(breaksOf("\u{1F1EF}\u{1F1F5}\u{1F1FA}\u{1F1F8}"), [
      "4",
      "8!",
    ]);
  });

  await t.test("follows the glue of non-breaking spaces", () => {
    assert.deepEqual(breaksOf("100\u00A0km"), ["6!"]);
    assert.deepEqual(breaksOf("a\u2060b"), ["3!"], "WORD JOINER");
    assert.deepEqual(breaksOf("a\u200Bb"), ["2", "3!"], "ZERO WIDTH SPACE");
  });

  await t.test("tells Hangul LV from LVT syllables", () => {
    const vowel = "\u1161";
    for (let codePoint = 0xac00; codePoint <= 0xd7a3; codePoint++) {
      const isLV = (codePoint - 0xac00) % 28 === 0;
      const syllable = String.fromCodePoint(codePoint);
      assert.deepEqual(
        breaksOf(syllable + vowel),
        isLV ? ["2!"] : ["1", "2!"],
        `U+${codePoint.toString(16)}`,
      );
    }
  });

  await t.test("handles lone surrogates", () => {
    assert.deepEqual(breaksOf("a\uD800b"), ["3!"]);
    assert.deepEqual(breaksOf("\uDC00 \uD800"), ["2", "3!"]);
  });

  await t.test("rejects non-strings", () => {
    assert.throws(() => findLineBreaks(1), TypeError);
    assert.throws(() => findLineBreaks(null), TypeError);
  });
});

test("splitAtLineBreaks", () => {
  assert.deepEqual(splitAtLineBreaks("The quick (“brown”) fox."), [
    "The ",
    "quick ",
    "(“brown”) ",
    "fox.",
  ]);
  assert.deepEqual(splitAtLineBreaks("one\ntwo three"), [
    "one\n",
    "two ",
    "three",
  ]);
  assert.deepEqual(splitAtLineBreaks(""), []);
  const text =
    "Ünïcödé text, 日本語, 한국어 텍스트!\r\n\u{1F468}\u200D\u{1F469}";
  assert.equal(splitAtLineBreaks(text).join(""), text);
  assert.throws(() => splitAtLineBreaks(undefined), TypeError);
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
