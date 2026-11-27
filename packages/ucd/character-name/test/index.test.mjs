import assert from "node:assert/strict";
import test from "node:test";
import characterName, {
  VERSION,
  fromName,
  getAliases,
  getName,
} from "../dist/index.mjs";

test("getName", async (t) => {
  const cases = [
    [0x20, "SPACE"],
    [0x41, "LATIN CAPITAL LETTER A"],
    [0xe9, "LATIN SMALL LETTER E WITH ACUTE"],
    [0x2d, "HYPHEN-MINUS"],
    [0x1f600, "GRINNING FACE"],
    [0xf60, "TIBETAN LETTER -A"],
    [0x1180, "HANGUL JUNGSEONG O-E"],
    [0xe01ef, "VARIATION SELECTOR-256"],
    [0xac00, "HANGUL SYLLABLE GA"],
    [0xd55c, "HANGUL SYLLABLE HAN"],
    [0xc544, "HANGUL SYLLABLE A"],
    [0xd7a3, "HANGUL SYLLABLE HIH"],
    [0x4e2d, "CJK UNIFIED IDEOGRAPH-4E2D"],
    [0x20000, "CJK UNIFIED IDEOGRAPH-20000"],
    [0xf900, "CJK COMPATIBILITY IDEOGRAPH-F900"],
    [0x17000, "TANGUT IDEOGRAPH-17000"],
    [0x1b170, "NUSHU CHARACTER-1B170"],
    [0x0a, undefined],
    [0x7f, undefined],
    [0xd800, undefined],
    [0xe000, undefined],
    [0x378, undefined],
    [0xfffe, undefined],
    [0x10ffff, undefined],
  ];
  for (const [codePoint, expected] of cases) {
    await t.test(`U+${codePoint.toString(16)}`, () => {
      assert.equal(getName(codePoint), expected);
    });
  }
  assert.throws(() => getName("a"), TypeError);
  assert.throws(() => getName(0x110000), RangeError);
});

test("getAliases", () => {
  assert.deepEqual(getAliases(0x0a), [
    { alias: "LINE FEED", type: "control" },
    { alias: "NEW LINE", type: "control" },
    { alias: "END OF LINE", type: "control" },
    { alias: "LF", type: "abbreviation" },
    { alias: "NL", type: "abbreviation" },
    { alias: "EOL", type: "abbreviation" },
  ]);
  assert.deepEqual(getAliases(0x1a2), [
    { alias: "LATIN CAPITAL LETTER GHA", type: "correction" },
  ]);
  assert.ok(
    getAliases(0xfeff).some(
      ({ alias, type }) => alias === "BYTE ORDER MARK" && type === "alternate",
    ),
  );
  assert.ok(getAliases(0x80).some(({ type }) => type === "figment"));
  assert.deepEqual(getAliases(0x41), []);
  getAliases(0x1a2)[0].alias = "mutated";
  assert.equal(getAliases(0x1a2)[0].alias, "LATIN CAPITAL LETTER GHA");
  assert.throws(() => getAliases("a"), TypeError);
});

const hex = (text) =>
  text === undefined
    ? undefined
    : [...text].map((char) => char.codePointAt(0).toString(16)).join(" ");

