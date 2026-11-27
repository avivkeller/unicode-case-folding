import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import segmenter, {
  countGraphemes,
  findGraphemeBreaks,
  findSentenceBreaks,
  findWordBreaks,
  isWordLike,
  splitGraphemes,
  splitSentences,
  splitWords,
  VERSION,
} from "../dist/index.mjs";
import { parseBreakTest } from "./break-test.mjs";

const FAMILY = "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}";
const JAPAN = "\u{1F1EF}\u{1F1F5}";
const USA = "\u{1F1FA}\u{1F1F8}";
const KA = "क";
const SSA = "ष";
const VIRAMA = "्";

function assertConforms(file, minimum, findBreaks) {
  const cases = parseBreakTest(
    fs.readFileSync(new URL(file, import.meta.url), "utf8"),
  );
  assert.ok(cases.length >= minimum);
  const failures = cases
    .filter(({ text, breaks }) => findBreaks(text).join() !== breaks.join())
    .map(({ line }) => line);
  assert.deepEqual(failures, []);
}

test("GraphemeBreakTest.txt", () => {
  assertConforms("GraphemeBreakTest.txt", 800, findGraphemeBreaks);
});

test("WordBreakTest.txt", () => {
  assertConforms("WordBreakTest.txt", 1900, findWordBreaks);
});

test("SentenceBreakTest.txt", () => {
  assertConforms("SentenceBreakTest.txt", 500, findSentenceBreaks);
});

test("findGraphemeBreaks", async (t) => {
  await t.test("has no breaks in an empty text", () => {
    assert.deepEqual(findGraphemeBreaks(""), []);
  });

  await t.test("breaks between ASCII characters", () => {
    assert.deepEqual(findGraphemeBreaks("abc"), [1, 2, 3]);
    assert.deepEqual(findGraphemeBreaks("a"), [1]);
  });

  await t.test("keeps CR LF together", () => {
    assert.deepEqual(findGraphemeBreaks("a\r\nb"), [1, 3, 4]);
    assert.deepEqual(findGraphemeBreaks("\n\r"), [1, 2]);
    assert.deepEqual(findGraphemeBreaks("\r\r\n"), [1, 3]);
    assert.deepEqual(findGraphemeBreaks("क\r\nक"), [1, 3, 4]);
  });

  await t.test("keeps combining marks with their base", () => {
    assert.deepEqual(findGraphemeBreaks("e\u0301a"), [2, 3]);
    assert.deepEqual(findGraphemeBreaks("ae\u0301\u0323"), [1, 4]);
    assert.deepEqual(findGraphemeBreaks("\n\u0301a"), [1, 2, 3]);
  });

  await t.test("keeps emoji sequences together", () => {
    assert.deepEqual(findGraphemeBreaks(FAMILY + FAMILY), [8, 16]);
    assert.deepEqual(findGraphemeBreaks("\u{1F44B}\u{1F3FD}!"), [4, 5]);
    assert.deepEqual(findGraphemeBreaks("❤\uFE0F\u200D\u{1F525}"), [5]);
    assert.deepEqual(findGraphemeBreaks("a\u200D\u{1F525}"), [2, 4]);
    assert.deepEqual(findGraphemeBreaks("©\u200D©"), [3]);
  });

  await t.test("pairs regional indicators", () => {
    assert.deepEqual(findGraphemeBreaks(JAPAN + USA), [4, 8]);
    assert.deepEqual(findGraphemeBreaks(JAPAN + "\u{1F1FA}"), [4, 6]);
    assert.deepEqual(findGraphemeBreaks("a" + JAPAN + USA), [1, 5, 9]);
  });

  await t.test("keeps Hangul syllables together", () => {
    assert.deepEqual(findGraphemeBreaks("\u1100\u1161\u11A8"), [3]);
    assert.deepEqual(findGraphemeBreaks("\uAC00\u11A8\uAC01"), [2, 3]);
    assert.deepEqual(findGraphemeBreaks("\uAC01\u1161"), [1, 2]);
    assert.deepEqual(findGraphemeBreaks("한글"), [1, 2]);
  });

  await t.test("tells Hangul LV from LVT syllables", () => {
    for (let codePoint = 0xac00; codePoint <= 0xd7a3; codePoint++) {
      const isLV = (codePoint - 0xac00) % 28 === 0;
      assert.deepEqual(
        findGraphemeBreaks(String.fromCodePoint(codePoint) + "\u1161"),
        isLV ? [2] : [1, 2],
        `U+${codePoint.toString(16)}`,
      );
    }
  });

  await t.test("keeps Indic conjuncts together", () => {
    assert.deepEqual(findGraphemeBreaks(KA + VIRAMA + SSA + "ि"), [4]);
    assert.deepEqual(findGraphemeBreaks(KA + VIRAMA + "\u200D" + SSA), [4]);
    assert.deepEqual(findGraphemeBreaks(KA + SSA), [1, 2]);
    assert.deepEqual(findGraphemeBreaks(KA + VIRAMA + "a"), [2, 3]);
  });

  await t.test("returns UTF-16 offsets", () => {
    assert.deepEqual(findGraphemeBreaks("a\u{1F600}b"), [1, 3, 4]);
    assert.deepEqual(findGraphemeBreaks("\u{1D11E}\u{1D165}"), [4]);
  });

  await t.test("handles lone surrogates", () => {
    assert.deepEqual(findGraphemeBreaks("a\uD800b\uDC00"), [1, 2, 3, 4]);
    assert.deepEqual(findGraphemeBreaks("\uDC00\uD800"), [1, 2]);
    assert.deepEqual(findGraphemeBreaks("\uD800\u0301"), [2]);
  });

  await t.test("rejects non-strings", () => {
    assert.throws(() => findGraphemeBreaks(1), TypeError);
    assert.throws(() => findGraphemeBreaks(null), TypeError);
  });
});

