import assert from "node:assert/strict";
import test from "node:test";
import {
  convertToPreferredUnits,
  convertUnit,
  formatMeasure,
  getMeasurementSystem,
  getPaperSize,
  getPreferredUnits,
  VERSION,
} from "../dist/index.mjs";
import { conversions, localePreferences, preferences } from "./conformance.mjs";

test("CLDR unit conversion tests", async (t) => {
  for (const [from, to, expected] of conversions) {
    await t.test(`1000 ${from} in ${to}`, () => {
      assert.equal(convertUnit(1000, from, to), expected);
    });
  }
});

test("CLDR unit preference tests", async (t) => {
  for (const [usage, region, amount, unit, expected] of preferences) {
    await t.test(`${amount} ${unit}, ${usage} in ${region}`, () => {
      const result = convertToPreferredUnits(amount, unit, { usage, region });
      assert.deepEqual(
        result.map(({ unit, value }) => [unit, value]),
        expected,
      );
    });
  }
});

test("CLDR unit locale preference tests", async (t) => {
  for (const [
    unit,
    amount,
    usage,
    locale,
    expectedUnit,
    expected,
  ] of localePreferences) {
    await t.test(`${amount} ${unit}, ${usage} in ${locale}`, () => {
      assert.deepEqual(
        convertToPreferredUnits(amount, unit, { usage, locale }),
        [{ unit: expectedUnit, value: expected }],
      );
    });
  }
});

test("convertUnit", async (t) => {
  await t.test("gives exact results", () => {
    const cases = [
      [1, "mile", "kilometer", 1.609344],
      [1, "kilometer", "mile", 1000 / 1609.344],
      [212, "fahrenheit", "celsius", 100],
      [98.6, "fahrenheit", "celsius", 37],
      [-40, "celsius", "fahrenheit", -40],
      [0, "kelvin", "celsius", -273.15],
      [0.1, "mile", "foot", 528],
      [1, "square-mile", "square-kilometer", 2.589988110336],
      [1, "cubic-foot", "liter", 28.316846592],
      [1, "gallon", "liter", 3.785411784],
      [1, "gallon-imperial", "liter", 4.54609],
      [1, "stone", "pound", 14],
    ];
    for (const [value, from, to, expected] of cases) {
      assert.equal(convertUnit(value, from, to), expected, `${from} to ${to}`);
    }
  });

  await t.test("converts prefixed units", () => {
    assert.equal(convertUnit(1, "kibibyte", "byte"), 1024);
    assert.equal(convertUnit(1, "gibibyte", "megabyte"), 1073.741824);
    assert.equal(convertUnit(1, "gigabit", "megabyte"), 125);
    assert.equal(convertUnit(1, "millimeter", "micrometer"), 1000);
    assert.equal(convertUnit(1, "megawatt", "kilowatt"), 1000);
  });

  await t.test("converts powers and compound units", () => {
    assert.equal(convertUnit(1, "square-foot", "square-inch"), 144);
    assert.equal(convertUnit(1, "cubic-meter", "liter"), 1000);
    assert.equal(convertUnit(36, "kilometer-per-hour", "meter-per-second"), 10);
    assert.equal(convertUnit(1, "g-force", "meter-per-square-second"), 9.80665);
    assert.equal(convertUnit(1, "kilowatt-hour", "megajoule"), 3.6);
    assert.equal(convertUnit(1, "newton-meter", "joule"), 1);
    assert.equal(
      convertUnit(1, "pound-force-per-square-inch", "kilopascal"),
      6.894757293168361,
    );
    assert.equal(
      convertUnit(1, "foot-per-second-per-second", "meter-per-square-second"),
      0.3048,
    );
    assert.equal(
      convertUnit(1, "liter-per-100-kilometer", "liter-per-kilometer"),
      0.01,
    );
  });

  await t.test("converts reciprocal units", () => {
    assert.equal(convertUnit(50, "foot-per-minute", "mile-per-hour"), 25 / 44);
    assert.equal(
      convertUnit(50, "mile-per-gallon", "liter-per-100-kilometer"),
      112903 / 24000,
    );
    assert.equal(convertUnit(50, "foot-per-minute", "hour-per-mile"), 1.76);
    assert.equal(
      convertUnit(0, "mile-per-gallon", "liter-per-100-kilometer"),
      Infinity,
    );
  });

  await t.test("applies offsets to temperatures on their own only", () => {
    assert.equal(convertUnit(1, "celsius-per-second", "kelvin-per-second"), 1);
    assert.equal(
      convertUnit(1, "fahrenheit-per-second", "kelvin-per-second"),
      5 / 9,
    );
  });

  await t.test("accepts deprecated units and constants", () => {
    assert.equal(convertUnit(1, "metric-ton", "kilogram"), 1000);
    assert.equal(
      convertUnit(1, "meter-per-second-squared", "meter-per-square-second"),
      1,
    );
    assert.equal(convertUnit(25, "part-per-million", "percent"), 0.0025);
    assert.equal(convertUnit(1, "percent", "part-per-1e6"), 10000);
  });

  await t.test("passes NaN and infinities through", () => {
    assert.equal(convertUnit(NaN, "meter", "foot"), NaN);
    assert.equal(convertUnit(-Infinity, "celsius", "fahrenheit"), -Infinity);
  });

  await t.test("rejects unknown and incompatible units", () => {
    for (const [from, to] of [
      ["smoot", "meter"],
      ["meter", "second"],
      ["year", "day"],
      ["beaufort", "meter-per-second"],
      ["foot-and-inch", "meter"],
      ["meter-per", "meter"],
      ["", "meter"],
    ]) {
      assert.throws(
        () => convertUnit(1, from, to),
        RangeError,
        `${from} to ${to}`,
      );
    }
    assert.throws(() => convertUnit("1", "meter", "foot"), TypeError);
    assert.throws(() => convertUnit(1, 5, "foot"), TypeError);
  });
});

