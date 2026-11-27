import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { VERSION, compare, sortKey } from "../dist/index.mjs";
import { FILES, checkCollationTest } from "./conformance.mjs";

const sorted = (list, options) =>
  [...list].sort((a, b) => compare(a, b, options));
const weights = (key) =>
  [...key]
    .map((unit) => unit.charCodeAt(0).toString(16).padStart(4, "0"))
    .join(" ");

test("conformance tests of the UCA (subsets)", async (t) => {
  for (const [file, alternate] of Object.entries(FILES)) {
    await t.test(file, () => {
      const contents = fs.readFileSync(
        new URL(`fixtures/${file}`, import.meta.url),
        "utf8",
      );
      const { passed, failures } = checkCollationTest(contents, alternate);
      assert.deepEqual(failures, []);
      assert.ok(passed >= 4000, `only ${passed} test cases`);
    });
  }
});

test("compare", async (t) => {
  await t.test("sorts letters before their accented and capital forms", () => {
    assert.deepEqual(
      ["Zebra", "b", "á", "af", "B", "æ", "a", "zebra", "ae", "A"].sort(
        compare,
      ),
      ["a", "A", "á", "ae", "æ", "af", "b", "B", "zebra", "Zebra"],
    );
  });

  await t.test("orders scripts and digits", () => {
    assert.deepEqual(
      ["中", "я", "ア", "z", "Ω", "9", "あ", "10"].sort(compare),
      ["10", "9", "z", "Ω", "я", "あ", "ア", "中"],
    );
  });

  await t.test("returns -1, 0 or 1", () => {
    assert.equal(compare("a", "b"), -1);
    assert.equal(compare("b", "a"), 1);
    assert.equal(compare("a", "a"), 0);
    assert.equal(compare("", ""), 0);
    assert.equal(compare("", "a"), -1);
  });

  await t.test("compares canonically equivalent strings as equal", () => {
    assert.equal(compare("é", "é"), 0);
    assert.equal(compare("Å", "Å"), 0, "angstrom sign");
    assert.equal(compare("가", "가"), 0, "Hangul syllable");
    assert.equal(compare("Å", "Å", { strength: "identical" }), 0);
  });

  await t.test("strength", () => {
    assert.equal(compare("resume", "résumé", { strength: "primary" }), 0);
    assert.equal(compare("resume", "résumé", { strength: "secondary" }), -1);
    assert.equal(compare("a", "A", { strength: "secondary" }), 0);
    assert.equal(compare("a", "A", { strength: "tertiary" }), -1);
    assert.equal(compare("a\u0000", "a"), 0, "ignorable");
    assert.equal(compare("a\u0000", "a", { strength: "identical" }), 1);
  });

  await t.test("alternate, as in table 12 of UTS #10", () => {
    const list = [
      "de luge",
      "de Luge",
      "de-luge",
      "de-Luge",
      "de‐luge",
      "de‐Luge",
      "death",
      "deluge",
      "deLuge",
      "demark",
    ];
    assert.deepEqual(sorted(list.toReversed()), list);
    assert.deepEqual(sorted(list, { alternate: "shifted" }), [
      "death",
      "de luge",
      "de-luge",
      "de‐luge",
      "deluge",
      "de Luge",
      "de-Luge",
      "de‐Luge",
      "deLuge",
      "demark",
    ]);
  });

  await t.test("shifted ignores punctuation up to the tertiary level", () => {
    const shifted = { alternate: "shifted" };
    assert.equal(compare("co-op", "coop"), -1);
    assert.equal(compare("co-op", "coop", shifted), -1);
    assert.equal(
      compare("co-op", "coop", { ...shifted, strength: "tertiary" }),
      0,
    );
    assert.equal(compare("co-op", "coop", { strength: "quaternary" }), -1);
  });

  await t.test("the same string with other options", () => {
    assert.equal(compare("a b", "ab"), -1);
    assert.equal(compare("a b", "ab", { alternate: "shifted" }), -1);
    assert.equal(
      compare("a b", "ab", { alternate: "shifted", strength: "tertiary" }),
      0,
    );
    assert.equal(compare("a b", "ab"), -1);
  });

  await t.test("rejects invalid arguments", () => {
    assert.throws(() => compare(1, "a"), TypeError);
    assert.throws(() => compare("a", null), TypeError);
    assert.throws(() => compare("a", "b", { strength: "case" }), RangeError);
    assert.throws(
      () => compare("a", "b", { alternate: "blanked" }),
      RangeError,
    );
  });
});

