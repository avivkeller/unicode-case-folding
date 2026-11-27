import { unicodeKeywords } from "@internal/helpers/locale";
import {
  ALIASES,
  BASE_UNITS,
  CATEGORY_MEASUREMENT_SYSTEMS,
  INTL_DUPLICATES,
  LONGEST_UNIT_PARTS,
  MEASUREMENT_SYSTEM_KEYWORDS,
  MEASUREMENT_SYSTEMS,
  MEASURES,
  PAPER_SIZES,
  POWERS,
  PREFERENCES,
  PREFIXES,
  QUANTITIES,
  RANKINGS,
  UNIT_BASES,
  UNIT_KEYWORDS,
  UNIT_SYMBOLS,
  UNITS,
  VERSION,
} from "#generated";

export { VERSION };

// Fields of UNITS values; factor and offset are numerator, denominator
const UNIT_BASE = 0;
const UNIT_FACTOR = 1;
const UNIT_OFFSET = 3;

const MEASURE_UNITS = 0;
const MEASURE_STEPS = 1;
const MEASURE_SYSTEMS = 2;
const MEASURE_INVERSE = 3;
const MEASURE_FACTOR = 4;
const MEASURE_OFFSET = 6;

const ROUNDING = {
  maximumFractionDigits: 0,
  maximumSignificantDigits: 2,
  roundingPriority: "morePrecision",
};

const CONSTANT = /^[1-9]\d*(?:e[1-9]\d*)?$/;
const REGION = /^(?:[A-Za-z]{2}|\d{3})$/;
const SUBDIVISION = /^([a-z]{2}|\d{3})[a-z\d]{1,4}$/;
const MAX_EXACT_INTEGER = 2n ** 53n;

const resolvedUnits = new Map();
const localeSettings = new Map();
const numberFormats = new Map();
const listFormats = new Map();

/**
 * Converts an amount between CLDR units, e.g. "mile" to "kilometer".
 * @param {number} value
 * @param {string} fromUnit
 * @param {string} toUnit
 * @returns {number}
 */
export function convertUnit(value, fromUnit, toUnit) {
  checkValue(value);
  const source = resolveUnit(fromUnit);
  const target = resolveUnit(toUnit);
  const direction = compareDimensions(source, target);
  if (direction === 0) {
    throw new RangeError(`Cannot convert ${fromUnit} to ${toUnit}`);
  }
  const base = toBase(decimalRational(value), source);
  const [numerator, denominator] = fromBase(
    base,
    target.factor,
    target.offset,
    direction === -1,
  );
  return toNumber(numerator, denominator);
}

/**
 * Returns the ranked units a region prefers for a quantity and usage.
 * @param {string} unit - Any unit of the quantity
 * @param {PreferenceOptions} [options]
 * @returns {PreferredUnits[]}
 */
export function getPreferredUnits(unit, options = {}) {
  const { baseUnit, ranking } = findPreferences(unit, options);
  if (ranking === undefined) return [{ units: [baseUnit], geq: 0 }];
  return ranking.map(([geq, index]) => ({
    units: [...MEASURES[index][MEASURE_UNITS]],
    geq,
  }));
}

/**
 * Converts an amount to the units a region prefers for it.
 * @param {number} value
 * @param {string} unit
 * @param {PreferenceOptions} [options]
 * @returns {UnitAmount[]} Largest unit first
 */
export function convertToPreferredUnits(value, unit, options = {}) {
  checkValue(value);
  const { input, inverse, baseUnit, ranking } = findPreferences(unit, options);
  const base = toBase(decimalRational(value), input);
  if (ranking === undefined) {
    return [{ unit: baseUnit, value: toNumber(base[0], base[1]) }];
  }
  const [measure, amount] = chooseMeasure(ranking, base, inverse);
  return splitAmount(measure, amount);
}

/**
 * Formats an amount in the units preferred in the locale's region.
 * @param {number} value
 * @param {string} unit
 * @param {FormatMeasureOptions} options
 * @returns {string}
 */
export function formatMeasure(value, unit, options) {
  checkValue(value);
  if (
    typeof options !== "object" ||
    options === null ||
    options.locale === undefined
  ) {
    throw new TypeError("Options must be an object with a locale");
  }
  const { locale, unitDisplay = "short" } = options;
  const { input, inverse, ranking } = findPreferences(unit, options);
  if (ranking === undefined) {
    return formatAmount(locale, input.id, value, unitDisplay);
  }
  const base = toBase(decimalRational(value), input);
  const [measure, amount] = chooseMeasure(ranking, base, inverse);
  const units = measure[MEASURE_UNITS];
  if (units.length === 1 || amount[1] === 0n) {
    const number = toNumber(amount[0], amount[1]);
    return formatAmount(locale, units[0], number, unitDisplay);
  }
  return formatMixed(locale, measure, amount, unitDisplay);
}

