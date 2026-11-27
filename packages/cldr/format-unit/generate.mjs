import * as cldr from "@internal/build/sources/cldr";

export const VERSION = await cldr.version();

const { unitPrefixes, unitConstants, unitQuantities, convertUnits } = (
  await cldr.json("cldr-core", "supplemental/units.json")
).supplemental;
const { unitPreferenceData } = (
  await cldr.json("cldr-core", "supplemental/unitPreferenceData.json")
).supplemental;
const { measurementData } = (
  await cldr.json("cldr-core", "supplemental/measurementData.json")
).supplemental;
const { unitIdComponents } = (
  await cldr.json("cldr-core", "supplemental/unitIdComponents.json")
).supplemental;
const unitAliases = (
  await cldr.json("cldr-core", "supplemental/unitsMetadata.json")
).supplemental.metadata.alias.alias;
const { ms: measurementSystemKeyword, mu: measurementUnitKeyword } = (
  await cldr.json("cldr-bcp47", "bcp47/measure.json")
).keyword.u;
const rootUnits = (await cldr.json("cldr-units-full", "main/und/units.json"))
  .main.und.units.short;

const ONE = [1n, 1n];
const ZERO = [0n, 1n];

function rational(numerator, denominator = 1n) {
  if (denominator < 0n) {
    numerator = -numerator;
    denominator = -denominator;
  }
  let divisor = numerator < 0n ? -numerator : numerator;
  let rest = denominator;
  while (rest !== 0n) [divisor, rest] = [rest, divisor % rest];
  return [numerator / divisor, denominator / divisor];
}

const multiply = (a, b) => rational(a[0] * b[0], a[1] * b[1]);
const divide = (a, b) => rational(a[0] * b[1], a[1] * b[0]);
const equals = (a, b) => a[0] === b[0] && a[1] === b[1];

function raise([numerator, denominator], exponent) {
  const power = BigInt(Math.abs(exponent));
  return exponent < 0
    ? rational(denominator ** power, numerator ** power)
    : rational(numerator ** power, denominator ** power);
}

function parseNumber(text) {
  const match = /^(\d+)(?:\.(\d+))?(?:E([+-]?\d+))?$/i.exec(text);
  if (!match) throw new Error(`Unsupported number in unit data: ${text}`);
  const [, whole, fraction = "", exponent = "0"] = match;
  const digits = BigInt(whole + fraction);
  const scale = BigInt(exponent) - BigInt(fraction.length);
  return scale < 0n
    ? rational(digits, 10n ** -scale)
    : rational(digits * 10n ** scale);
}

// * binds more tightly than /: a * b / c * d is (a * b) / (c * d)
function evaluate(expression) {
  const [numerator, ...denominators] = expression.split("/");
  let value = evaluateProduct(numerator);
  for (const denominator of denominators) {
    value = divide(value, evaluateProduct(denominator));
  }
  return value;
}

function evaluateProduct(text) {
  let value = ONE;
  for (const term of text.split("*")) {
    const name = term.trim();
    const factor = /^\d/.test(name) ? parseNumber(name) : constantValue(name);
    value = multiply(value, factor);
  }
  return value;
}

const constantValues = new Map();
function constantValue(name) {
  if (!constantValues.has(name)) {
    constantValues.set(name, evaluate(unitConstants[name]._value));
  }
  return constantValues.get(name);
}

// The runtime reads both with BigInt()
function exactInteger(value) {
  const safe = BigInt(Number.MAX_SAFE_INTEGER);
  return value >= -safe && value <= safe ? Number(value) : String(value);
}

const exactRational = ([numerator, denominator]) => [
  exactInteger(numerator),
  exactInteger(denominator),
];

const METRIC = 1;
const US_SYSTEM = 2;
const UK_SYSTEM = 4;
const ALL_SYSTEMS = METRIC | US_SYSTEM | UK_SYSTEM;

function systemBits(systems) {
  let bits = 0;
  if (systems.includes("metric") || systems.includes("metric_adjacent")) {
    bits |= METRIC;
  }
  if (systems.includes("ussystem")) bits |= US_SYSTEM;
  if (systems.includes("uksystem")) bits |= UK_SYSTEM;
  return bits;
}

const SPECIAL_CONVERSIONS = new Set(["beaufort"]);
const CONVERSION_KEYS = new Set([
  "_baseUnit",
  "_factor",
  "_offset",
  "_special",
  "_systems",
  "_description",
]);

