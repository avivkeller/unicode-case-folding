import { lookupLocale, normalizeLocale } from "@internal/helpers/locale";
import {
  VERSION,
  LOCALES,
  NUMBER_PATTERNS,
  NUMBERING_FILE,
  RULE_FILES,
  RULE_SETS,
} from "#generated";
import {
  ABSOLUTE,
  CARDINAL_PLURAL,
  DIGITS,
  FILE_DEFAULT,
  FILE_NAMES,
  FILE_SETS,
  FRACTIONAL,
  INTEGRAL,
  MODULUS,
  MULTIPLIER,
  NUMERATOR,
  ORDINAL_PLURAL,
  PART_KIND,
  PATTERN_GROUPING,
  PATTERN_MAX_FRACTION,
  PATTERN_MIN_FRACTION,
  PATTERN_MIN_INTEGER,
  PATTERN_SHOW_DECIMAL,
  PLURAL_FORMS,
  SET_BASES,
  SET_BODIES,
  SET_DEFAULT,
  SET_DIVISORS,
  SET_FRACTION_LCM,
  SET_IMPROPER,
  SET_INFINITY,
  SET_NAN,
  SET_NEGATIVE,
  SET_PARTS,
  SET_PROPER,
  SUBSTITUTION_OPTION,
  SUBSTITUTION_PATTERN,
  SUBSTITUTION_SET,
} from "./layout.mjs";

export { VERSION };

const RECURSION_LIMIT = 64;
const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);
const PLURAL_MODULUS = 10n ** 12n;

const contexts = new Map();

/**
 * Spells out a number in words, or in another CLDR rule-based format.
 * @param {number | bigint} value
 * @param {string | Intl.Locale} locale
 * @param {object} [options]
 * @param {string} [options.ruleSet] - Default "spellout-numbering"; see getRuleSets()
 * @returns {string}
 */
export function numberToWords(value, locale, { ruleSet } = {}) {
  if (typeof value !== "number" && typeof value !== "bigint") {
    throw new TypeError("Value must be a number or a bigint");
  }
  const context = getContext(locale);
  const { env, set } =
    ruleSet === undefined || ruleSet === null
      ? context.defaultRuleSet
      : findRuleSet(context, ruleSet);
  if (typeof value === "bigint") return formatInteger(env, set, value, 0);
  if (Number.isInteger(value)) return formatInteger(env, set, BigInt(value), 0);
  return formatNumber(env, set, value, 0);
}

/**
 * Lists the rule sets available for a locale, e.g. "spellout-cardinal".
 * @param {string | Intl.Locale} locale
 * @returns {string[]}
 */
export function getRuleSets(locale) {
  return [...getContext(locale).ruleSets.keys()];
}

function findRuleSet(context, name) {
  if (typeof name !== "string") throw new TypeError("ruleSet must be a string");
  const entry = context.ruleSets.get(
    name.startsWith("%") ? name.slice(1) : name,
  );
  if (!entry) {
    throw new RangeError(
      `Unknown rule set "${name}" for locale ${context.tag}`,
    );
  }
  return entry;
}

function getContext(locale) {
  let context = typeof locale === "string" ? contexts.get(locale) : undefined;
  if (context) return context;

  const tag = normalizeLocale(locale);
  context = contexts.get(tag);
  if (!context) {
    context = createContext(tag);
    contexts.set(tag, context);
  }
  if (typeof locale === "string") contexts.set(locale, context);
  return context;
}

function createContext(tag) {
  const [spellout, ordinal] = lookupLocale(LOCALES, tag);
  // Unsupported locales get root conventions, not the engine's default locale
  const supported = Intl.NumberFormat.supportedLocalesOf(tag).length > 0;
  const numberLocale = supported ? tag : "en";
  const parts = new Intl.NumberFormat(numberLocale).formatToParts(1234567.5);
  const symbol = (type, fallback) =>
    parts.find((part) => part.type === type)?.value ?? fallback;

  const context = {
    tag,
    ruleSets: new Map(), // Public name → { env, set }
    defaultRuleSet: undefined,
    numberLocale,
    pluralLocale: supported ? tag : undefined,
    decimal: symbol("decimal", "."),
    group: symbol("group", ","),
    infinity: new Intl.NumberFormat(numberLocale).format(Infinity),
    nan: new Intl.NumberFormat(numberLocale).format(NaN),
    plurals: [], // Intl.PluralRules by plural part kind
    formats: [], // Intl.NumberFormat by index into NUMBER_PATTERNS
  };

  for (const index of [spellout, ordinal, NUMBERING_FILE]) {
    const file = RULE_FILES[index];
    // Substitutions refer to the other rule sets of their file by position
    const env = { context, file: file[FILE_SETS] };
    const entry = (position) => ({ env, set: RULE_SETS[env.file[position]] });
    for (const [name, position] of Object.entries(file[FILE_NAMES])) {
      context.ruleSets.set(name, entry(position));
    }
    if (index === spellout) context.defaultRuleSet = entry(file[FILE_DEFAULT]);
  }
  return context;
}

