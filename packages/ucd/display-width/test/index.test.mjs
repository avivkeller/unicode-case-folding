import assert from "node:assert/strict";
import test from "node:test";
import { VERSION, codePointWidth, displayWidth } from "../dist/index.mjs";

test("displayWidth", async (t) => {
  const cases = [
    ["abc", 3, "ASCII"],
    ["", 0, "empty string"],
    ["\u65e5\u672c", 4, "CJK ideographs"],
    ["\uff21", 2, "fullwidth Latin"],
    ["\uff71", 1, "halfwidth katakana"],
    ["\ud55c", 2, "Hangul syllable"],
    ["\u1112\u1161\u11ab", 2, "conjoining Hangul jamo"],
    ["e\u0301", 1, "combining mark"],
    ["\u200b", 0, "zero width space"],
    ["\u00ad", 0, "soft hyphen"],
    ["a\tb", 2, "tab"],
    ["\u{1f600}", 2, "emoji"],
    ["\u{1f44d}\u{1f3fd}", 2, "emoji with skin tone"],
    ["\u{1f468}\u200d\u{1f469}\u200d\u{1f467}", 2, "ZWJ sequence"],
    ["\u{1f1fa}\u{1f1f8}", 2, "flag"],
    ["\u{1f3f3}\ufe0f\u200d\u{1f308}", 2, "rainbow flag"],
    ["\u2764", 1, "text-style emoji"],
    ["\u2764\ufe0f", 2, "emoji style with VS16"],
    ["\u00b1", 1, "ambiguous"],
  ];
  for (const [input, expected, description] of cases) {
    await t.test(description, () =>
      assert.equal(displayWidth(input), expected),
    );
  }

  await t.test("ignores ANSI escape sequences", () => {
    assert.equal(displayWidth("\u001b[31mred\u001b[0m"), 3);
    assert.equal(
      displayWidth("\u001b]8;;https://example.com\u0007link\u001b]8;;\u0007"),
      4,
    );
  });

  await t.test("ambiguousIsWide", () => {
    assert.equal(displayWidth("\u00b1\u03a9", { ambiguousIsWide: true }), 4);
    assert.equal(displayWidth("abc", { ambiguousIsWide: true }), 3);
  });

  await t.test("rejects non-strings", () => {
    assert.throws(() => displayWidth(42), TypeError);
  });
});

test("codePointWidth", () => {
  assert.equal(codePointWidth(0x41), 1);
  assert.equal(codePointWidth(0x4e00), 2);
  assert.equal(codePointWidth(0x0301), 0);
  assert.equal(codePointWidth(0x00b1, { ambiguousIsWide: true }), 2);
  assert.throws(() => codePointWidth(0x110000), RangeError);
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.displayWidth);
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