test("fromName", async (t) => {
  const cases = [
    ["LATIN SMALL LETTER A", "61", "name"],
    ["latin small letter a", "61", "case"],
    ["Latin_Small_Letter_A", "61", "underscores"],
    ["  latin   small letter a ", "61", "whitespace"],
    ["LATINSMALLLETTERA", "61", "no spaces"],
    ["HYPHEN-MINUS", "2d", "hyphen"],
    ["hyphen minus", "2d", "medial hyphens are ignored"],
    ["ZERO-WIDTH JOINER", "200d", "added medial hyphen"],
    ["TIBETAN LETTER -A", "f60", "a hyphen after a space counts"],
    ["TIBETAN LETTER A", "f68", "and tells two names apart"],
    ["HANGUL JUNGSEONG O-E", "1180", "the exception of UAX44-LM2"],
    ["hangul_jungseong_o-e", "1180", "the exception, loosely"],
    ["HANGUL JUNGSEONG OE", "116c", "the other name"],
    ["GRINNING FACE", "1f600", "supplementary character"],
    ["HANGUL SYLLABLE GA", "ac00", "Hangul syllable"],
    ["hangul syllable han", "d55c", "Hangul syllable, loosely"],
    ["HANGUL SYLLABLE A", "c544", "Hangul syllable without consonants"],
    ["HANGUL SYLLABLE PWILH", "d4db", "longest Hangul syllable name"],
    ["CJK UNIFIED IDEOGRAPH-4E2D", "4e2d", "ideograph"],
    ["cjk unified ideograph-4e2d", "4e2d", "ideograph, loosely"],
    ["CJK UNIFIED IDEOGRAPH-20000", "20000", "ideograph of plane 2"],
    ["CJK COMPATIBILITY IDEOGRAPH-F900", "f900", "compatibility ideograph"],
    ["TANGUT IDEOGRAPH-18D00", "18d00", "second range of a prefix"],
    ["LINE FEED", "a", "control alias"],
    ["LF", "a", "abbreviation"],
    ["nbsp", "a0", "abbreviation, loosely"],
    ["LATIN CAPITAL LETTER GHA", "1a2", "correction"],
    ["LATIN CAPITAL LETTER OI", "1a2", "the name it corrects"],
    ["KEYCAP DIGIT ONE", "31 fe0f 20e3", "named sequence"],
    ["LATIN SMALL LETTER I WITH MACRON AND GRAVE", "12b 300", "named sequence"],
    ["NOT A CHARACTER", undefined, "unknown"],
    ["", undefined, "empty"],
    ["CJK UNIFIED IDEOGRAPH-FFFF", undefined, "not an ideograph"],
    ["CJK UNIFIED IDEOGRAPH-F900", undefined, "wrong prefix"],
    ["CJK UNIFIED IDEOGRAPH-04E2D", undefined, "leading zero"],
    ["CJK UNIFIED IDEOGRAPH-", undefined, "no code point"],
    ["HANGUL SYLLABLE", undefined, "no syllable"],
    ["HANGUL SYLLABLE GAX", undefined, "not a syllable"],
    ["LATIN SMALL LETTER DOTLESS ı", undefined, "not ASCII"],
    ["<control-000A>", undefined, "a label is not a name"],
  ];
  for (const [name, expected, description] of cases) {
    await t.test(`${description}: ${name}`, () => {
      assert.equal(hex(fromName(name)), expected);
    });
  }
  assert.throws(() => fromName(0x61), TypeError);
});

test("every name is found again, also when written loosely", () => {
  let named = 0;
  for (let cp = 0; cp <= 0x10ffff; cp++) {
    const name = getName(cp);
    if (name === undefined) continue;
    named++;
    const char = String.fromCodePoint(cp);
    assert.equal(fromName(name), char, name);
    if (cp === 0x1180) continue;
    const loose = name.toLowerCase().replaceAll(" ", "_");
    assert.equal(fromName(loose), char, loose);
  }
  assert.ok(named > 150000);
});

test("agrees with the engine on which characters have a name", () => {
  // Named: assigned, and neither a control, a surrogate nor private use
  const named = /[^\p{Cn}\p{Cc}\p{Cs}\p{Co}]/u;
  for (let cp = 0; cp <= 0x10ffff; cp++) {
    if (named.test(String.fromCodePoint(cp))) {
      assert.notEqual(getName(cp), undefined, `U+${cp.toString(16)}`);
    }
  }
  for (let cp = 0; cp < 0x20; cp++) assert.equal(getName(cp), undefined);
  assert.equal(getName(0xe000), undefined);
});

test("default export", () => {
  assert.equal(characterName, getName);
  assert.equal(characterName(0x61), "LATIN SMALL LETTER A");
  assert.equal(characterName.getName, getName);
  assert.equal(characterName.getAliases, getAliases);
  assert.equal(characterName.fromName, fromName);
  assert.equal(characterName.VERSION, VERSION);
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