// A normal rule is its index in the set; special rules have index undefined

function formatInteger(env, set, value, depth) {
  if (depth >= RECURSION_LIMIT) throw new RangeError("Rule recursion too deep");
  if (set[SET_FRACTION_LCM] !== undefined) {
    const rule = findFractionSetRule(set, Number(value));
    return applyNormalRule(env, set, rule, value, depth + 1);
  }
  if (value < 0n && set[SET_NEGATIVE] !== undefined) {
    return applyRule(env, set, set[SET_NEGATIVE], undefined, value, depth + 1);
  }
  const rule = findNormalRule(set, value < 0n ? -value : value);
  return applyNormalRule(env, set, rule, value, depth + 1);
}

function formatNumber(env, set, value, depth) {
  if (depth >= RECURSION_LIMIT) throw new RangeError("Rule recursion too deep");
  return applyNumberRule(env, set, value, value, depth + 1);
}

function applyNumberRule(env, set, key, value, depth) {
  if (set[SET_FRACTION_LCM] !== undefined) {
    const rule = findFractionSetRule(set, key);
    return applyNormalRule(env, set, rule, value, depth);
  }
  const body = findSpecialRule(env, set, key);
  if (body !== undefined)
    return applyRule(env, set, body, undefined, value, depth);
  const rule = findNormalRule(set, BigInt(Math.round(Math.abs(key))));
  return applyNormalRule(env, set, rule, value, depth);
}

function findSpecialRule(env, set, value) {
  if (Number.isNaN(value)) return set[SET_NAN] ?? env.context.nan;
  if (value < 0) {
    if (set[SET_NEGATIVE] !== undefined) return set[SET_NEGATIVE];
    value = -value;
  }
  if (value === Infinity) return set[SET_INFINITY] ?? env.context.infinity;

  if (value !== Math.floor(value)) {
    if (value < 1 && set[SET_PROPER] !== undefined) {
      return bestFractionRule(env, set[SET_PROPER]);
    }
    if (set[SET_IMPROPER] !== undefined) {
      return bestFractionRule(env, set[SET_IMPROPER]);
    }
  }
  if (set[SET_DEFAULT] !== undefined) {
    return bestFractionRule(env, set[SET_DEFAULT]);
  }
  return undefined;
}

function bestFractionRule(env, candidates) {
  let best = candidates[0];
  for (let i = 1; i < candidates.length; i += 2) {
    if (candidates[i] === env.context.decimal) best = candidates[i + 1];
  }
  return best;
}

function findNormalRule(set, value) {
  const next = firstRuleAbove(set[SET_BASES], value);
  if (next === 0) throw new RangeError(`No rule can format ${value}`);

  // Rollback: 200 uses the rule for 100, not 101 ("two hundred zero")
  if (next > 1 && shouldRollBack(set, next - 1, value)) return next - 2;
  return next - 1;
}

// String bases are integers above 2^53, so above any safe value
function firstRuleAbove(bases, value) {
  const number = value <= MAX_SAFE ? Number(value) : undefined;
  let low = 0;
  let high = bases.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    const base = bases[mid];
    const above =
      number === undefined
        ? BigInt(base) > value
        : typeof base === "string" || base > number;
    if (above) high = mid;
    else low = mid + 1;
  }
  return high;
}

function shouldRollBack(set, rule, value) {
  if (!hasModulus(set, set[SET_BODIES][rule])) return false;
  const divisor = BigInt(set[SET_DIVISORS][rule]);
  return (
    value % divisor === 0n && BigInt(set[SET_BASES][rule]) % divisor !== 0n
  );
}