test("splitGraphemes", () => {
  assert.deepEqual(splitGraphemes(""), []);
  assert.deepEqual(splitGraphemes("hi!"), ["h", "i", "!"]);
  assert.deepEqual(splitGraphemes(`${JAPAN}${FAMILY}e\u0301\r\n`), [
    JAPAN,
    FAMILY,
    "e\u0301",
    "\r\n",
  ]);
  const text = "Ünïcödé, 日本語, 한국어!\r\n\u{1F468}\u200D\u{1F469}\uD800";
  assert.equal(splitGraphemes(text).join(""), text);
  assert.throws(() => splitGraphemes(undefined), TypeError);
});

test("countGraphemes", () => {
  assert.equal(countGraphemes(""), 0);
  assert.equal(countGraphemes("abc"), 3);
  assert.equal(countGraphemes(`${FAMILY} ${JAPAN}\r\n`), 4);
  assert.equal(countGraphemes(KA + VIRAMA + SSA), 1);
  assert.throws(() => countGraphemes(3), TypeError);
});

test("splitGraphemes matches Intl.Segmenter", (t) => {
  const native = new Intl.Segmenter("und", { granularity: "grapheme" });
  // The engine may follow another Unicode version: then differences are reported
  const engineVersion = process.versions.unicode;
  const sameVersion = VERSION.startsWith(`${engineVersion}.`);
  const samples = [
    "The quick brown fox, etc.\r\nNew\tline",
    "Ünïcödé e\u0301\u0323 n\u0303",
    `${FAMILY}${JAPAN}${USA}\u{1F44B}\u{1F3FD}❤\uFE0F`,
    "한국어 \u1100\u1161\u11A8 텍스트",
    "日本語のテキスト、中文",
    "עברית العربية\u0651",
    "a\u200Db\u00AD\uFEFFc",
    "\u0915\u094D\u0937\u093F \u0939\u093F\u0928\u094D\u0926\u0940 \u094D\u0915",
  ];
  for (const sample of samples) {
    const expected = Array.from(native.segment(sample), (s) => s.segment);
    const actual = splitGraphemes(sample);
    if (sameVersion) assert.deepEqual(actual, expected);
    else if (actual.join("|") !== expected.join("|")) {
      t.diagnostic(`Differs from Unicode ${engineVersion}: ${sample}`);
    }
  }
});

