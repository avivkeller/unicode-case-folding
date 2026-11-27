import assert from "node:assert/strict";
import test from "node:test";
import generalCategory, {
  VERSION,
  getGeneralCategory,
  getGeneralCategoryName,
  isInCategory,
} from "../dist/index.mjs";

test("getGeneralCategory", async (t) => {
  const cases = [
    [0x41, "Lu"],
    [0x61, "Ll"],
    [0x1c5, "Lt"],
    [0x2b0, "Lm"],
    [0x4e2d, "Lo"],
    [0x301, "Mn"],
    [0x903, "Mc"],
    [0x20dd, "Me"],
    [0x31, "Nd"],
    [0x2160, "Nl"],
    [0xbd, "No"],
    [0x5f, "Pc"],
    [0x2d, "Pd"],
    [0x28, "Ps"],
    [0x29, "Pe"],
    [0xab, "Pi"],
    [0xbb, "Pf"],
    [0x21, "Po"],
    [0x2b, "Sm"],
    [0x24, "Sc"],
    [0x5e, "Sk"],
    [0x1f600, "So"],
    [0x20, "Zs"],
    [0x2028, "Zl"],
    [0x2029, "Zp"],
    [0x0a, "Cc"],
    [0x200d, "Cf"],
    [0xd800, "Cs"],
    [0xe000, "Co"],
    [0x378, "Cn"],
    [0x10ffff, "Cn"],
  ];
  for (const [codePoint, expected] of cases) {
    await t.test(`U+${codePoint.toString(16)}`, () => {
      assert.equal(getGeneralCategory(codePoint), expected);
    });
  }
  assert.throws(() => getGeneralCategory("A"), TypeError);
  assert.throws(() => getGeneralCategory(0x110000), RangeError);
});

test("getGeneralCategoryName", () => {
  assert.equal(getGeneralCategoryName("Lu"), "Uppercase_Letter");
  assert.equal(getGeneralCategoryName("Nd"), "Decimal_Number");
  assert.equal(getGeneralCategoryName("Cn"), "Unassigned");
  assert.equal(getGeneralCategoryName("L"), "Letter");
  assert.equal(getGeneralCategoryName("LC"), "Cased_Letter");
  assert.equal(
    getGeneralCategoryName(getGeneralCategory(0x20)),
    "Space_Separator",
  );
  assert.throws(() => getGeneralCategoryName("Letter"), RangeError);
  assert.throws(() => getGeneralCategoryName("toString"), RangeError);
  assert.throws(() => getGeneralCategoryName(1), TypeError);
});

test("isInCategory", () => {
  assert.equal(isInCategory(0x41, "Lu"), true);
  assert.equal(isInCategory(0x41, "Ll"), false);
  assert.equal(isInCategory(0x41, "L"), true);
  assert.equal(isInCategory(0x41, "LC"), true);
  assert.equal(isInCategory(0x4e2d, "L"), true);
  assert.equal(isInCategory(0x4e2d, "LC"), false);
  assert.equal(isInCategory(0x31, "N"), true);
  assert.equal(isInCategory(0x31, "L"), false);
  assert.equal(isInCategory(0x301, "M"), true);
  assert.equal(isInCategory(0x21, "P"), true);
  assert.equal(isInCategory(0x2b, "S"), true);
  assert.equal(isInCategory(0x20, "Z"), true);
  assert.equal(isInCategory(0x378, "C"), true);
  assert.equal(isInCategory(0x378, "Cn"), true);
  assert.throws(() => isInCategory(0x41, "X"), RangeError);
  assert.throws(() => isInCategory(0x41, "lu"), RangeError);
  assert.throws(() => isInCategory("A", "Lu"), TypeError);
});

test("agrees with the engine's \\p{gc=…} for known characters", () => {
  const assigned = /\p{Assigned}/u;
  const tests = new Map();
  const testOf = (category) => {
    if (!tests.has(category)) {
      tests.set(category, new RegExp(`\\p{gc=${category}}`, "u"));
    }
    return tests.get(category);
  };
  const groups = ["L", "LC", "M", "N", "P", "S", "Z", "C"];
  for (let cp = 0; cp <= 0x10ffff; cp++) {
    const char = String.fromCodePoint(cp);
    if (!assigned.test(char)) continue;
    const category = getGeneralCategory(cp);
    const hex = `U+${cp.toString(16)} ${category}`;
    assert.ok(testOf(category).test(char), hex);
    for (const group of groups) {
      assert.equal(isInCategory(cp, group), testOf(group).test(char), hex);
    }
  }
});

test("default export", () => {
  assert.equal(generalCategory, getGeneralCategory);
  assert.equal(generalCategory(0x41), "Lu");
  assert.equal(generalCategory.getGeneralCategory, getGeneralCategory);
  assert.equal(generalCategory.getGeneralCategoryName, getGeneralCategoryName);
  assert.equal(generalCategory.isInCategory, isInCategory);
  assert.equal(generalCategory.VERSION, VERSION);
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