function hasModulus(set, body) {
  if (typeof body === "string") return false;
  if (typeof body === "number") {
    return set[SET_PARTS][body][PART_KIND] === MODULUS;
  }
  return body.some(
    (part) =>
      typeof part === "number" && set[SET_PARTS][part][PART_KIND] === MODULUS,
  );
}

// In a fraction rule set, bases are denominators; the closest fraction wins
function findFractionSetRule(set, value) {
  const bases = set[SET_BASES];
  const lcm = BigInt(set[SET_FRACTION_LCM]);
  const numerator = BigInt(Math.round(value * Number(lcm)));

  let winner = 0;
  let difference = -1n;
  for (let i = 0; i < bases.length; i++) {
    let distance = (numerator * BigInt(bases[i])) % lcm;
    if (lcm - distance < distance) distance = lcm - distance;
    if (difference < 0n || distance < difference) {
      difference = distance;
      winner = i;
      if (distance === 0n) break;
    }
  }

  // Two rules with the same base value: the first is for a numerator of 1
  if (
    winner + 1 < bases.length &&
    BigInt(bases[winner + 1]) === BigInt(bases[winner])
  ) {
    const count = Math.round(value * Number(bases[winner]));
    if (count < 1 || count >= 2) winner++;
  }
  return winner;
}

function applyNormalRule(env, set, rule, value, depth) {
  return applyRule(env, set, set[SET_BODIES][rule], rule, value, depth);
}

function applyRule(env, set, body, rule, value, depth) {
  if (typeof body === "string") return body;
  if (typeof body === "number") {
    return applyPart(env, set, body, rule, value, depth);
  }
  let result = "";
  for (const part of body) {
    result +=
      typeof part === "string"
        ? part
        : applyPart(env, set, part, rule, value, depth);
  }
  return result;
}

function applyPart(env, set, index, rule, value, depth) {
  const part = set[SET_PARTS][index];
  const divisor = rule === undefined ? 1 : set[SET_DIVISORS][rule];
  const kind = part[PART_KIND];
  if (kind === CARDINAL_PLURAL || kind === ORDINAL_PLURAL) {
    return pluralForm(env, part, value, divisor);
  }
  return substitute(env, set, rule, divisor, part, value, depth);
}

function pluralForm(env, plural, value, divisor) {
  let count;
  if (typeof value === "bigint") {
    count = value / BigInt(divisor);
  } else if (value >= 0 && value < 1) {
    count = Math.round(value * Number(divisor));
  } else {
    count = Math.trunc(value / Number(divisor));
  }

  const { context } = env;
  const kind = plural[PART_KIND];
  const rules = context.pluralLocale
    ? (context.plurals[kind] ??= new Intl.PluralRules(context.pluralLocale, {
        type: kind === ORDINAL_PLURAL ? "ordinal" : "cardinal",
      }))
    : null;
  // Plural rules depend on the last digits, so huge counts keep only those
  const number =
    typeof count === "bigint" && (count > MAX_SAFE || count < -MAX_SAFE)
      ? Number(count % PLURAL_MODULUS) + Number(PLURAL_MODULUS)
      : Number(count);
  const category = rules ? rules.select(number) : "other";
  return plural[PLURAL_FORMS[category]] ?? plural[PLURAL_FORMS.other];
}

function substitute(env, set, rule, divisor, substitution, value, depth) {
  const kind = substitution[PART_KIND];
  const position = substitution[SUBSTITUTION_SET];
  const targetSet =
    position === undefined ? null : RULE_SETS[env.file[position]];
  const pattern = substitution[SUBSTITUTION_PATTERN];
  const option = substitution[SUBSTITUTION_OPTION];

  if (kind === DIGITS) {
    return spellDigits(env, targetSet, value, option !== false, depth);
  }

  if (kind === MODULUS && option !== undefined) {
    const remainder =
      typeof value === "bigint"
        ? value % BigInt(divisor)
        : value % Number(divisor);
    return applyNormalRule(env, set, option, remainder, depth);
  }

  if (typeof value === "bigint") {
    if (!targetSet && value <= MAX_SAFE && value >= -MAX_SAFE) {
      const number = transformNumber(
        set,
        rule,
        kind,
        Number(value),
        divisor,
        targetSet,
      );
      return formatPattern(env, pattern, number);
    }
    const result = transformInteger(set, rule, kind, value, divisor);
    return targetSet
      ? formatInteger(env, targetSet, result, depth)
      : formatPattern(env, pattern, result);
  }

  const result = transformNumber(set, rule, kind, value, divisor, targetSet);
  let prefix = "";
  if (kind === NUMERATOR && option === true && targetSet) {
    const denominator = Number(set[SET_BASES][rule]);
    for (let n = Math.trunc(result) * 10; n < denominator; n *= 10) {
      prefix += `${formatInteger(env, targetSet, 0n, depth)} `;
    }
  }

  if (result === Infinity || result === -Infinity) {
    return (
      prefix + applyNumberRule(env, targetSet ?? set, Infinity, result, depth)
    );
  }
  if (!targetSet) return prefix + formatPattern(env, pattern, result);
  if (Number.isInteger(result)) {
    return prefix + formatInteger(env, targetSet, BigInt(result), depth);
  }
  return prefix + formatNumber(env, targetSet, result, depth);
}