/**
 * Returns the measurement system in common use in a region.
 * @param {string} region
 * @param {{ category?: string }} [options] - e.g. category "temperature"
 * @returns {"metric" | "US" | "UK"}
 */
export function getMeasurementSystem(region, options = {}) {
  const code = checkRegion(region);
  const system =
    CATEGORY_MEASUREMENT_SYSTEMS.get(options.category)?.get(code) ??
    MEASUREMENT_SYSTEMS.get(code) ??
    MEASUREMENT_SYSTEMS.get("001");
  return /** @type {"metric" | "US" | "UK"} */ (system);
}

/**
 * Returns the paper size used for letters in a region.
 * @param {string} region
 * @returns {"A4" | "US-Letter"}
 */
export function getPaperSize(region) {
  const code = checkRegion(region);
  const size = PAPER_SIZES.get(code) ?? PAPER_SIZES.get("001");
  return /** @type {"A4" | "US-Letter"} */ (size);
}

function resolveUnit(unit) {
  if (typeof unit !== "string") throw new TypeError("Unit must be a string");
  let resolved = resolvedUnits.get(unit);
  if (resolved === undefined) {
    resolved = parseUnit(unit);
    resolvedUnits.set(unit, resolved);
  }
  return resolved;
}

// As in ICU, liter-per-kilometer does not reduce to square-meter
function parseUnit(unit) {
  const id = ALIASES.get(unit) ?? unit;
  const resolved = {
    id,
    factor: [1n, 1n],
    offset: undefined,
    numerator: new Array(BASE_UNITS.length).fill(0),
    denominator: new Array(BASE_UNITS.length).fill(0),
  };
  const parts = id.split("-");
  let inDenominator = false;
  let count = 0;
  let plainUnit;
  for (let i = 0; i < parts.length; ) {
    if (parts[i] === "per") {
      if (i + 1 === parts.length || parts[i + 1] === "per") {
        throw unknownUnit(unit);
      }
      inDenominator = true;
      i++;
      continue;
    }
    const sign = inDenominator ? -1 : 1;
    count++;
    if (CONSTANT.test(parts[i])) {
      const [digits, exponent = "0"] = parts[i].split("e");
      const constant = BigInt(digits) * 10n ** BigInt(exponent);
      scale(resolved.factor, constant, 1n, sign);
      i++;
      continue;
    }
    let power = POWERS.get(parts[i]);
    if (power === undefined) power = 1;
    else i++;
    const match = matchSimpleUnit(parts, i);
    if (match === undefined) throw unknownUnit(unit);
    const [data, prefix, end] = match;
    i = end;

    const exponent = power * sign;
    if (prefix !== undefined) {
      const [radix, prefixExponent] = prefix;
      const size = BigInt(radix) ** BigInt(Math.abs(prefixExponent));
      if (prefixExponent > 0) scale(resolved.factor, size, 1n, exponent);
      else scale(resolved.factor, 1n, size, exponent);
    }
    const [factorNumerator, factorDenominator] = rationalAt(data, UNIT_FACTOR);
    scale(resolved.factor, factorNumerator, factorDenominator, exponent);
    for (const [base, baseExponent] of UNIT_BASES[data[UNIT_BASE]]) {
      const total = baseExponent * exponent;
      if (total > 0) resolved.numerator[base] += total;
      else resolved.denominator[base] -= total;
    }
    plainUnit = power === 1 && sign === 1 && !prefix ? data : undefined;
  }
  // UTS #35 Part 6, Discarding Offsets: celsius-per-second is kelvin-per-second
  if (count === 1 && plainUnit?.length > UNIT_OFFSET) {
    resolved.offset = rationalAt(plainUnit, UNIT_OFFSET);
  }
  return { ...resolved, ...findQuantity(resolved) };
}

function matchSimpleUnit(parts, start) {
  const last = Math.min(parts.length, start + LONGEST_UNIT_PARTS);
  for (let end = last; end > start; end--) {
    const name = parts.slice(start, end).join("-");
    const unit = UNITS.get(name);
    if (unit !== undefined) return [unit, undefined, end];
    for (const [prefix, size] of PREFIXES) {
      if (!name.startsWith(prefix)) continue;
      const prefixed = UNITS.get(name.slice(prefix.length));
      if (prefixed !== undefined) return [prefixed, size, end];
    }
  }
  return undefined;
}

