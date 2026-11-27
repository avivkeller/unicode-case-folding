import assert from "node:assert/strict";
import test from "node:test";
import * as ucd from "@internal/build/sources/ucd";
import { security } from "@internal/build/sources/unicode";
import {
  areConfusable,
  getConfusableType,
  getIdentifierTypes,
  getResolvedScripts,
  getRestrictionLevel,
  isAllowedInIdentifier,
  isMixedScript,
  skeleton,
  VERSION,
} from "../dist/index.mjs";

const fromCodePoints = (codePoints) => String.fromCodePoint(...codePoints);
const hex = (string) =>
  Array.from(string, (char) =>
    char.codePointAt(0).toString(16).toUpperCase().padStart(4, "0"),
  ).join(" ");

function valuesByCodePoint(records) {
  const values = new Map();
  for (const [range, value] of records) {
    const [start, end] = ucd.parseRange(range);
    for (let codePoint = start; codePoint <= end; codePoint++) {
      values.set(codePoint, value);
    }
  }
  return values;
}

test("skeleton: UTS #39 Section 4 examples", async (t) => {
  const s1 = "A1<\u05E9\u05c2";
  const s2 = "\u0391\u05E9\u05ba>1";

  await t.test("bidiSkeleton(LTR) of S1 and S2", () => {
    const expected = "Al<\u05E9\u0307";
    assert.equal(skeleton(s1), expected);
    assert.equal(skeleton(s2), expected);
    assert.equal(skeleton(s1, { direction: "ltr" }), expected);
  });

  await t.test("S1 and S2 are LTR-confusable but not RTL-confusable", () => {
    assert.equal(areConfusable(s1, s2), true);
    assert.equal(areConfusable(s1, s2, { direction: "rtl" }), false);
    assert.equal(areConfusable(s1, s2, { direction: "auto" }), true);
  });

  await t.test("paypal with Cyrillic a", () => {
    assert.equal(areConfusable("paypal", "p\u0430yp\u0430l"), true);
    assert.equal(skeleton("p\u0430yp\u0430l"), "paypal");
  });

  await t.test("confusable classes", () => {
    assert.equal(
      getConfusableType("paypal", "p\u0430yp\u0430l"),
      "mixed-script",
    );
    assert.equal(
      getConfusableType("scope", "\u0455\u0441\u043E\u0440\u0435"),
      "whole-script",
    );
    assert.equal(getConfusableType("\u01C9eto", "ljeto"), "single-script");
    assert.equal(getConfusableType("paypal", "paypal"), "single-script");
    assert.equal(getConfusableType("paypal", "ebay"), null);
    assert.equal(
      getConfusableType("circle", "\u0441\u0456\u0433\u0441\u04C0\u0435"),
      "whole-script",
    );
  });
});

test("skeleton: normalization and default ignorables", () => {
  assert.equal(skeleton("caf\u00E9"), skeleton("cafe\u0301"));
  assert.equal(skeleton("caf\u00E9"), "cafe\u0301");
  assert.equal(skeleton("pay\u00adp\u200da\u2060l\ufe0f"), "paypal");
  assert.equal(skeleton("\u00ad"), "");
  assert.equal(skeleton("a\u0301\u0316"), skeleton("a\u0316\u0301"));
  assert.equal(skeleton(""), "");
  assert.equal(skeleton("", { direction: "rtl" }), "");
});

test("skeleton: ASCII", () => {
  assert.equal(skeleton("Hello, World"), "Hello, World");
  assert.equal(skeleton("l0gin"), "lOgin");
  assert.equal(skeleton("rn"), skeleton("m"));
  assert.equal(skeleton("I1|l"), "llll");
  assert.equal(skeleton("a!", { direction: "rtl" }), "!a");
});

test("skeleton: every mapping of confusables.txt", async () => {
  const defaultIgnorables = valuesByCodePoint(
    (await ucd.records("DerivedCoreProperties.txt")).filter(
      ([, property]) => property === "Default_Ignorable_Code_Point",
    ),
  );
  const failures = [];
  let checked = 0;
  for (const [source, prototype] of await security.records("confusables.txt")) {
    const [codePoint] = ucd.parseCodePoints(source);
    const char = String.fromCodePoint(codePoint);
    const expected = defaultIgnorables.has(codePoint)
      ? ""
      : fromCodePoints(ucd.parseCodePoints(prototype)).normalize("NFD");
    checked++;
    if (skeleton(char) !== expected) {
      failures.push(`${source}: ${hex(skeleton(char))} ≠ ${hex(expected)}`);
    }
  }
  assert.ok(checked > 6000);
  assert.deepEqual(failures, []);
});