const simpleUnits = new Map();
for (const [name, unit] of Object.entries(convertUnits)) {
  for (const key of Object.keys(unit)) {
    if (!CONVERSION_KEYS.has(key)) {
      throw new Error(`Unsupported conversion data for ${name}: ${key}`);
    }
  }
  if (unit._special !== undefined) {
    if (!SPECIAL_CONVERSIONS.has(unit._special)) {
      throw new Error(`Unsupported special conversion of ${name}`);
    }
    continue;
  }
  simpleUnits.set(name, {
    baseUnit: unit._baseUnit,
    factor: evaluate(unit._factor ?? "1"),
    offset: evaluate(unit._offset ?? "0"),
    systems: systemBits(unit._systems ?? []),
  });
}

for (const [name, unit] of simpleUnits) {
  if (convertUnits[name]._systems?.includes("person_age")) {
    unit.systems = simpleUnits.get(name.replace(/-person$/, "")).systems;
  }
}

const baseUnitNames = [...simpleUnits.keys()].filter(
  (name) => simpleUnits.get(name).baseUnit === name,
);

function powerExponent(name) {
  if (name === "square") return 2;
  if (name === "cubic") return 3;
  const match = /^pow(\d+)$/.exec(name);
  if (match === null) throw new Error(`Unsupported power: ${name}`);
  return Number(match[1]);
}

export const POWERS = new Map(
  unitIdComponents.power._values.map((name) => [name, powerExponent(name)]),
);

export const PREFIXES = new Map(
  Object.entries(unitPrefixes).map(([name, { _power10, _power2 }]) => {
    if ((_power10 === undefined) === (_power2 === undefined)) {
      throw new Error(`Unsupported unit prefix: ${name}`);
    }
    return [
      name,
      _power10 === undefined ? [2, Number(_power2)] : [10, Number(_power10)],
    ];
  }),
);

export const LONGEST_UNIT_PARTS = Math.max(
  ...[...simpleUnits.keys()].map((name) => name.split("-").length),
);

const CONSTANT = /^[1-9]\d*(?:e[1-9]\d*)?$/;

function matchSimpleUnit(parts, start) {
  const last = Math.min(parts.length, start + LONGEST_UNIT_PARTS);
  for (let end = last; end > start; end--) {
    const name = parts.slice(start, end).join("-");
    if (simpleUnits.has(name)) return [name, undefined, end];
    for (const prefix of PREFIXES.keys()) {
      const rest = name.slice(prefix.length);
      if (name.startsWith(prefix) && simpleUnits.has(rest)) {
        return [rest, prefix, end];
      }
    }
  }
  return undefined;
}

const baseSignatures = new Map(
  baseUnitNames.map((name) => [name, [[name, 1]]]),
);
function baseSignature(name) {
  if (!baseSignatures.has(name)) {
    const { numerator, denominator } = resolve(simpleUnits.get(name).baseUnit);
    baseSignatures.set(name, [
      ...numerator,
      ...[...denominator].map(([unit, exponent]) => [unit, -exponent]),
    ]);
  }
  return baseSignatures.get(name);
}

// Like parseUnit() in template.mjs, but undefined for unknown units
function resolve(id) {
  const unit = {
    factor: ONE,
    offset: ZERO,
    numerator: new Map(),
    denominator: new Map(),
    systems: ALL_SYSTEMS,
  };
  const parts = id.split("-");
  let inDenominator = false;
  let count = 0;
  let plainUnit;
  for (let i = 0; i < parts.length; ) {
    if (parts[i] === "per") {
      if (i + 1 === parts.length || parts[i + 1] === "per") return undefined;
      inDenominator = true;
      i++;
      continue;
    }
    const sign = inDenominator ? -1 : 1;
    count++;
    if (CONSTANT.test(parts[i])) {
      const [digits, exponent = "0"] = parts[i].split("e");
      const value = rational(BigInt(digits) * 10n ** BigInt(exponent));
      unit.factor = multiply(unit.factor, raise(value, sign));
      i++;
      continue;
    }
    let power = POWERS.get(parts[i]);
    if (power === undefined) power = 1;
    else i++;
    const match = matchSimpleUnit(parts, i);
    if (match === undefined) return undefined;
    const [name, prefix, end] = match;
    i = end;

    const simple = simpleUnits.get(name);
    const exponent = power * sign;
    let factor = simple.factor;
    if (prefix !== undefined) {
      const [radix, prefixExponent] = PREFIXES.get(prefix);
      factor = multiply(factor, raise(rational(BigInt(radix)), prefixExponent));
    }
    unit.factor = multiply(unit.factor, raise(factor, exponent));
    for (const [base, baseExponent] of baseSignature(name)) {
      const total = baseExponent * exponent;
      const side = total > 0 ? unit.numerator : unit.denominator;
      side.set(base, (side.get(base) ?? 0) + Math.abs(total));
    }
    unit.systems &= simple.systems;
    plainUnit = power === 1 && sign === 1 && !prefix ? simple : undefined;
  }
  if (count === 1 && plainUnit !== undefined) unit.offset = plainUnit.offset;
  return unit;
}