function unknownUnit(unit) {
  return new RangeError(`Unknown or unsupported unit: ${unit}`);
}

function compareDimensions(a, b) {
  let same = true;
  let reciprocal = true;
  for (let i = 0; i < BASE_UNITS.length; i++) {
    const x = a.numerator[i] - a.denominator[i];
    const y = b.numerator[i] - b.denominator[i];
    if (x !== y) same = false;
    if (x !== -y) reciprocal = false;
  }
  if (same) return 1;
  return reciprocal ? -1 : 0;
}

function baseUnitId(numerator, denominator) {
  const top = productId(numerator);
  const bottom = productId(denominator);
  if (bottom === "") return top;
  return top === "" ? `per-${bottom}` : `${top}-per-${bottom}`;
}

function productId(exponents) {
  let id = "";
  for (let i = 0; i < exponents.length; i++) {
    const exponent = exponents[i];
    if (exponent === 0) continue;
    if (id !== "") id += "-";
    if (exponent === 2) id += "square-";
    else if (exponent === 3) id += "cubic-";
    else if (exponent > 3) id += `pow${exponent}-`;
    id += BASE_UNITS[i];
  }
  return id;
}

// Rationals: [numerator, denominator] bigints; denominator 0n is ±Infinity/NaN

function rationalAt(tuple, index) {
  return [BigInt(tuple[index]), BigInt(tuple[index + 1])];
}

function scale(rational, numerator, denominator, exponent) {
  const power = BigInt(Math.abs(exponent));
  if (exponent > 0) {
    rational[0] *= numerator ** power;
    rational[1] *= denominator ** power;
  } else {
    rational[0] *= denominator ** power;
    rational[1] *= numerator ** power;
  }
}

// 0.1 is taken as exactly one tenth, not its nearest binary fraction
function decimalRational(value) {
  if (Number.isNaN(value)) return [0n, 0n];
  if (!Number.isFinite(value)) return [value > 0 ? 1n : -1n, 0n];
  const [significand, exponent = "0"] = String(value).split("e");
  const [whole, fraction = ""] = significand.split(".");
  const digits = BigInt(whole + fraction);
  const power = Number(exponent) - fraction.length;
  return power < 0
    ? [digits, 10n ** BigInt(-power)]
    : [digits * 10n ** BigInt(power), 1n];
}

function toBase([numerator, denominator], { factor, offset }) {
  const [factorNumerator, factorDenominator] = factor;
  if (offset === undefined) {
    return [numerator * factorNumerator, denominator * factorDenominator];
  }
  const [offsetNumerator, offsetDenominator] = offset;
  return [
    numerator * factorNumerator * offsetDenominator +
      offsetNumerator * denominator * factorDenominator,
    denominator * factorDenominator * offsetDenominator,
  ];
}

function fromBase([numerator, denominator], factor, offset, reciprocal) {
  const [factorNumerator, factorDenominator] = factor;
  if (reciprocal) {
    const sign = numerator < 0n ? -1n : 1n;
    return [
      sign * denominator * factorDenominator,
      sign * numerator * factorNumerator,
    ];
  }
  if (offset === undefined) {
    return [numerator * factorDenominator, denominator * factorNumerator];
  }
  const [offsetNumerator, offsetDenominator] = offset;
  return [
    (numerator * offsetDenominator - offsetNumerator * denominator) *
      factorDenominator,
    denominator * offsetDenominator * factorNumerator,
  ];
}

function toNumber(numerator, denominator) {
  if (denominator === 0n) {
    if (numerator === 0n) return NaN;
    return numerator > 0n ? Infinity : -Infinity;
  }
  const negative = numerator < 0n;
  const magnitude = negative ? -numerator : numerator;
  let result;
  if (magnitude <= MAX_EXACT_INTEGER && denominator <= MAX_EXACT_INTEGER) {
    result = Number(magnitude) / Number(denominator);
  } else {
    // 55 bits with a sticky lowest bit round like the exact quotient
    const shift = 55 - bitLength(magnitude) + bitLength(denominator);
    const dividend = shift > 0 ? magnitude << BigInt(shift) : magnitude;
    const divisor = shift < 0 ? denominator << BigInt(-shift) : denominator;
    let quotient = dividend / divisor;
    if (quotient * divisor !== dividend) quotient |= 1n;
    // In two steps, so that neither power of two overflows
    const half = Math.trunc(shift / 2);
    result = Number(quotient) * 2 ** -half * 2 ** (half - shift);
  }
  return negative ? -result : result;
}