test("skeleton: confusable pairs", () => {
  const pairs = [
    ["\u0430pple", "apple"],
    ["g\u043E\u043Egle", "google"],
    ["\uFF41dmin", "admin"],
    ["\u{1D41A}dmin", "admin"],
    ["\u2170", "i"],
    ["\u0399", "l"],
    ["\u01C3", "!"],
  ];
  for (const [a, b] of pairs) {
    assert.equal(areConfusable(a, b), true, `${hex(a)} ≅ ${hex(b)}`);
  }
  assert.equal(areConfusable("apple", "appIe"), true);
  assert.equal(areConfusable("apple", "aple"), false);
});

const skeletonOfEach = (string) =>
  Array.from(string, (char) => skeleton(char)).join("");

test("skeleton: right-to-left text", () => {
  const arabic = "\u0628\u0627\u062A";
  assert.equal(skeleton(arabic), skeletonOfEach("\u062A\u0627\u0628"));
  assert.equal(skeleton(`x ${arabic}`), skeletonOfEach("x \u062A\u0627\u0628"));
  assert.equal(
    skeleton("\u05D0(\u05D1)", { direction: "rtl" }),
    skeletonOfEach("(\u05D1)\u05D0"),
  );
  assert.equal(skeleton("\u0661 \u0662"), skeletonOfEach("\u0662 \u0661"));
  assert.equal(skeleton("ab!", { direction: "rtl" }), "!ab");
  assert.equal(
    skeleton("\u05D0 a!", { direction: "auto" }),
    skeleton("\u05D0 a!", { direction: "rtl" }),
  );
  assert.equal(
    skeleton("a \u05D0!", { direction: "auto" }),
    skeleton("a \u05D0!", { direction: "ltr" }),
  );
});

test("skeleton: paragraphs are laid out separately", () => {
  const text = "\u05D0\u05D1\nab";
  assert.equal(skeleton(text), skeletonOfEach("\u05D1\u05D0\nab"));
  assert.equal(
    skeleton(text, { direction: "auto" }),
    skeletonOfEach("\n\u05D1\u05D0ab"),
  );
});

test("skeleton: rejects invalid arguments", () => {
  assert.throws(() => skeleton(1), TypeError);
  assert.throws(() => skeleton("a", { direction: "up" }), RangeError);
  assert.throws(() => areConfusable("a", null), TypeError);
});

const REPRESENTATIVES = {
  L: "a",
  R: "\u05D0",
  AL: "\u0628",
  EN: "2",
  ES: "+",
  ET: "#",
  AN: "\u0663",
  CS: ",",
  NSM: "\u0300",
  BN: "\u00ad",
  B: "\n",
  S: "\t",
  WS: " ",
  ON: "!",
  LRE: "\u202a",
  RLE: "\u202b",
  PDF: "\u202c",
  LRO: "\u202d",
  RLO: "\u202e",
  LRI: "\u2066",
  RLI: "\u2067",
  FSI: "\u2068",
  PDI: "\u2069",
};
const DEFAULT_IGNORABLE_CLASSES = new Set([
  "BN",
  "LRE",
  "RLE",
  "PDF",
  "LRO",
  "RLO",
  "LRI",
  "RLI",
  "FSI",
  "PDI",
]);
const DIRECTION_BITS = [
  [1, "auto"],
  [2, "ltr"],
  [4, "rtl"],
];

function applyL3(visual) {
  const result = [...visual];
  const continuesRun = (k) =>
    result[k].rank === result[k - 1].rank - 1 &&
    result[k].level === result[k - 1].level;
  let i = 0;
  while (i < result.length) {
    if (result[i].level % 2 === 0 || !result[i].isMark) {
      i++;
      continue;
    }
    let end = i + 1;
    while (end < result.length && continuesRun(end) && result[end].isMark)
      end++;
    if (end < result.length && continuesRun(end)) {
      result.splice(i, end + 1 - i, ...result.slice(i, end + 1).reverse());
      i = end + 1;
    } else {
      i = end;
    }
  }
  return result;
}

