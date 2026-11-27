import assert from "node:assert/strict";
import test from "node:test";
import hangulJamo, {
  VERSION,
  fromJamo,
  getHangulSyllableType,
  getInitialConsonants,
  toCompatibilityJamo,
  toConjoiningJamo,
  toJamo,
} from "../dist/index.mjs";

let everySyllable = "";
for (let cp = 0xac00; cp <= 0xd7a3; cp++) {
  everySyllable += String.fromCharCode(cp);
}

test("toJamo", () => {
  assert.equal(toJamo("한글"), "한글");
  assert.equal(toJamo("가"), "가", "no final");
  assert.equal(toJamo("abc 한!"), "abc 한!");
  assert.equal(toJamo("abc"), "abc");
  assert.equal(toJamo(""), "");
  assert.equal(toJamo(everySyllable), everySyllable.normalize("NFD"));
  assert.throws(() => toJamo(1), TypeError);
});

test("toJamo with compatibility jamo", () => {
  const options = { jamo: "compatibility" };
  assert.equal(toJamo("한글", options), "ㅎㅏㄴㄱㅡㄹ");
  assert.equal(toJamo("값이 닭", options), "ㄱㅏㅄㅇㅣ ㄷㅏㄺ");
  assert.equal(toJamo("하", options), "ㅎㅏ", "conjoining jamo too");
  assert.equal(toJamo("한", { jamo: "conjoining" }), "한");
  assert.throws(() => toJamo("한", { jamo: "letters" }), RangeError);
});

test("fromJamo", async (t) => {
  const cases = [
    ["한글", "한글", "conjoining jamo"],
    ["ㅎㅏㄴㄱㅡㄹ", "한글", "compatibility jamo"],
    ["ㄱㅏㅄㅇㅣ", "값이", "a consonant before a vowel is an initial"],
    ["ㄱㅏㅇㅇㅏㅈㅣ", "강아지", "two of the same consonant"],
    ["ㅇㅏㄴㄴㅕㅇ ㅅㅔㄱㅖ", "안녕 세계", "words"],
    ["ㅋㅋㅋ", "ㅋㅋㅋ", "consonants alone stay"],
    ["ㅏㅏ", "ㅏㅏ", "vowels alone stay"],
    ["하ㅋㅋ", "하ㅋㅋ", "syllables take no final"],
    ["각", "각", "but a conjoining final joins a syllable"],
    ["ㄸㅏㄸ", "따ㄸ", "not a final in modern Korean"],
    ["각ᆨ", "각ᆨ", "one final only"],
    ["ᄀᆞ", "ᄀᆞ", "archaic jamo stay"],
    ["abc", "abc", "no jamo"],
    ["", "", "empty string"],
  ];
  for (const [input, expected, description] of cases) {
    await t.test(description, () => assert.equal(fromJamo(input), expected));
  }

  await t.test("reverses toJamo for every syllable", () => {
    assert.equal(fromJamo(toJamo(everySyllable)), everySyllable);
    assert.equal(
      fromJamo(toJamo(everySyllable, { jamo: "compatibility" })),
      everySyllable,
    );
    assert.equal(fromJamo(everySyllable.normalize("NFD")), everySyllable);
  });

  await t.test("rejects invalid arguments", () => {
    assert.throws(() => fromJamo(1), TypeError);
  });
});

test("toCompatibilityJamo", () => {
  assert.equal(toCompatibilityJamo("한"), "ㅎㅏㄴ");
  assert.equal(toCompatibilityJamo("ᄀ"), "ㄱ", "initial");
  assert.equal(toCompatibilityJamo("ᆨ"), "ㄱ", "final");
  assert.equal(toCompatibilityJamo("ᆪ"), "ㄳ", "final cluster");
  assert.equal(toCompatibilityJamo("ᆞ"), "ㆍ", "archaic vowel");
  assert.equal(toCompatibilityJamo("ᅟ"), "ᅟ", "no equivalent");
  assert.equal(toCompatibilityJamo("한 a"), "한 a", "syllables stay");
});

