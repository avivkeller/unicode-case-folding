import assert from "node:assert/strict";
import test from "node:test";
import {
  VERSION,
  getCurrencies,
  getCurrency,
  getCurrencyRounding,
} from "../dist/index.mjs";

const on = (date) => new Date(`${date}T12:00:00Z`);

test("getCurrency", () => {
  assert.equal(getCurrency("US"), "USD");
  assert.equal(getCurrency("JP"), "JPY");
  assert.equal(getCurrency("de"), "EUR", "case-insensitive");
  assert.equal(getCurrency("AQ"), undefined, "no currency");
  assert.equal(getCurrency("ZZ"), undefined, "unknown region");
});

test("getCurrency on a date", () => {
  assert.equal(getCurrency("DE", on("1990-06-01")), "DEM");
  assert.equal(getCurrency("HR", on("2022-12-31")), "HRK");
  assert.equal(getCurrency("HR", on("2023-01-01")), "EUR");
});

test("getCurrencies", () => {
  assert.deepEqual(getCurrencies("PA"), ["PAB", "USD"]);
  assert.deepEqual(
    getCurrencies("US"),
    ["USD"],
    "leaves out non-tender currencies",
  );
});

test("getCurrencyRounding", () => {
  assert.deepEqual(getCurrencyRounding("USD"), {
    fractionDigits: 2,
    roundingIncrement: 1,
    cashFractionDigits: 2,
    cashRoundingIncrement: 1,
  });
  assert.equal(getCurrencyRounding("jpy").fractionDigits, 0);
  assert.equal(getCurrencyRounding("CHF").cashRoundingIncrement, 5);
  assert.equal(getCurrencyRounding("SEK").cashFractionDigits, 0);
  assert.throws(() => getCurrencyRounding("US"), RangeError);
});

test("getCurrencyRounding works with Intl.NumberFormat", () => {
  const { cashFractionDigits, cashRoundingIncrement } =
    getCurrencyRounding("CHF");
  const format = new Intl.NumberFormat("en", {
    style: "currency",
    currency: "CHF",
    minimumFractionDigits: cashFractionDigits,
    maximumFractionDigits: cashFractionDigits,
    roundingIncrement: cashRoundingIncrement,
  });
  // Intl separates the currency with a no-break space
  assert.equal(format.format(1.03).replace(/\s/g, " "), "CHF 1.05");
});

test("rejects invalid arguments", () => {
  assert.throws(() => getCurrency(1), TypeError);
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.getCurrency);
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