test("bidi conformance: BidiTest.txt", async (t) => {
  for (const [name, char] of Object.entries(REPRESENTATIVES)) {
    const expected = DEFAULT_IGNORABLE_CLASSES.has(name) ? "" : char;
    assert.equal(skeleton(char), expected, `representative of ${name}`);
  }

  let levels = [];
  let reorder = [];
  let passed = 0;
  const failures = [];
  for (const line of (await ucd.text("BidiTest.txt")).split("\n")) {
    if (line.startsWith("@Levels:")) {
      levels = line.slice(8).trim().split(/\s+/);
      continue;
    }
    if (line.startsWith("@Reorder:")) {
      reorder = line.slice(9).trim().split(/\s+/).filter(Boolean).map(Number);
      continue;
    }
    if (!line.trim() || line.startsWith("#") || line.startsWith("@")) continue;

    const [input, bits] = line.split(";").map((field) => field.trim());
    const classes = input.split(/\s+/);
    const string = classes.map((name) => REPRESENTATIVES[name]).join("");
    const ranks = new Map(
      classes
        .map((_, i) => i)
        .filter((i) => levels[i] !== "x")
        .map((index, rank) => [index, rank]),
    );
    const visual = reorder.map((index) => ({
      char: REPRESENTATIVES[classes[index]],
      level: Number(levels[index]),
      rank: ranks.get(index),
      isMark: classes[index] === "NSM",
      ignorable: DEFAULT_IGNORABLE_CLASSES.has(classes[index]),
    }));
    const expected = applyL3(visual)
      .filter(({ ignorable }) => !ignorable)
      .map(({ char }) => char)
      .join("");

    for (const [bit, direction] of DIRECTION_BITS) {
      if ((parseInt(bits, 16) & bit) === 0) continue;
      const actual = skeleton(string, { direction });
      if (actual === expected) passed++;
      else if (failures.length < 20) {
        failures.push(
          `${input} (${direction}): ${hex(actual)} ≠ ${hex(expected)}`,
        );
      }
    }
  }
  assert.deepEqual(failures, []);
  t.diagnostic(`${passed} cases passed`);
  assert.ok(passed > 700000);
});

test("bidi conformance: BidiCharacterTest.txt", async (t) => {
  const marks = valuesByCodePoint(
    (await ucd.records("extracted/DerivedGeneralCategory.txt")).filter(
      ([, category]) => ["Mn", "Mc", "Me"].includes(category),
    ),
  );
  const mirroring = new Map(
    (await ucd.records("BidiMirroring.txt")).map(([codePoint, glyph]) => [
      parseInt(codePoint, 16),
      parseInt(glyph, 16),
    ]),
  );
  const ISOLATE_CONTROLS = new Set([0x2066, 0x2067, 0x2068, 0x2069]);
  const DIRECTIONS = ["ltr", "rtl", "auto"];

  let passed = 0;
  let skipped = 0;
  const failures = [];
  for (const [input, direction, , levelField, orderField] of await ucd.records(
    "BidiCharacterTest.txt",
  )) {
    const codePoints = ucd.parseCodePoints(input);
    const levels = levelField.split(/\s+/);
    // The test data does not say where characters removed by X9 go
    const removedVisible = codePoints.some(
      (codePoint, i) =>
        levels[i] === "x" && skeleton(String.fromCodePoint(codePoint)) !== "",
    );
    if (removedVisible) {
      skipped++;
      continue;
    }
    const ranks = new Map(
      codePoints
        .map((_, i) => i)
        .filter((i) => levels[i] !== "x")
        .map((index, rank) => [index, rank]),
    );
    const visual = orderField
      .split(/\s+/)
      .map(Number)
      .map((index) => ({
        codePoint: codePoints[index],
        level: Number(levels[index]),
        rank: ranks.get(index),
        isMark: marks.has(codePoints[index]),
      }));
    const displayed = applyL3(visual)
      .filter(({ codePoint }) => !ISOLATE_CONTROLS.has(codePoint))
      .map(({ codePoint, level }) =>
        level % 2 === 1 ? (mirroring.get(codePoint) ?? codePoint) : codePoint,
      );
    // The left-to-right override keeps skeleton() from reordering again
    const expected = skeleton(`\u202d${fromCodePoints(displayed)}\u202c`);
    const actual = skeleton(fromCodePoints(codePoints), {
      direction: DIRECTIONS[Number(direction)],
    });
    if (actual === expected) passed++;
    else if (failures.length < 20) {
      failures.push(
        `${input} (${DIRECTIONS[direction]}): ${hex(actual)} ≠ ${hex(expected)}`,
      );
    }
  }
  assert.deepEqual(failures, []);
  t.diagnostic(`${passed} cases passed, ${skipped} skipped`);
  assert.ok(passed > 90000);
});