function mustResolve(id) {
  const unit = resolve(id);
  if (unit === undefined) throw new Error(`Unknown unit in CLDR data: ${id}`);
  return unit;
}

function netExponents({ numerator, denominator }) {
  const exponents = new Map(numerator);
  for (const [base, exponent] of denominator) {
    exponents.set(base, (exponents.get(base) ?? 0) - exponent);
  }
  return exponents;
}

function compareDimensions(a, b) {
  const [x, y] = [netExponents(a), netExponents(b)];
  const bases = [...new Set([...x.keys(), ...y.keys()])];
  const exponent = (map, base) => map.get(base) ?? 0;
  const same = bases.every((base) => exponent(x, base) === exponent(y, base));
  if (same) return 1;
  const reciprocal = bases.every(
    (base) => exponent(x, base) === -exponent(y, base),
  );
  return reciprocal ? -1 : 0;
}

// CLDR's base unit order, which cldr-json loses, recovered from quantity IDs
export const BASE_UNITS = orderBaseUnits();

function orderBaseUnits() {
  const following = new Map(baseUnitNames.map((name) => [name, new Set()]));
  for (const id of Object.keys(unitQuantities)) {
    const { numerator, denominator } = mustResolve(id);
    for (const side of [numerator, denominator]) {
      const names = [...side.keys()];
      for (let i = 1; i < names.length; i++) {
        following.get(names[i - 1]).add(names[i]);
      }
    }
  }
  const order = [];
  const remaining = new Set(baseUnitNames);
  while (remaining.size > 0) {
    const next = [...remaining]
      .sort()
      .find(
        (name) =>
          ![...remaining].some((other) => following.get(other).has(name)),
      );
    order.push(next);
    remaining.delete(next);
  }
  return order;
}

function baseUnitId({ numerator, denominator }) {
  const product = (side) =>
    BASE_UNITS.filter((name) => side.has(name))
      .map((name) => {
        const exponent = side.get(name);
        if (exponent === 1) return name;
        if (exponent === 2) return `square-${name}`;
        if (exponent === 3) return `cubic-${name}`;
        return `pow${exponent}-${name}`;
      })
      .join("-");
  const [top, bottom] = [product(numerator), product(denominator)];
  if (bottom === "") return top;
  return top === "" ? `per-${bottom}` : `${top}-per-${bottom}`;
}

export const QUANTITIES = new Map();
for (const [id, { _quantity: quantity }] of Object.entries(unitQuantities)) {
  if (baseUnitId(mustResolve(id)) !== id) {
    throw new Error(`Base unit ID ${id} is not in the order of the others`);
  }
  QUANTITIES.set(id, quantity);
}
const quantityBaseUnits = new Map(
  [...QUANTITIES].map(([id, quantity]) => [quantity, id]),
);

/** Lists of [index in BASE_UNITS, exponent], negative in the denominator */
export const UNIT_BASES = [];
const unitBaseIndexes = new Map();

// Unit → [UNIT_BASES index, factor num, factor den, offset num?, offset den?]
export const UNITS = new Map();
for (const [name, unit] of simpleUnits) {
  const bases = baseSignature(name).map(([base, exponent]) => [
    BASE_UNITS.indexOf(base),
    exponent,
  ]);
  const key = JSON.stringify(bases);
  if (!unitBaseIndexes.has(key)) {
    unitBaseIndexes.set(key, UNIT_BASES.push(bases) - 1);
  }
  const data = [unitBaseIndexes.get(key), ...exactRational(unit.factor)];
  if (!equals(unit.offset, ZERO)) data.push(...exactRational(unit.offset));
  UNITS.set(name, data);
}

