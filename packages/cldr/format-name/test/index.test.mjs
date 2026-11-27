import assert from "node:assert/strict";
import test from "node:test";
import { VERSION, formatName } from "../dist/index.mjs";
import conformance from "./conformance.mjs";

test("CLDR conformance sample", async (t) => {
  for (const [
    locale,
    order,
    length,
    usage,
    formality,
    name,
    expected,
  ] of conformance) {
    await t.test(
      `${locale} ${order} ${length} ${usage} ${formality}: ${expected}`,
      () => {
        assert.equal(
          formatName(name, { locale, order, length, usage, formality }),
          expected,
        );
      },
    );
  }
});

test("formatName", async (t) => {
  await t.test("uses the locale's default length and formality", () => {
    assert.equal(
      formatName({ given: "John", surname: "Smith" }, { locale: "en" }),
      "John Smith",
    );
  });

  await t.test("uses informal names when informal", () => {
    const name = { given: "Robert", "given-informal": "Bob", surname: "Smith" };
    assert.equal(
      formatName(name, {
        locale: "en",
        usage: "addressing",
        formality: "informal",
      }),
      "Bob",
    );
  });

  await t.test("formats monograms", () => {
    const name = { given: "John", given2: "Ronald Reuel", surname: "Tolkien" };
    assert.equal(
      formatName(name, {
        locale: "en",
        length: "long",
        usage: "monogram",
        formality: "formal",
      }),
      "JRT",
    );
  });

  await t.test("sorts by the surname's core", () => {
    const name = {
      given: "Johannes",
      "surname-prefix": "van den",
      "surname-core": "Berg",
    };
    assert.equal(
      formatName(name, {
        locale: "nl",
        order: "sorting",
        length: "long",
        formality: "formal",
      }),
      "Berg, Johannes van den",
    );
  });

  await t.test("keeps punctuation in initials where the pattern asks", () => {
    const name = { given: "Anne-Marie", surname: "Dupont" };
    assert.equal(
      formatName(name, { locale: "fr", length: "short", formality: "formal" }),
      "A.-M. Dupont",
    );
  });

  await t.test("orders names by the name's locale", () => {
    assert.equal(
      formatName({ given: "一郎", surname: "安藤" }, { locale: "ja" }),
      "安藤一郎",
    );
    assert.equal(
      formatName(
        { given: "John", surname: "Smith", preferredOrder: "surnameFirst" },
        { locale: "en" },
      ),
      "Smith John",
    );
  });

  await t.test("separates the words of foreign names", () => {
    const name = {
      given: "アルベルト",
      surname: "アインシュタイン",
      locale: "de-CH",
    };
    assert.equal(
      formatName(name, { locale: "ja" }),
      "アルベルト・アインシュタイン",
    );
  });

  await t.test("formats names in another script with a locale for it", () => {
    assert.equal(
      formatName({ given: "Albert", surname: "Einstein" }, { locale: "ja" }),
      "Albert Einstein",
    );
    assert.equal(
      formatName(
        { given: "一郎", surname: "安藤", locale: "ja" },
        { locale: "en" },
      ),
      "安藤一郎",
    );
  });

  await t.test("formats mononyms", () => {
    assert.equal(formatName({ given: "Zendaya" }, { locale: "fr" }), "Zendaya");
  });

  await t.test("accepts Intl.Locale", () => {
    assert.equal(
      formatName(
        { given: "John", surname: "Smith" },
        { locale: new Intl.Locale("en-GB") },
      ),
      "John Smith",
    );
  });

  await t.test("rejects invalid input", () => {
    assert.throws(() => formatName(null, { locale: "en" }), TypeError);
    assert.throws(() => formatName({ given: "a" }), TypeError);
    assert.throws(
      () => formatName({ title: "Dr." }, { locale: "en" }),
      TypeError,
    );
    assert.throws(
      () => formatName({ nickname: "a", given: "b" }, { locale: "en" }),
      TypeError,
    );
    assert.throws(() => formatName({ given: 5 }, { locale: "en" }), TypeError);
    assert.throws(
      () => formatName({ given: "a" }, { locale: "en", length: "huge" }),
      RangeError,
    );
  });
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