test("getPreferredUnits", async (t) => {
  await t.test("ranks units with thresholds", () => {
    assert.deepEqual(getPreferredUnits("meter", { region: "US" }), [
      { units: ["mile"], geq: 1 },
      { units: ["foot"], geq: 1 },
      { units: ["inch"], geq: 0 },
    ]);
    assert.deepEqual(
      getPreferredUnits("meter", { region: "001", usage: "road" }),
      [
        { units: ["kilometer"], geq: 0.9 },
        { units: ["meter"], geq: 300 },
        { units: ["meter"], geq: 10 },
        { units: ["meter"], geq: 0 },
      ],
    );
  });

  await t.test("gives mixed units", () => {
    assert.deepEqual(
      getPreferredUnits("meter", { region: "US", usage: "person-height" }),
      [
        { units: ["foot", "inch"], geq: 3 },
        { units: ["inch"], geq: 0 },
      ],
    );
    assert.deepEqual(
      getPreferredUnits("kilogram", { region: "GB", usage: "person" }),
      [
        { units: ["stone", "pound"], geq: 1 },
        { units: ["pound", "ounce"], geq: 0 },
      ],
    );
  });

  await t.test("falls back to 001 and to containing usages", () => {
    const world = getPreferredUnits("meter", {
      region: "001",
      usage: "person-height",
    });
    assert.deepEqual(
      getPreferredUnits("meter", { region: "DE", usage: "person-height" }),
      world,
    );
    assert.deepEqual(
      getPreferredUnits("meter", { region: "US", usage: "road-motorway" }),
      getPreferredUnits("meter", { region: "US", usage: "road" }),
    );
    assert.deepEqual(
      getPreferredUnits("meter", { region: "US", usage: "unknown" }),
      getPreferredUnits("meter", { region: "US" }),
    );
    assert.deepEqual(getPreferredUnits("celsius"), [
      { units: ["celsius"], geq: 0 },
    ]);
  });

  await t.test("finds the region of a locale", () => {
    const temperature = (locale) =>
      getPreferredUnits("celsius", { locale })[0].units[0];
    assert.equal(temperature("en"), "fahrenheit"); // Likely region US
    assert.equal(temperature("en-GB"), "celsius");
    assert.equal(temperature("de"), "celsius");
    assert.equal(temperature("en-u-rg-dezzzz"), "celsius");
    assert.equal(temperature("en-US-u-mu-celsius"), "celsius");
    assert.equal(temperature("en-US-u-ms-metric"), "celsius");
    assert.equal(temperature(new Intl.Locale("es-US")), "fahrenheit");
    assert.equal(
      getPreferredUnits("celsius", { locale: "en-US", region: "DE" })[0]
        .units[0],
      "celsius",
    );
  });

  await t.test("gives base units for quantities without preferences", () => {
    assert.deepEqual(getPreferredUnits("kiloampere"), [
      { units: ["ampere"], geq: 0 },
    ]);
    assert.deepEqual(getPreferredUnits("lumen"), [
      { units: ["candela-square-meter-per-square-meter"], geq: 0 },
    ]);
    assert.deepEqual(getPreferredUnits("candela-per-byte"), [
      { units: ["candela-per-bit"], geq: 0 },
    ]);
  });

  await t.test("rejects invalid input", () => {
    assert.throws(
      () => getPreferredUnits("meter", { region: "USA" }),
      RangeError,
    );
    assert.throws(() => getPreferredUnits("meter", { region: 840 }), TypeError);
    assert.throws(() => getPreferredUnits("meter", { usage: 1 }), TypeError);
    assert.throws(() => getPreferredUnits("meter", null), TypeError);
    assert.throws(() => getPreferredUnits("smoot"), RangeError);
  });
});