export const ALIASES = new Map(
  Object.entries(unitAliases)
    .filter(([, { _replacement }]) => resolve(_replacement) !== undefined)
    .map(([id, { _replacement }]) => [id, _replacement]),
);

// [units, steps, systems, inverse, factor num, factor den, offset num?, offset den?]
export const MEASURES = [];
const measureIndexes = new Map();

function measureIndex(id, quantityBaseUnit) {
  if (!measureIndexes.has(id)) {
    measureIndexes.set(id, MEASURES.push(measure(id, quantityBaseUnit)) - 1);
  }
  return measureIndexes.get(id);
}

function measure(id, quantityBaseUnit) {
  const units = id.split("-and-");
  const resolved = units.map(mustResolve);
  const [first] = resolved;
  const direction = compareDimensions(first, mustResolve(quantityBaseUnit));
  if (direction === 0) {
    throw new Error(`${id} does not measure ${quantityBaseUnit}`);
  }
  const steps = [];
  for (let i = 1; i < resolved.length; i++) {
    const step = divide(resolved[i - 1].factor, resolved[i].factor);
    if (step[1] !== 1n || !equals(resolved[i].offset, ZERO)) {
      throw new Error(`Unsupported mixed unit: ${id}`);
    }
    steps.push(Number(step[0]));
  }
  let systems = ALL_SYSTEMS;
  for (const unit of resolved) systems &= unit.systems;

  const data = [
    units,
    steps,
    systems,
    direction === -1,
    ...exactRational(first.factor),
  ];
  if (!equals(first.offset, ZERO)) data.push(...exactRational(first.offset));
  return data;
}

export const RANKINGS = [];
const rankingIndexes = new Map();

export const PREFERENCES = new Map();
for (const [quantity, usages] of Object.entries(unitPreferenceData)) {
  const baseUnit = quantityBaseUnits.get(quantity);
  if (!Object.hasOwn(usages, "default")) {
    throw new Error(`No default usage for ${quantity}`);
  }
  for (const [usage, regions] of Object.entries(usages)) {
    if (!Object.hasOwn(regions, "001")) {
      throw new Error(`No preferences for 001 in ${quantity} ${usage}`);
    }
    const byRegion = {};
    for (const [region, preferences] of Object.entries(regions)) {
      if (!/^(?:[A-Z]{2}|001)$/.test(region)) {
        throw new Error(`Unsupported region in unit preferences: ${region}`);
      }
      const ranking = preferences.map((preference, i) => {
        for (const key of Object.keys(preference)) {
          if (key !== "unit" && key !== "geq") {
            throw new Error(`Unsupported unit preference data: ${key}`);
          }
        }
        const last = i === preferences.length - 1;
        const threshold = preference.geq ?? (last ? 0 : 1);
        return [threshold, measureIndex(preference.unit, baseUnit)];
      });
      const key = JSON.stringify(ranking);
      if (!rankingIndexes.has(key)) {
        rankingIndexes.set(key, RANKINGS.push(ranking) - 1);
      }
      byRegion[region] = rankingIndexes.get(key);
    }
    PREFERENCES.set(`${quantity} ${usage}`, byRegion);
  }
}

const SYSTEM_KEYWORDS = {
  metric: [METRIC, "001"],
  ussystem: [US_SYSTEM, "US"],
  uksystem: [UK_SYSTEM, "GB"],
};

export const MEASUREMENT_SYSTEM_KEYWORDS = new Map();
for (const [value, info] of Object.entries(measurementSystemKeyword)) {
  if (value.startsWith("_")) continue;
  if (!Object.hasOwn(SYSTEM_KEYWORDS, value)) {
    throw new Error(`Unsupported -u-ms value: ${value}`);
  }
  for (const name of [value, ...(info._alias?.split(" ") ?? [])]) {
    MEASUREMENT_SYSTEM_KEYWORDS.set(name, SYSTEM_KEYWORDS[value]);
  }
}