test("getResolvedScripts: UTS #39 Table 1a", () => {
  const cases = [
    ["Circle", ["Hntl", "Latn"]],
    ["\u0421\u0456\u0433\u0441\u04C0\u0435", ["Cyrl"]],
    ["\u0421ir\u0441l\u0435", []],
    ["Circ1e", ["Hntl", "Latn"]],
    ["C\u{1D5C2}\u{1D5CB}\u{1D5BC}\u{1D5C5}\u{1D5BE}", ["Hntl", "Latn"]],
    ["\u{1D5A2}\u{1D5C2}\u{1D5CB}\u{1D5BC}\u{1D5C5}\u{1D5BE}", null],
    ["\u3006\u5207", ["Hanb", "Hani", "Hntl", "Jpan", "Kore"]],
    ["\u306D\u30AC", ["Jpan"]],
  ];
  for (const [input, expected] of cases) {
    assert.deepEqual(getResolvedScripts(input), expected, hex(input));
    assert.equal(isMixedScript(input), expected?.length === 0, hex(input));
  }
  assert.equal(getResolvedScripts(""), null);
  assert.equal(getResolvedScripts("123"), null);
  assert.deepEqual(getResolvedScripts("\uD55C"), ["Hang", "Kore"]);
  assert.deepEqual(getResolvedScripts("\u3105"), ["Bopo", "Hanb"]);
  assert.deepEqual(getResolvedScripts("\u{10FFFD}"), ["Zzzz"]);
  assert.equal(isMixedScript("a\u{10FFFD}"), true);
  assert.throws(() => getResolvedScripts(1), TypeError);
  assert.throws(() => isMixedScript(1), TypeError);
});

test("getResolvedScripts: every code point", async () => {
  const scriptCodes = new Map(
    (await ucd.records("PropertyValueAliases.txt"))
      .filter(([property]) => property === "sc")
      .map(([, code, name]) => [name, code]),
  );
  const scripts = valuesByCodePoint(await ucd.records("Scripts.txt"));
  const extensions = valuesByCodePoint(
    await ucd.records("ScriptExtensions.txt"),
  );
  const writingSystems = {
    Hani: ["Hanb", "Hntl", "Jpan", "Kore"],
    Hira: ["Jpan"],
    Kana: ["Jpan"],
    Hang: ["Kore"],
    Bopo: ["Hanb"],
    Latn: ["Hntl"],
  };
  const failures = [];
  for (let codePoint = 0; codePoint <= 0x10ffff; codePoint++) {
    const codes = extensions.get(codePoint)?.split(" ") ?? [
      scriptCodes.get(scripts.get(codePoint) ?? "Unknown"),
    ];
    let expected = null;
    if (!codes.includes("Zyyy") && !codes.includes("Zinh")) {
      expected = [
        ...new Set([
          ...codes,
          ...codes.flatMap((code) => writingSystems[code] ?? []),
        ]),
      ].sort();
    }
    const actual = getResolvedScripts(String.fromCodePoint(codePoint));
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      failures.push(codePoint.toString(16));
      if (failures.length > 20) break;
    }
  }
  assert.deepEqual(failures, []);
});

