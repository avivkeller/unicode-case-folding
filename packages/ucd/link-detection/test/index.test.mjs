import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  VERSION,
  findLinkEnd,
  findLinks,
  formatEmail,
  formatLink,
} from "../dist/index.mjs";
import {
  checkDetection,
  checkFormatting,
  parseFormattingTest,
} from "./conformance.mjs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");
const linksOf = (text, options) =>
  findLinks(text, options).map(
    ({ type, start, end }) => `${type}:${text.slice(start, end)}`,
  );

test("LinkDetectionTest.txt", () => {
  const { total, failures } = checkDetection(read("LinkDetectionTest.txt"));
  assert.ok(total > 300);
  assert.deepEqual(failures, []);
});

test("LinkFormattingTest.txt", () => {
  const { total, failures } = checkFormatting(read("LinkFormattingTest.txt"));
  assert.ok(total > 50);
  assert.deepEqual(failures, []);
});

test("formatted links are stable and detected whole", () => {
  for (const { expected } of parseFormattingTest(
    read("LinkFormattingTest.txt"),
  )) {
    assert.equal(formatLink(expected), expected);
    assert.deepEqual(findLinks(`See ${expected} now`), [
      { type: "url", start: 4, end: 4 + expected.length },
    ]);
  }
});

test("findLinks", async (t) => {
  const cases = [
    ["Visit example.com.", ["url:example.com"], "trailing period"],
    ["(see example.com/a_(b))", ["url:example.com/a_(b)"], "brackets"],
    [
      "https://example.com:8080/a?b=c#d!",
      ["url:https://example.com:8080/a?b=c#d"],
      "port",
    ],
    ["http://127.0.0.1/x", ["url:http://127.0.0.1/x"], "IPv4 with a scheme"],
    ["127.0.0.1/x and v1.2 and e.g. this", [], "no top-level domain"],
    ["ftp://example.com/x", [], "other schemes"],
    ["my_file.txt and a/b.cd", [], "part of a longer token"],
    ["http://user:pw@example.com/x", [], "userinfo"],
    [
      "mail jane.doe+tag@example.org.",
      ["email:jane.doe+tag@example.org"],
      "email",
    ],
    ["a@b.co@c.org", [], "two @"],
    ["x.com/#a:~:text=(b),c. X", ["url:x.com/#a:~:text=(b),c"], "directive"],
    ["\u{1f600}example.com/\u{1f600}", ["url:example.com/\u{1f600}"], "emoji"],
    ["", [], "empty text"],
  ];
  for (const [text, expected, description] of cases) {
    await t.test(description, () => assert.deepEqual(linksOf(text), expected));
  }

  await t.test("returns UTF-16 offsets", () => {
    assert.deepEqual(findLinks("\u{1f600} x.com/\u{1f600}!"), [
      { type: "url", start: 3, end: 11 },
    ]);
  });

  await t.test("acceptDomain", () => {
    const acceptDomain = (domain) => domain.endsWith(".com");
    assert.deepEqual(
      linksOf("helpers.py, example.com, a@b.org", { acceptDomain }),
      ["url:example.com"],
    );
  });

  await t.test("rejects invalid arguments", () => {
    assert.throws(() => findLinks(1), TypeError);
  });
});

test("findLinkEnd", () => {
  assert.equal(findLinkEnd("x.com/a).", 5), 7);
  assert.equal(findLinkEnd("x.com/a(b).", 5), 10);
  assert.equal(findLinkEnd("x.com, y", 5), 5);
  assert.equal(findLinkEnd("x.com?a=(b&c)", 5), 12, "brackets do not span &");
  assert.throws(() => findLinkEnd("x.com", 6), RangeError);
  assert.throws(() => findLinkEnd(1, 0), TypeError);
});

test("formatLink", () => {
  assert.equal(
    formatLink("https://example.com/a%20b/c%2Fd?x=1+2%2B3&y=%26#%C3%A9."),
    "https://example.com/a%20b/c%2Fd?x=1+2%2B3&y=%26#é%2E",
  );
  assert.equal(
    formatLink("https://ja.wikipedia.org/wiki/%E3%82%A2%E3%83%AB"),
    "https://ja.wikipedia.org/wiki/アル",
  );
  assert.equal(formatLink("x.com/%FF%C3%A9"), "x.com/%FF%C3%A9", "not UTF-8");
  assert.equal(formatLink("x.com/100%"), "x.com/100%");
  assert.equal(formatLink("x.com"), "x.com");
  assert.equal(
    formatLink({
      base: "https://example.com",
      path: ["wiki", "A/B?"],
      query: [["q", "a&b=c"], ["flag"]],
      fragment: "top.",
    }),
    "https://example.com/wiki/A%2FB%3F?q=a%26b%3Dc&flag#top%2E",
  );
  assert.equal(
    formatLink({ base: "x.com", directives: ["text=a,b", "text=c"] }),
    "x.com#:~:text=a,b:~:text=c",
  );
  assert.throws(() => formatLink(1), TypeError);
  assert.throws(() => formatLink({ path: [1] }), TypeError);
});

test("formatEmail", () => {
  assert.equal(formatEmail("john.doe", "example.com"), "john.doe@example.com");
  assert.equal(
    formatEmail('john "j" doe', "example.com"),
    '"john \\"j\\" doe"@example.com',
  );
  assert.equal(formatEmail("john..doe", "x.org"), '"john..doe"@x.org');
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.findLinks);
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