/** -u-mu value → [quantity, index in MEASURES] */
export const UNIT_KEYWORDS = new Map();
for (const value of Object.keys(measurementUnitKeyword)) {
  if (value.startsWith("_")) continue;
  // Unit IDs are cut to 8 letters in locale IDs: "fahrenhe"
  const units = [...simpleUnits.keys()].filter(
    (name) => name === value || (value.length === 8 && name.startsWith(value)),
  );
  if (units.length !== 1) throw new Error(`Unsupported -u-mu value: ${value}`);
  const baseUnit = baseUnitId(mustResolve(units[0]));
  const quantity = QUANTITIES.get(baseUnit);
  if (!PREFERENCES.has(`${quantity} default`)) {
    throw new Error(`-u-mu value ${value} has no unit preferences`);
  }
  UNIT_KEYWORDS.set(value, [quantity, measureIndex(units[0], baseUnit)]);
}

const intlUnits = new Set(Intl.supportedValuesOf("unit"));
function intlCanFormat(id) {
  const parts = id.split("-per-");
  return parts.length <= 2 && parts.every((part) => intlUnits.has(part));
}

const rootPatterns = new Map(
  Object.entries(rootUnits)
    .filter(([, value]) => value["unitPattern-count-other"] !== undefined)
    .map(([key, value]) => [
      key.slice(key.indexOf("-") + 1),
      value["unitPattern-count-other"],
    ]),
);

function duplicateUnit(id, candidates) {
  const unit = mustResolve(id);
  const matches = candidates.filter((candidate) => {
    const other = resolve(candidate);
    return (
      other !== undefined &&
      equals(other.factor, unit.factor) &&
      equals(other.offset, unit.offset) &&
      baseUnitId(other) === baseUnitId(unit)
    );
  });
  if (matches.length > 1) throw new Error(`${id} has several duplicates`);
  return matches[0];
}

function perPattern(id) {
  const [numerator, denominator, ...rest] = id.split("-per-");
  const top = rootPatterns.get(numerator);
  const bottom = rootPatterns.get(denominator);
  if (rest.length > 0 || top === undefined || bottom === undefined) {
    return undefined;
  }
  const placeholder = /^\{0\}\s*/.exec(top)?.[0];
  if (placeholder === undefined || !bottom.startsWith("{0}")) return undefined;
  const unit = rootUnits.per.compoundUnitPattern
    .replace("{0}", top.slice(placeholder.length))
    .replace("{1}", bottom.slice("{0}".length).trim());
  return placeholder + unit;
}

export const UNIT_SYMBOLS = new Map();
export const INTL_DUPLICATES = new Map();

for (const id of new Set(MEASURES.flatMap(([units]) => units))) {
  if (intlCanFormat(id)) continue;
  if (rootPatterns.has(id)) {
    UNIT_SYMBOLS.set(id, rootPatterns.get(id));
    continue;
  }
  const intlDuplicate = duplicateUnit(id, [...intlUnits]);
  if (intlDuplicate !== undefined) {
    INTL_DUPLICATES.set(id, intlDuplicate);
    continue;
  }
  const rootDuplicate = duplicateUnit(id, [...rootPatterns.keys()]);
  const pattern = rootPatterns.get(rootDuplicate) ?? perPattern(id);
  if (pattern === undefined) throw new Error(`No way to format ${id}`);
  UNIT_SYMBOLS.set(id, pattern);
}

const CATEGORY_KEY = "measurementSystem-category-";

function regionTable(regions) {
  for (const region of Object.keys(regions)) {
    if (!/^(?:[A-Z]{2}|001)$/.test(region)) {
      throw new Error(`Unsupported region in measurement data: ${region}`);
    }
  }
  return new Map(Object.entries(regions));
}

for (const key of Object.keys(measurementData)) {
  const known = ["measurementSystem", "paperSize"].includes(key);
  if (!known && !key.startsWith(CATEGORY_KEY)) {
    throw new Error(`Unsupported measurement data: ${key}`);
  }
}

export const MEASUREMENT_SYSTEMS = regionTable(
  measurementData.measurementSystem,
);
export const CATEGORY_MEASUREMENT_SYSTEMS = new Map(
  Object.entries(measurementData)
    .filter(([key]) => key.startsWith(CATEGORY_KEY))
    .map(([key, regions]) => [
      key.slice(CATEGORY_KEY.length),
      regionTable(regions),
    ]),
);
export const PAPER_SIZES = regionTable(measurementData.paperSize);