test("findWordBreaks", async (t) => {
  await t.test("has no breaks in an empty text", () => {
    assert.deepEqual(findWordBreaks(""), []);
  });

  await t.test("breaks around words, spaces and punctuation", () => {
    assert.deepEqual(findWordBreaks("Hello, world!"), [5, 6, 7, 12, 13]);
    assert.deepEqual(findWordBreaks("a  b"), [1, 3, 4]);
  });

  await t.test("keeps apostrophes, dots and digits inside words", () => {
    assert.deepEqual(splitWords("can't e.g. 3.14 1,000 a1"), [
      "can't",
      " ",
      "e.g",
      ".",
      " ",
      "3.14",
      " ",
      "1,000",
      " ",
      "a1",
    ]);
    assert.deepEqual(splitWords("snake_case 'quoted'"), [
      "snake_case",
      " ",
      "'",
      "quoted",
      "'",
    ]);
  });

  await t.test("keeps CR LF together", () => {
    assert.deepEqual(findWordBreaks("a\r\nb\n"), [1, 3, 4, 5]);
  });

  await t.test("ignores marks and format characters", () => {
    assert.deepEqual(findWordBreaks("e\u0301a\u00ADb c"), [5, 6, 7]);
    assert.deepEqual(findWordBreaks("\n\u0301a"), [1, 2, 3]);
    assert.deepEqual(findWordBreaks(" \u0301 "), [2, 3]);
  });

  await t.test("keeps emoji sequences and flags together", () => {
    assert.deepEqual(findWordBreaks(FAMILY + "a"), [8, 9]);
    assert.deepEqual(findWordBreaks(JAPAN + USA), [4, 8]);
  });

  await t.test("follows the Hebrew and Katakana rules", () => {
    assert.deepEqual(splitWords("א\"ב א'"), ['א"ב', " ", "א'"]);
    assert.deepEqual(splitWords("カタカナ日本"), ["カタカナ", "日", "本"]);
  });

  await t.test("keeps Hangul and Indic words together", () => {
    assert.deepEqual(splitWords("한국어 텍스트"), ["한국어", " ", "텍스트"]);
    assert.deepEqual(splitWords("क्षि है"), ["क्षि", " ", "है"]);
  });

  await t.test("returns UTF-16 offsets", () => {
    assert.deepEqual(findWordBreaks("\u{1D400}\u{1D401} \u{1F600}"), [4, 5, 7]);
  });

  await t.test("handles lone surrogates", () => {
    assert.deepEqual(findWordBreaks("a\uD800b"), [1, 2, 3]);
  });

  await t.test("rejects non-strings", () => {
    assert.throws(() => findWordBreaks(1), TypeError);
    assert.throws(() => findWordBreaks(undefined), TypeError);
  });
});

test("splitWords", () => {
  assert.deepEqual(splitWords(""), []);
  assert.deepEqual(splitWords("The quick fox."), [
    "The",
    " ",
    "quick",
    " ",
    "fox",
    ".",
  ]);
  const text =
    "Ünïcödé text, 日本語, 한국어!\r\n\u{1F468}\u200D\u{1F469}\uD800";
  assert.equal(splitWords(text).join(""), text);
  assert.throws(() => splitWords(null), TypeError);
});