function bitLength(value) {
  return value.toString(2).length;
}

function findPreferences(unit, options) {
  const input = resolveUnit(unit);
  const settings = preferenceSettings(options);
  const { quantity, inverse, baseUnit } = input;
  const ranking =
    quantity === undefined ? undefined : findRanking(quantity, settings);
  return { input, inverse, baseUnit, ranking };
}

function findQuantity({ numerator, denominator }) {
  const asWritten = baseUnitId(numerator, denominator);
  let quantity = QUANTITIES.get(asWritten);
  if (quantity !== undefined) {
    return { quantity, inverse: false, baseUnit: asWritten };
  }
  quantity = QUANTITIES.get(baseUnitId(denominator, numerator));
  if (quantity !== undefined) {
    return { quantity, inverse: true, baseUnit: asWritten };
  }
  const above = [];
  const below = [];
  for (let i = 0; i < BASE_UNITS.length; i++) {
    const exponent = numerator[i] - denominator[i];
    above.push(Math.max(exponent, 0));
    below.push(Math.max(-exponent, 0));
  }
  const reduced = baseUnitId(above, below);
  quantity = QUANTITIES.get(reduced);
  if (quantity !== undefined) {
    return { quantity, inverse: false, baseUnit: reduced };
  }
  quantity = QUANTITIES.get(baseUnitId(below, above));
  const baseUnit = reduced || asWritten;
  return { quantity, inverse: quantity !== undefined, baseUnit };
}

function preferenceSettings(options) {
  if (typeof options !== "object" || options === null) {
    throw new TypeError("Options must be an object");
  }
  const { usage = "default", region, locale } = options;
  if (typeof usage !== "string") throw new TypeError("Usage must be a string");
  const [localeRegion, system, unitOverride] =
    locale === undefined ? ["001"] : settingsOfLocale(locale);
  return {
    usage,
    region: region === undefined ? localeRegion : checkRegion(region),
    system,
    unitOverride,
  };
}

function settingsOfLocale(locale) {
  const key = String(locale);
  let settings = localeSettings.get(key);
  if (settings === undefined) {
    const parsed = new Intl.Locale(locale);
    const keywords = unicodeKeywords(parsed.toString());
    const subdivision = SUBDIVISION.exec(keywords.get("rg") ?? "");
    const region =
      subdivision?.[1].toUpperCase() ??
      parsed.region ??
      parsed.maximize().region ??
      "001";
    settings = [
      region,
      MEASUREMENT_SYSTEM_KEYWORDS.get(keywords.get("ms")),
      UNIT_KEYWORDS.get(keywords.get("mu")),
    ];
    localeSettings.set(key, settings);
  }
  return settings;
}

function findRanking(quantity, { usage, region, system, unitOverride }) {
  if (!PREFERENCES.has(`${quantity} default`)) return undefined;
  if (unitOverride !== undefined && unitOverride[0] === quantity) {
    return [[0, unitOverride[1]]];
  }
  let name = usage;
  while (!PREFERENCES.has(`${quantity} ${name}`)) {
    const dash = name.lastIndexOf("-");
    name = dash === -1 ? "default" : name.slice(0, dash);
  }
  const regions = PREFERENCES.get(`${quantity} ${name}`);
  const rankingFor = (code) => RANKINGS[regions[code] ?? regions["001"]];
  let ranking = rankingFor(region);
  if (system !== undefined) {
    const [bit, fallbackRegion] = system;
    const matches = ranking.every(
      ([, index]) => (MEASURES[index][MEASURE_SYSTEMS] & bit) !== 0,
    );
    if (!matches && fallbackRegion !== region) {
      ranking = rankingFor(fallbackRegion);
    }
  }
  return ranking;
}

function chooseMeasure(ranking, base, inverse) {
  for (const [threshold, index] of ranking) {
    const measure = MEASURES[index];
    const offset =
      measure.length > MEASURE_OFFSET
        ? rationalAt(measure, MEASURE_OFFSET)
        : undefined;
    const amount = fromBase(
      base,
      rationalAt(measure, MEASURE_FACTOR),
      offset,
      inverse !== measure[MEASURE_INVERSE],
    );
    const value = toNumber(amount[0], amount[1]);
    if (Number.isNaN(value) || Math.abs(value) >= threshold) {
      return [measure, amount];
    }
  }
}