test("toConjoiningJamo", () => {
  assert.equal(toConjoiningJamo("ㅎㅏㄴ"), "한");
  assert.equal(toConjoiningJamo("ㄱㅏㅄㅇㅣ"), "값이");
  assert.equal(toConjoiningJamo("ㄱ"), "ㄱ", "nothing to join with");
  assert.equal(toConjoiningJamo("ᄒㅏ"), "하", "mixed forms");
  assert.equal(toConjoiningJamo("ㅎㆍㄴ"), "ᄒᆞᆫ", "archaic vowel");
  assert.equal(toConjoiningJamo("ㅤ"), "ㅤ", "filler");
  assert.equal(
    toConjoiningJamo("ㄸㅏㄸ"),
    "\u1104\u1161\ud7cd",
    "archaic final",
  );
  assert.equal(
    toCompatibilityJamo(toConjoiningJamo("ㅎㅏㄴㄱㅡㄹ")),
    "ㅎㅏㄴㄱㅡㄹ",
  );
});

test("agrees with the compatibility decompositions of NFKD", () => {
  for (let cp = 0x3131; cp <= 0x318e; cp++) {
    if (cp === 0x3164) continue;
    const letter = String.fromCharCode(cp);
    const decomposed = letter.normalize("NFKD");
    assert.equal(toCompatibilityJamo(decomposed), letter, letter);
    const type = getHangulSyllableType(decomposed.codePointAt(0));
    const inContext =
      type === "L"
        ? toConjoiningJamo(`${letter}ㅏ`)[0]
        : type === "V"
          ? toConjoiningJamo(`ㄱ${letter}`)[1]
          : toConjoiningJamo(`ㄱㅏ${letter}`)[2];
    assert.equal(inContext, decomposed, letter);
  }
});

test("getInitialConsonants", () => {
  assert.equal(getInitialConsonants("한글"), "ㅎㄱ");
  assert.equal(getInitialConsonants("유니코드 검색!"), "ㅇㄴㅋㄷ ㄱㅅ!");
  assert.equal(getInitialConsonants("Node 한글"), "Node ㅎㄱ");
  assert.equal(getInitialConsonants("한"), "ㅎ", "jamo");
  assert.equal(getInitialConsonants("ㅎㄱ"), "ㅎㄱ", "a query stays as it is");
  assert.equal(getInitialConsonants("한글", { jamo: "conjoining" }), "ᄒᄀ");
  assert.equal(getInitialConsonants(""), "");
  assert.throws(() => getInitialConsonants(1), TypeError);
});

test("getHangulSyllableType", () => {
  assert.equal(getHangulSyllableType(0x1100), "L");
  assert.equal(getHangulSyllableType(0xa960), "L", "extended-A");
  assert.equal(getHangulSyllableType(0x1161), "V");
  assert.equal(getHangulSyllableType(0xd7b0), "V", "extended-B");
  assert.equal(getHangulSyllableType(0x11a8), "T");
  assert.equal(getHangulSyllableType(0xac00), "LV");
  assert.equal(getHangulSyllableType(0xac01), "LVT");
  assert.equal(getHangulSyllableType(0xd7a3), "LVT");
  assert.equal(getHangulSyllableType(0xd7a4), undefined);
  assert.equal(getHangulSyllableType(0x3131), undefined, "compatibility");
  assert.equal(getHangulSyllableType(0x41), undefined);
  assert.throws(() => getHangulSyllableType("가"), TypeError);
});

test("default export", () => {
  assert.equal(hangulJamo, toJamo);
  assert.equal(hangulJamo("가"), "가");
  const named = {
    toJamo,
    fromJamo,
    toCompatibilityJamo,
    toConjoiningJamo,
    getInitialConsonants,
    getHangulSyllableType,
    VERSION,
  };
  for (const [key, value] of Object.entries(named)) {
    assert.equal(hangulJamo[key], value, key);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