test("getRestrictionLevel: UTS #39 Section 5.2", () => {
  const cases = [
    ["paypal", "ascii-only"],
    ["", "ascii-only"],
    ["user_name-1", "ascii-only"],
    ["\u0395\u03BB\u03BB\u03AC\u03B4\u03B1", "single-script"],
    ["\u0441\u0456\u0433\u0441\u04C0\u0435", "single-script"],
    ["caf\u00E9", "single-script"],
    ["\u3006\u5207", "single-script"],
    ["abc\u6F22\u5B57", "single-script"],
    ["abc\u3072\u3089\u304C\u306A\u6F22", "highly-restrictive"],
    ["abc\u30AB\u30BF", "highly-restrictive"],
    // Bopomofo is Limited Use since Unicode 17, so not in the profile
    ["abc\u3105\u6F22", "unrestricted"],
    ["abc\uD55C\uAE00\u6F22", "highly-restrictive"],
    ["abc\u0928\u092E\u0938\u094d\u0924\u0947", "moderately-restrictive"],
    ["abc\u05E9\u05DC\u05D5\u05DD", "moderately-restrictive"],
    ["abc\u0441\u0456\u0433", "minimally-restrictive"],
    ["abc\u03B1\u03B2", "minimally-restrictive"],
    ["\u03A9mega", "minimally-restrictive"],
    ["Te\u03C7", "minimally-restrictive"],
    ["H\u03BBLF-LIFE", "minimally-restrictive"],
    ["Toys-\u042F-Us", "minimally-restrictive"],
    [
      "\u0928\u092E\u0938\u094d\u0924\u0947\u05E9\u05DC",
      "minimally-restrictive",
    ],
    ["\u0421ir\u0441l\u0435", "minimally-restrictive"],
    ["a\u200db", "unrestricted"],
    ["price$", "unrestricted"],
    ["\u{1D5A2}ircle", "unrestricted"],
    ["\u2460", "unrestricted"],
  ];
  for (const [identifier, expected] of cases) {
    assert.equal(getRestrictionLevel(identifier), expected, hex(identifier));
  }
  assert.throws(() => getRestrictionLevel(null), TypeError);
});

test("getRestrictionLevel: canonical equivalence", () => {
  assert.equal(isAllowedInIdentifier(0x212b), false);
  assert.equal(getRestrictionLevel("\u212Bngstr\u00F6m"), "single-script");
  assert.equal(
    getRestrictionLevel("u\u0308ber"),
    getRestrictionLevel("\u00FCber"),
  );
  assert.equal(getRestrictionLevel("u\u0308ber"), "single-script");
  assert.equal(getRestrictionLevel("\u212A"), "ascii-only");
});

test("isAllowedInIdentifier and getIdentifierTypes: examples", () => {
  assert.equal(isAllowedInIdentifier(0x61), true);
  assert.deepEqual(getIdentifierTypes(0x61), ["Recommended"]);
  assert.equal(isAllowedInIdentifier(0xb7), true);
  assert.deepEqual(getIdentifierTypes(0xb7), ["Inclusion"]);
  for (const codePoint of [0x200c, 0x200d]) {
    assert.equal(isAllowedInIdentifier(codePoint), false);
    assert.deepEqual(getIdentifierTypes(codePoint), ["Default_Ignorable"]);
  }
  assert.deepEqual(getIdentifierTypes(0x20), ["Not_XID"]);
  assert.deepEqual(getIdentifierTypes(0xe000), ["Not_Character"]);
  assert.deepEqual(getIdentifierTypes(0x10ffff), ["Not_Character"]);
  assert.equal(isAllowedInIdentifier(0x10ffff), false);
  const types = getIdentifierTypes(0x61);
  types.push("changed");
  assert.deepEqual(getIdentifierTypes(0x61), ["Recommended"]);
  assert.throws(() => getIdentifierTypes("a"), TypeError);
  assert.throws(() => isAllowedInIdentifier(-1), RangeError);
});

test("isAllowedInIdentifier and getIdentifierTypes: every code point", async () => {
  const status = valuesByCodePoint(
    await security.records("IdentifierStatus.txt"),
  );
  const types = valuesByCodePoint(await security.records("IdentifierType.txt"));
  const failures = [];
  for (let codePoint = 0; codePoint <= 0x10ffff; codePoint++) {
    const allowed = (status.get(codePoint) ?? "Restricted") === "Allowed";
    const expectedTypes = (types.get(codePoint) ?? "Not_Character")
      .split(" ")
      .sort();
    if (
      isAllowedInIdentifier(codePoint) !== allowed ||
      JSON.stringify([...getIdentifierTypes(codePoint)].sort()) !==
        JSON.stringify(expectedTypes)
    ) {
      failures.push(codePoint.toString(16));
      if (failures.length > 20) break;
    }
  }
  assert.deepEqual(failures, []);
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