function transformInteger(set, rule, kind, value, divisor) {
  switch (kind) {
    case MULTIPLIER:
      return value / BigInt(divisor);
    case MODULUS:
      return value % BigInt(divisor);
    case ABSOLUTE:
      return value < 0n ? -value : value;
    case FRACTIONAL:
      return 0n;
    case NUMERATOR:
      return value * BigInt(set[SET_BASES][rule]);
    default: // SAME, INTEGRAL
      return value;
  }
}

function transformNumber(set, rule, kind, value, divisor, targetSet) {
  switch (kind) {
    case MULTIPLIER:
      // A pattern keeps the fraction unless a modulus formats the remainder
      return targetSet || hasModulus(set, set[SET_BODIES][rule])
        ? Math.floor(value / Number(divisor))
        : value / Number(divisor);
    case MODULUS:
      return value % Number(divisor);
    case ABSOLUTE:
      return Math.abs(value);
    case INTEGRAL:
      return Math.floor(value);
    case FRACTIONAL:
      return value - Math.floor(value);
    case NUMERATOR:
      return Math.round(value * Number(set[SET_BASES][rule]));
    default: // SAME
      return value;
  }
}

function spellDigits(env, set, value, spaces, depth) {
  if (typeof value === "bigint") return "";
  const digits = Array.from(fractionDigits(value), (digit) =>
    formatInteger(env, set, BigInt(digit), depth),
  );
  return digits.join(spaces ? " " : "");
}

function fractionDigits(value) {
  const text = String(Math.abs(value));
  const exponent = text.indexOf("e");
  if (exponent === -1) {
    const point = text.indexOf(".");
    return point === -1 ? "" : text.slice(point + 1);
  }
  const [whole, fraction = ""] = text.slice(0, exponent).split(".");
  const shift = Number(text.slice(exponent + 1));
  const digits = whole + fraction;
  const point = whole.length + shift;
  if (point <= 0) return "0".repeat(-point) + digits;
  return digits.slice(point);
}

function formatPattern(env, index, value) {
  const { context } = env;
  const pattern = NUMBER_PATTERNS[index];
  let format = context.formats[index];
  if (!format) {
    format = new Intl.NumberFormat(context.numberLocale, {
      useGrouping: false,
      minimumIntegerDigits: pattern[PATTERN_MIN_INTEGER],
      minimumFractionDigits: pattern[PATTERN_MIN_FRACTION],
      maximumFractionDigits: pattern[PATTERN_MAX_FRACTION],
      roundingMode: "halfEven",
    });
    context.formats[index] = format;
  }

  let text = format.format(value);
  if (pattern[PATTERN_GROUPING]) {
    text = groupDigits(text, pattern[PATTERN_GROUPING], context.group);
  }
  if (pattern[PATTERN_SHOW_DECIMAL] && !text.includes(context.decimal)) {
    text += context.decimal;
  }
  return text;
}

function groupDigits(text, [primary, secondary], separator) {
  const match = /^(\P{Nd}*)(\p{Nd}+)(.*)$/su.exec(text);
  if (!match) return text;
  const digits = Array.from(match[2]);
  if (digits.length <= primary) return text;
  const groups = [digits.splice(-primary).join("")];
  while (digits.length > secondary)
    groups.unshift(digits.splice(-secondary).join(""));
  if (digits.length) groups.unshift(digits.join(""));
  return match[1] + groups.join(separator) + match[3];
}

export default /* @__PURE__ */ Object.assign(numberToWords, {
  numberToWords,
  getRuleSets,
  VERSION,
});
