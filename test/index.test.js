import test from "node:test";
import assert from "node:assert/strict";
import { caseFold, caseFoldEquals, lookupFolding } from "../index.js";

test("caseFold functionality", async (t) => {
  // Test basic functionality with table-driven tests
  const basicCases = [
    { input: "HELLO", expected: "hello", description: "ASCII uppercase" },
    { input: "hello", expected: "hello", description: "ASCII lowercase" },
    {
      input: "MiXeD CaSe TeXt",
      expected: "mixed case text",
      description: "mixed case",
    },
    { input: "", expected: "", description: "empty string" },
    {
      input: "ÀÁÂÃÄÅÆÇÈÉÊË",
      expected: "àáâãäåæçèéêë",
      description: "accented characters",
    },
    { input: "123!@#", expected: "123!@#", description: "digits and symbols" },
  ];

  for (const { input, expected, description } of basicCases) {
    await t.test(`handles ${description}`, () => {
      assert.strictEqual(caseFold(input), expected);
    });
  }

  // Special Unicode case folding tests
  const specialCases = [
    { input: "ß", expected: "ss", description: "German sharp S" },
    { input: "Σ", expected: "σ", description: "Greek capital sigma" },
    { input: "ﬁ", expected: "fi", description: "fi ligature" },
    {
      input: String.fromCodePoint(0x1e9e),
      expected: "ss",
      description: "Capital sharp S",
    },
  ];

  for (const { input, expected, description } of specialCases) {
    await t.test(`handles ${description}`, () => {
      assert.strictEqual(caseFold(input), expected);
    });
  }

  // Non-Latin scripts
  const scriptCases = [
    { input: "ПРИВЕТ", expected: "привет", description: "Cyrillic" },
    { input: "ΕΛΛΗΝΙΚΆ", expected: "ελληνικά", description: "Greek" },
    { input: "שלום", expected: "שלום", description: "Hebrew (no case)" },
  ];

  for (const { input, expected, description } of scriptCases) {
    await t.test(`handles ${description}`, () => {
      assert.strictEqual(caseFold(input), expected);
    });
  }

  // Test error handling
  await t.test("throws for non-string inputs", () => {
    const invalidInputs = [null, undefined, 123, {}, []];
    for (const input of invalidInputs) {
      assert.throws(() => caseFold(input), {
        name: "TypeError",
        message: "Input must be a string",
      });
    }
  });
});

test("caseFoldEquals functionality", async (t) => {
  // Test with data-driven approach
  const equalCases = [
    ["hello", "HELLO", true, "simple case difference"],
    ["hello", "hello!", false, "different strings"],
    ["ß", "ss", true, "German sharp S equivalence"],
    ["ß", "SS", true, "German sharp S with uppercase equivalence"],
    ["fi", "ﬁ", true, "ligature equivalence"],
    ["ПРИВЕТ", "привет", true, "Cyrillic case difference"],
    ["", "", true, "empty strings"],
  ];

  for (const [str1, str2, expected, description] of equalCases) {
    await t.test(`returns ${expected} for ${description}`, () => {
      assert.strictEqual(caseFoldEquals(str1, str2), expected);
    });
  }
});

test("lookupFolding functionality", async (t) => {
  // Consolidated mapping tests
  const mappingCases = [
    { codePoint: 65, expected: [97], description: "A -> a" },
    { codePoint: 90, expected: [122], description: "Z -> z" },
    { codePoint: 223, expected: [115, 115], description: "ß -> ss" },
    { codePoint: 304, expected: [105, 775], description: "İ -> i + dot above" },
    { codePoint: 64257, expected: [102, 105], description: "ﬁ -> fi" },
    {
      codePoint: 97,
      expected: undefined,
      description: "a -> undefined (already lowercase)",
    },
    {
      codePoint: 49,
      expected: undefined,
      description: "1 -> undefined (no case)",
    },
  ];

  for (const { codePoint, expected, description } of mappingCases) {
    await t.test(`maps ${description}`, () => {
      assert.deepStrictEqual(lookupFolding(codePoint), expected);
    });
  }

  // Error handling
  await t.test("throws for non-number inputs", () => {
    assert.throws(() => lookupFolding("A"), { name: "TypeError" });
    assert.throws(() => lookupFolding(null), { name: "TypeError" });
  });
});

test("Implementation correctness", async (t) => {
  // Surrogate pairs and astral plane handling
  await t.test(
    "correctly handles surrogate pairs and astral characters",
    () => {
      const testCases = [
        { input: "💻A", expected: "💻a", description: "emoji + ASCII" },
        {
          input: "A\u{1D400}B",
          expected: "a\u{1D400}b",
          description: "ASCII + surrogate + ASCII",
        },
        { input: "😀🚀👍", expected: "😀🚀👍", description: "multiple emoji" },
      ];

      for (const { input, expected, description } of testCases) {
        assert.strictEqual(caseFold(input), expected, description);
      }
    },
  );

  // Compare with String.toLowerCase for special cases
  await t.test("differs from toLowerCase for special case folds", () => {
    assert.notStrictEqual(caseFold("ß"), "ß".toLowerCase());
    assert.strictEqual(caseFold("ß"), "ss");
  });

  // Round-trip consistency for multi-codepoint mappings
  await t.test("maintains consistent multi-codepoint equality", () => {
    const mappingTriples = [
      ["ß", "ss", "SS"],
      ["Σ", "σ", "ς"],
    ];

    for (const [a, b, c] of mappingTriples) {
      assert.strictEqual(caseFoldEquals(a, b), true);
      assert.strictEqual(caseFoldEquals(b, c), true);
      assert.strictEqual(caseFoldEquals(a, c), true);
    }
  });
});

test("Performance", async (t) => {
  // Simplified performance test
  await t.test("handles long and complex strings efficiently", () => {
    // Create test strings
    const longAscii = "A".repeat(10000);
    const complexUnicode =
      "АБВГД".repeat(500) + "ΑΒΓΔΕ".repeat(500) + "ABCDE".repeat(500);

    // Test both with reasonable time limits
    const testCases = [
      { input: longAscii, maxTime: 50, description: "long ASCII string" },
      {
        input: complexUnicode,
        maxTime: 100,
        description: "complex Unicode string",
      },
    ];

    for (const { input, maxTime, description } of testCases) {
      const start = performance.now();
      caseFold(input);
      const duration = performance.now() - start;

      assert.ok(
        duration < maxTime,
        `${description} should fold in < ${maxTime}ms (took ${duration.toFixed(2)}ms)`,
      );
    }
  });
});