function splitAmount(measure, [numerator, denominator]) {
  const units = measure[MEASURE_UNITS];
  if (units.length === 1 || denominator === 0n) {
    const value = toNumber(numerator, denominator);
    return units.map((unit, i) => ({ unit, value: i === 0 ? value : 0 }));
  }
  const sign = numerator < 0n ? -1 : 1;
  let rest = numerator < 0n ? -numerator : numerator;
  const values = [];
  for (const step of measure[MEASURE_STEPS]) {
    const whole = rest / denominator;
    values.push(Number(whole));
    rest = (rest - whole * denominator) * BigInt(step);
  }
  values.push(toNumber(rest, denominator));
  return units.map((unit, i) => ({
    unit,
    value: values[i] === 0 ? 0 : sign * values[i],
  }));
}

function formatMixed(locale, measure, [numerator, denominator], unitDisplay) {
  const units = measure[MEASURE_UNITS];
  const steps = measure[MEASURE_STEPS];
  let size = 1n;
  for (const step of steps) size *= BigInt(step);
  const magnitude = numerator < 0n ? -numerator : numerator;
  let rest = (2n * magnitude * size + denominator) / (2n * denominator);
  const counts = [];
  for (let i = steps.length - 1; i >= 0; i--) {
    const step = BigInt(steps[i]);
    counts.unshift(rest % step);
    rest /= step;
  }
  counts.unshift(rest);

  const parts = [];
  for (const [i, count] of counts.entries()) {
    if (count === 0n) continue;
    const value = numerator < 0n && parts.length === 0 ? -count : count;
    parts.push(formatAmount(locale, units[i], Number(value), unitDisplay));
  }
  if (parts.length === 0) {
    parts.push(formatAmount(locale, units[0], 0, unitDisplay));
  }
  return listFormat(locale, unitDisplay).format(parts);
}

function formatAmount(locale, unit, value, unitDisplay) {
  const symbol = UNIT_SYMBOLS.get(unit);
  if (symbol === undefined) {
    const intlUnit = INTL_DUPLICATES.get(unit) ?? unit;
    return numberFormat(locale, intlUnit, unitDisplay).format(value);
  }
  const number = numberFormat(locale).format(value);
  return symbol.replace("{0}", () => number);
}

function numberFormat(locale, unit, unitDisplay) {
  const key = `${locale} ${unit} ${unitDisplay}`;
  let format = numberFormats.get(key);
  if (format === undefined) {
    const options =
      unit === undefined
        ? ROUNDING
        : { ...ROUNDING, style: "unit", unit, unitDisplay };
    format = new Intl.NumberFormat(locale, options);
    numberFormats.set(key, format);
  }
  return format;
}

function listFormat(locale, unitDisplay) {
  const key = `${locale} ${unitDisplay}`;
  let format = listFormats.get(key);
  if (format === undefined) {
    format = new Intl.ListFormat(locale, { type: "unit", style: unitDisplay });
    listFormats.set(key, format);
  }
  return format;
}

function checkValue(value) {
  if (typeof value !== "number") throw new TypeError("Value must be a number");
}

function checkRegion(region) {
  if (typeof region !== "string") {
    throw new TypeError("Region must be a string");
  }
  if (!REGION.test(region)) throw new RangeError(`Invalid region: ${region}`);
  return region.toUpperCase();
}

export default {
  convertUnit,
  getPreferredUnits,
  convertToPreferredUnits,
  formatMeasure,
  getMeasurementSystem,
  getPaperSize,
  VERSION,
};

/**
 * Options that choose unit preferences
 * @typedef {object} PreferenceOptions
 * @property {string} [usage] e.g. "person-height" (default: "default")
 * @property {string} [region] Overrides the locale's region
 * @property {string | Intl.Locale} [locale]
 */

/**
 * Options for formatMeasure()
 * @typedef {object} FormatMeasureOptions
 * @property {string | Intl.Locale} locale
 * @property {string} [usage]
 * @property {string} [region]
 * @property {"short" | "long" | "narrow"} [unitDisplay] Default: "short"
 */

/**
 * An entry of the ranked preferred units
 * @typedef {object} PreferredUnits
 * @property {string[]} units Largest first, e.g. ["foot", "inch"]
 * @property {number} geq Minimum amount of the first unit
 */

/**
 * An amount of a unit
 * @typedef {object} UnitAmount
 * @property {string} unit
 * @property {number} value
 */