test("sortKey", async (t) => {
  await t.test("weights of each level, separated by zeros", () => {
    const [primary, secondary, tertiary] = sortKey("ab").split("\0");
    assert.equal(primary.length, 2);
    assert.equal(weights(secondary), "0020 0020");
    assert.equal(weights(tertiary), "0002 0002");
    assert.equal(sortKey("ab", { strength: "primary" }), primary);
    assert.equal(sortKey(""), "\0\0");
  });

  await t.test("contractions", () => {
    assert.equal(sortKey("й"), sortKey("й"), "и + breve is й");
    assert.equal(
      sortKey("й̧").split("\0")[0],
      sortKey("й").split("\0")[0],
      "a cedilla between them does not block the breve",
    );
    assert.notEqual(
      sortKey("и́̆").split("\0")[0],
      sortKey("й").split("\0")[0],
      "an acute accent does",
    );
    assert.equal(
      sortKey("ྲཱྀ").split("\0")[0].length,
      1,
      "a longer match than the two matches of its prefixes",
    );
    assert.equal(sortKey("ྲཱ").split("\0")[0].length, 2);
  });

  await t.test("implicit weights", () => {
    const primary = (text) => weights(sortKey(text, { strength: "primary" }));
    assert.equal(primary("中"), "fb40 ce2d", "core Han");
    assert.equal(primary("\u{20000}"), "fb84 8000", "other Han");
    assert.equal(primary("\u{17000}"), "fb00 8000", "Tangut");
    assert.equal(primary("͸"), "fbc0 8378", "unassigned");
    assert.equal(primary("\ud800"), "fbc1 d800", "lone surrogate");
  });

  await t.test("shifted adds a fourth level", () => {
    const levels = sortKey("a b", { alternate: "shifted" }).split("\0");
    assert.equal(levels.length, 4);
    assert.equal(levels[0], sortKey("ab", { strength: "primary" }));
    assert.match(weights(levels[3]), /^ffff [0-9a-f]{4} ffff$/);
  });

  await t.test("orders as compare does", () => {
    const list = [
      "",
      "a",
      "A",
      "a b",
      "ab",
      "a-b",
      "á",
      "é",
      "é",
      "й",
      "й",
      "中",
      "\u{20000}",
      "￾",
      "a￾b",
      "a\u0000",
      "\u{1f600}",
      "￿",
      "\ud800",
    ];
    for (const alternate of ["non-ignorable", "shifted"]) {
      for (const strength of [
        "primary",
        "secondary",
        "tertiary",
        "quaternary",
        "identical",
      ]) {
        const options = { alternate, strength };
        for (const a of list) {
          const keyA = sortKey(a, options);
          for (const b of list) {
            const keyB = sortKey(b, options);
            assert.equal(
              compare(a, b, options),
              keyA < keyB ? -1 : keyA > keyB ? 1 : 0,
              `${JSON.stringify([a, b])} ${alternate} ${strength}`,
            );
          }
        }
      }
    }
  });

  await t.test("long strings", () => {
    const text = "Unicode collation ".repeat(2000);
    assert.equal(sortKey(text).split("\0")[1].length, 18 * 2000);
    assert.equal(compare(text, `${text}a`), -1);
  });

  await t.test("rejects invalid arguments", () => {
    assert.throws(() => sortKey(1), TypeError);
    assert.throws(() => sortKey("a", { strength: 3 }), RangeError);
  });
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.compare);
  assert.equal(main("a", "b"), -1);
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