test("convertToPreferredUnits", async (t) => {
  await t.test("splits mixed units", () => {
    assert.deepEqual(
      convertToPreferredUnits(1.78, "meter", {
        region: "US",
        usage: "person-height",
      }),
      [
        { unit: "foot", value: 5 },
        { unit: "inch", value: 10.078740157480315 },
      ],
    );
    assert.deepEqual(
      convertToPreferredUnits(-90, "second", { usage: "media" }),
      [
        { unit: "minute", value: -1 },
        { unit: "second", value: -30 },
      ],
    );
  });

  await t.test("converts between reciprocal units", () => {
    assert.deepEqual(
      convertToPreferredUnits(30, "mile-per-gallon", {
        region: "DE",
        usage: "vehicle-fuel",
      }),
      [{ unit: "liter-per-100-kilometer", value: 7.840486111111111 }],
    );
  });

  await t.test("converts to base units without preferences", () => {
    assert.deepEqual(convertToPreferredUnits(2.5, "kiloampere"), [
      { unit: "ampere", value: 2500 },
    ]);
  });
});

test("formatMeasure", async (t) => {
  await t.test("formats in the preferred units", () => {
    const cases = [
      [1.78, "meter", "person-height", "5 ft, 10 in", "5 ft, 10 in", "178 cm"],
      [25, "celsius", undefined, "77°F", "25°C", "25 °C"],
      [100, "kilometer", "road", "62 mi", "62 mi", "100 km"],
      [0.4, "kilometer", "road", "1,312 ft", "437 yd", "400 m"],
      [5, "liter", "fluid", "1.3 gal", "1.1 gal Imp.", "5 l"],
      [80, "kilogram", "person", "176 lb", "12 st, 8 lb", "80 kg"],
      [
        7,
        "liter-per-100-kilometer",
        "vehicle-fuel",
        "34 mpg",
        "40 mpg Imp.",
        "7 L/100km",
      ],
      [120, "kilometer-per-hour", undefined, "75 mph", "75 mph", "120 km/h"],
      [1000, "square-meter", undefined, "10,764 ft²", "10,764 ft²", "1.000 m²"],
      [
        1013.25,
        "hectopascal",
        "baromtrc",
        "30 inHg",
        "1,013 mbar",
        "1.013 hPa",
      ],
    ];
    for (const [value, unit, usage, ...expected] of cases) {
      const results = ["en-US", "en-GB", "de-DE"].map((locale) =>
        formatMeasure(value, unit, { locale, usage }),
      );
      assert.deepEqual(results, expected, `${value} ${unit} ${usage}`);
    }
  });

  await t.test("rounds and carries mixed units", () => {
    const height = (value, locale = "en-US") =>
      formatMeasure(value, "meter", { locale, usage: "person-height" });
    assert.equal(height(1.825), "6 ft"); // 5 ft 11.85 in
    assert.equal(height(1.83), "6 ft"); // 6 ft 0.05 in
    assert.equal(height(-1.78), "-5 ft, 10 in");
    assert.equal(height(0), "0 in");
    assert.equal(height(1.78, "sv-SE"), "1 m, 78 cm");
    assert.equal(
      formatMeasure(0.0001, "meter", { locale: "en-US", usage: "vehicle" }),
      "0 ft",
    );
  });

  await t.test("uses the region and unitDisplay options", () => {
    const options = { locale: "en-US", usage: "person-height" };
    assert.equal(
      formatMeasure(1.78, "meter", { ...options, unitDisplay: "long" }),
      "5 feet, 10 inches",
    );
    assert.equal(
      formatMeasure(1.78, "meter", { ...options, unitDisplay: "narrow" }),
      "5\u2032 10\u2033",
    );
    assert.equal(
      formatMeasure(1.78, "meter", { ...options, region: "DE" }),
      "178 cm",
    );
  });

  await t.test("formats quantities without preferences unconverted", () => {
    assert.equal(formatMeasure(5, "gigabyte", { locale: "en-US" }), "5 GB");
    assert.throws(
      () => formatMeasure(5, "volt", { locale: "en-US" }),
      RangeError,
    );
  });

  await t.test("shows infinities and NaN in the largest unit", () => {
    assert.equal(formatMeasure(Infinity, "meter", { locale: "en-US" }), "∞ mi");
    assert.equal(
      formatMeasure(NaN, "meter", { locale: "en-US", usage: "person-height" }),
      "NaN ft",
    );
  });

  await t.test("rejects invalid input", () => {
    assert.throws(() => formatMeasure(1, "meter"), TypeError);
    assert.throws(() => formatMeasure(1, "meter", {}), TypeError);
    assert.throws(
      () => formatMeasure(1, "smoot", { locale: "en" }),
      RangeError,
    );
  });
});

test("getMeasurementSystem", () => {
  assert.equal(getMeasurementSystem("US"), "US");
  assert.equal(getMeasurementSystem("gb"), "UK");
  assert.equal(getMeasurementSystem("DE"), "metric");
  assert.equal(getMeasurementSystem("001"), "metric");
  assert.equal(getMeasurementSystem("MM"), "UK");
  assert.equal(
    getMeasurementSystem("MM", { category: "temperature" }),
    "metric",
  );
  assert.equal(getMeasurementSystem("BS"), "metric");
  assert.equal(getMeasurementSystem("BS", { category: "temperature" }), "US");
  assert.throws(() => getMeasurementSystem("USA"), RangeError);
  assert.throws(() => getMeasurementSystem(undefined), TypeError);
});

test("getPaperSize", () => {
  assert.equal(getPaperSize("US"), "US-Letter");
  assert.equal(getPaperSize("ca"), "US-Letter");
  assert.equal(getPaperSize("DE"), "A4");
  assert.equal(getPaperSize("001"), "A4");
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
