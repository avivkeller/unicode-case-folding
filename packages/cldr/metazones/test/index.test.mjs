import assert from "node:assert/strict";
import test from "node:test";
import {
  VERSION,
  getGoldenZone,
  getMetazone,
  getMetazoneTimeZones,
  getMetazones,
} from "../dist/index.mjs";

const on = (date) => new Date(`${date}T12:00:00Z`);

test("getMetazone", async (t) => {
  const cases = [
    ["America/Los_Angeles", "America_Pacific"],
    ["Europe/Berlin", "Europe_Central"],
    ["Europe/London", "British"],
    ["Asia/Kolkata", "India"],
    ["Asia/Calcutta", "India"],
    ["asia/kolkata", "India"],
    ["US/Pacific", "America_Pacific"],
    ["Europe/Kyiv", "Europe_Eastern"],
    ["UTC", undefined],
    ["Nowhere/City", undefined],
  ];
  for (const [timeZone, expected] of cases) {
    await t.test(timeZone, () => {
      assert.equal(getMetazone(timeZone, on("2026-01-01")), expected);
    });
  }

  await t.test("on a date", () => {
    assert.equal(getMetazone("Europe/Kyiv", on("1985-01-01")), "Moscow");
    assert.equal(
      getMetazone("Europe/Kyiv", on("1995-01-01")),
      "Europe_Eastern",
    );
    assert.equal(getMetazone("Asia/Amman", on("2020-01-01")), "Europe_Eastern");
    assert.equal(getMetazone("Asia/Amman", on("2024-01-01")), undefined);
  });

  await t.test("a period starts at its first instant", () => {
    const change = new Date("1990-06-30T22:00:00Z");
    assert.equal(getMetazone("Europe/Kyiv", change), "Europe_Eastern");
    assert.equal(
      getMetazone("Europe/Kyiv", new Date(change.getTime() - 1)),
      "Moscow",
    );
  });
});

test("getMetazoneTimeZones", () => {
  assert.deepEqual(getMetazoneTimeZones("America_Pacific", on("2026-01-01")), [
    "America/Los_Angeles",
    "America/Tijuana",
    "America/Vancouver",
  ]);
  assert.ok(
    getMetazoneTimeZones("Moscow", on("1985-01-01")).includes("Europe/Kyiv"),
  );
  assert.ok(
    !getMetazoneTimeZones("Moscow", on("2026-01-01")).includes("Europe/Kyiv"),
  );
  assert.deepEqual(getMetazoneTimeZones("Nowhere"), []);
});

test("getGoldenZone", () => {
  assert.equal(getGoldenZone("Europe_Central"), "Europe/Paris");
  assert.equal(getGoldenZone("Europe_Central", "DE"), "Europe/Berlin");
  assert.equal(getGoldenZone("Europe_Central", "US"), "Europe/Paris");
  assert.equal(getGoldenZone("India"), "Asia/Kolkata", "the current name");
  assert.equal(getGoldenZone("Nowhere"), undefined);
});

test("getMetazones", () => {
  const metazones = getMetazones();
  assert.ok(metazones.length > 150);
  assert.deepEqual(metazones, [...metazones].sort());
  assert.ok(metazones.includes("Europe_Central"));
  metazones.length = 0;
  assert.ok(getMetazones().length > 150, "returns copies");
});

test("time zones are in the metazone that lists them", () => {
  const date = on("2026-01-01");
  for (const metazone of getMetazones()) {
    for (const timeZone of getMetazoneTimeZones(metazone, date)) {
      assert.equal(getMetazone(timeZone, date), metazone, timeZone);
    }
    const golden = getGoldenZone(metazone);
    assert.equal(typeof golden, "string", metazone);
    assert.doesNotThrow(
      () => new Intl.DateTimeFormat("en", { timeZone: golden }),
      golden,
    );
  }
});

test("knows nearly every time zone of the engine", () => {
  const date = on("2026-01-01");
  const timeZones = Intl.supportedValuesOf("timeZone");
  const without = timeZones.filter(
    (timeZone) => getMetazone(timeZone, date) === undefined,
  );
  assert.ok(without.length < timeZones.length / 20, without.join(", "));
});

test("rejects invalid arguments", () => {
  assert.throws(() => getMetazone(1), TypeError);
  assert.throws(() => getMetazone("Europe/Paris", new Date(NaN)), RangeError);
  assert.throws(() => getMetazoneTimeZones(null), TypeError);
  assert.throws(() => getGoldenZone("India", 356), TypeError);
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.getMetazone);
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
