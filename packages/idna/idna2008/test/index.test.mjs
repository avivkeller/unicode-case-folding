import assert from "node:assert/strict";
import test from "node:test";
import unicodeIdna2008, {
  VERSION,
  getIdna2008Property,
  isValidDomain,
  isValidLabel,
} from "../dist/index.mjs";

test("isValidDomain", async (t) => {
  const cases = [
    ["example.com", true, "ASCII"],
    ["Example.COM", true, "ASCII labels ignore case"],
    ["a-b.c1.example", true, "letters, digits and hyphens"],
    ["bücher.de", true, "U-label"],
    ["xn--bcher-kva.de", true, "A-label"],
    ["XN--BCHER-KVA.de", true, "A-labels ignore case"],
    ["faß.de", true, "sharp s is PVALID"],
    ["日本語.jp", true, "Han"],
    ["אב.com", true, "right-to-left label"],
    ["Bücher.de", false, "uppercase is DISALLOWED"],
    ["☕.us", false, "symbols are DISALLOWED"],
    ["xn--53h.us", false, "A-label of a DISALLOWED character"],
    ["日本語。jp", false, "only U+002E separates labels"],
    ["bücher.de", false, "not in Normalization Form C"],
    ["xn--u-ccb.com", false, "A-label of a string that is not in NFC"],
    ["xn--bcher-kv.de", false, "A-label that is not Punycode"],
    ["xn--abc.de", false, "A-label that decodes to nothing"],
    ["́a.com", false, "starts with a combining mark"],
    ["-a.com", false, "leading hyphen"],
    ["a-.com", false, "trailing hyphen"],
    ["ab--c.com", false, "hyphens in the third and fourth positions"],
    ["a_b.com", false, "underscore"],
    ["a..b", false, "empty label"],
    ["example.com.", false, "trailing dot"],
    ["", false, "empty"],
    [`${"a".repeat(63)}.com`, true, "63 characters"],
    [`${"a".repeat(64)}.com`, false, "64 characters"],
    [`${"ü".repeat(58)}.com`, false, "A-label over 63 characters"],
    [`${"a.".repeat(126)}a`, true, "253 characters"],
    [`${"a.".repeat(127)}a`, false, "255 characters"],
    ["0a.א", false, "Bidi rule: starts with a digit"],
    ["אa.com", false, "Bidi rule: mixed directions"],
    ["א0.com", true, "Bidi rule: ends with a digit"],
  ];
  for (const [domain, expected, description] of cases) {
    await t.test(description, () => {
      assert.equal(isValidDomain(domain), expected);
    });
  }
  assert.throws(() => isValidDomain(1), TypeError);
});

test("contextual rules", async (t) => {
  const cases = [
    ["ن‌ن", true, "ZWNJ between joining letters"],
    ["a‌b", false, "ZWNJ between Latin letters"],
    ["क्‍", true, "ZWJ after a virama"],
    ["a‍", false, "ZWJ without a virama"],
    ["l·l", true, "middle dot between l"],
    ["a·b", false, "middle dot elsewhere"],
    ["l·", false, "middle dot at the end"],
    ["͵α", true, "keraia before Greek"],
    ["͵a", false, "keraia before Latin"],
    ["א׳", true, "geresh after Hebrew"],
    ["׳א", false, "geresh at the start"],
    ["א״א", true, "gershayim after Hebrew"],
    ["日・本", true, "katakana middle dot with Han"],
    ["a・b", false, "katakana middle dot without kana or Han"],
    ["ا٠١", true, "Arabic-Indic digits"],
    ["ا۰۱", true, "extended Arabic-Indic digits"],
    ["ا٠۰", false, "both kinds of digits"],
  ];
  for (const [label, expected, description] of cases) {
    await t.test(description, () => {
      assert.equal(isValidLabel(label), expected);
    });
  }
});

test("isValidLabel", () => {
  assert.equal(isValidLabel("bücher"), true);
  assert.equal(isValidLabel("xn--bcher-kva"), true);
  assert.equal(isValidLabel("example"), true);
  assert.equal(isValidLabel("bücher.de"), false, "more than a label");
  assert.equal(isValidLabel(""), false);
  assert.throws(() => isValidLabel(null), TypeError);
});

test("getIdna2008Property", () => {
  assert.equal(getIdna2008Property(0x61), "PVALID");
  assert.equal(getIdna2008Property(0x2d), "PVALID");
  assert.equal(getIdna2008Property(0xdf), "PVALID");
  assert.equal(getIdna2008Property(0x41), "DISALLOWED");
  assert.equal(getIdna2008Property(0x2e), "DISALLOWED");
  assert.equal(getIdna2008Property(0x2615), "DISALLOWED");
  assert.equal(getIdna2008Property(0x200c), "CONTEXTJ");
  assert.equal(getIdna2008Property(0xb7), "CONTEXTO");
  assert.equal(getIdna2008Property(0x30fb), "CONTEXTO");
  assert.equal(getIdna2008Property(0x378), "UNASSIGNED");
  assert.throws(() => getIdna2008Property("a"), TypeError);
  assert.throws(() => getIdna2008Property(0x110000), RangeError);
});

test("every PVALID code point is valid in a label", () => {
  const mark = /^\p{M}/u;
  const knownToEngine = /\p{Assigned}/u;
  for (let codePoint = 0x80; codePoint <= 0x10ffff; codePoint++) {
    if (getIdna2008Property(codePoint) !== "PVALID") continue;
    const char = String.fromCodePoint(codePoint);
    if (!knownToEngine.test(char)) continue;
    // A han character, as marks may compose with a letter before them
    const label = mark.test(char) ? `\u4e00${char}` : char;
    if (label.normalize("NFC") !== label) continue;
    // Digits of right-to-left scripts cannot start a label
    assert.ok(
      isValidLabel(label) || isValidLabel(`\u05d0${char}`),
      `U+${codePoint.toString(16)}`,
    );
  }
});

test("default export", () => {
  assert.equal(unicodeIdna2008, isValidDomain);
  assert.equal(unicodeIdna2008("bücher.de"), true);
  assert.equal(unicodeIdna2008.isValidLabel, isValidLabel);
  assert.equal(unicodeIdna2008.getIdna2008Property, getIdna2008Property);
  assert.equal(unicodeIdna2008.VERSION, VERSION);
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