test("isWordLike", () => {
  for (const segment of ["word", "É", "42", "a_b", "カタ", "日", "あ", "ก"]) {
    assert.equal(isWordLike(segment), true, segment);
  }
  for (const segment of ["", " ", ",", "\r\n", "_", "\u{1F600}", "\uD800"]) {
    assert.equal(isWordLike(segment), false, JSON.stringify(segment));
  }
  assert.equal(isWordLike("\u{1D400}"), true);
  assert.equal(isWordLike("Ⓜ"), true, "a letter that is an emoji");
  assert.deepEqual(splitWords("Hi, there! 42").filter(isWordLike), [
    "Hi",
    "there",
    "42",
  ]);
  assert.throws(() => isWordLike(1), TypeError);
});

test("findSentenceBreaks", async (t) => {
  await t.test("has no breaks in an empty text", () => {
    assert.deepEqual(findSentenceBreaks(""), []);
  });

  await t.test("breaks after terminators and their spaces", () => {
    assert.deepEqual(findSentenceBreaks("One. Two? Three!"), [5, 10, 16]);
    assert.deepEqual(findSentenceBreaks("no terminator"), [13]);
  });

  await t.test("keeps numbers, initials and lowercase continuations", () => {
    assert.deepEqual(splitSentences("It costs 3.50 in the U.S.A. today."), [
      "It costs 3.50 in the U.S.A. today.",
    ]);
    assert.deepEqual(splitSentences("e.g. this. And that"), [
      "e.g. this. ",
      "And that",
    ]);
    assert.deepEqual(splitSentences("Wait... what?! Yes."), [
      "Wait... what?! ",
      "Yes.",
    ]);
  });

  await t.test("keeps closing punctuation with the sentence", () => {
    assert.deepEqual(splitSentences("(Go.) “Now!” Then"), [
      "(Go.) ",
      "“Now!” ",
      "Then",
    ]);
  });

  await t.test("breaks after paragraph separators", () => {
    assert.deepEqual(findSentenceBreaks("a\nb\r\nc d"), [2, 5, 7, 8]);
    assert.deepEqual(findSentenceBreaks("One.\r\nTwo"), [6, 9]);
    assert.deepEqual(findSentenceBreaks("\r\n\n"), [2, 3]);
  });

  await t.test("ignores marks and format characters", () => {
    assert.deepEqual(findSentenceBreaks("One.\u0301 Two"), [6, 9]);
    assert.deepEqual(findSentenceBreaks("U\u0301.S"), [4]);
  });

  await t.test("returns UTF-16 offsets", () => {
    assert.deepEqual(findSentenceBreaks("\u{1F600}. \u{1D400}b"), [4, 7]);
    assert.deepEqual(findSentenceBreaks("a.\u{1F676} B"), [5, 6]);
  });

  await t.test("handles lone surrogates", () => {
    assert.deepEqual(findSentenceBreaks("a\uD800. B\uDC00"), [4, 6]);
  });

  await t.test("rejects non-strings", () => {
    assert.throws(() => findSentenceBreaks(1), TypeError);
    assert.throws(() => findSentenceBreaks({}), TypeError);
  });
});

test("splitSentences", () => {
  assert.deepEqual(splitSentences(""), []);
  assert.deepEqual(splitSentences("こんにちは。元気ですか？はい。"), [
    "こんにちは。",
    "元気ですか？",
    "はい。",
  ]);
  const text =
    "One. Two!\r\n(Three?) 日本語。 한국어 \u{1F468}\u200D\u{1F469}\uD800";
  assert.equal(splitSentences(text).join(""), text);
  assert.throws(() => splitSentences(undefined), TypeError);
});

test("default export", () => {
  assert.deepEqual(Object.keys(segmenter).sort(), [
    "VERSION",
    "countGraphemes",
    "findGraphemeBreaks",
    "findSentenceBreaks",
    "findWordBreaks",
    "isWordLike",
    "splitGraphemes",
    "splitSentences",
    "splitWords",
  ]);
  assert.equal(segmenter.splitWords, splitWords);
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
