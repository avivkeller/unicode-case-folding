import { assertOption } from "@internal/helpers/assert";
import {
  lookupLocale,
  normalizeLocale,
  resolveLocale,
} from "@internal/helpers/locale";
import { VERSION, PATTERNS, PERSON_NAMES, SCRIPTS } from "#generated";

export { VERSION };

const ORDERS = ["givenFirst", "surnameFirst", "sorting"];
const LENGTHS = ["long", "medium", "short"];
const USAGES = ["referring", "addressing", "monogram"];
const FORMALITIES = ["formal", "informal"];
const FIELDS = [
  "title",
  "given",
  "given2",
  "surname",
  "surname2",
  "generation",
  "credentials",
];
// In the order in which CLDR's reference implementation applies them
const MODIFIERS = [
  "informal",
  "allCaps",
  "initialCap",
  "initial",
  "retain",
  "monogram",
  "prefix",
  "core",
  "vocative",
  "genitive",
];

const SCRIPT_SETS = {
  Jpan: ["Hani", "Hira", "Kana"],
  Kore: ["Hang", "Hani"],
  Hanb: ["Hani", "Bopo"],
  Hans: ["Hani"],
  Hant: ["Hani"],
};
const CJK_LANGUAGES = ["ja", "zh", "yue"];
// java.lang.Character.isWhitespace(), as the reference implementation uses
const SPACE_SEPARATOR = /[\p{Zs}\p{Zl}\p{Zp}]/u;
// java.util.regex "\s", used for space replacement
const SPACES = /[ \t\n\v\f\r]+/g;
const LETTER = /^\p{L}/u;
const TITLECASE_START = /[\p{L}\p{N}\p{S}\p{Co}]/u;
const TITLECASE = {
  Ǆ: "ǅ",
  ǆ: "ǅ",
  Ǉ: "ǈ",
  ǉ: "ǈ",
  Ǌ: "ǋ",
  ǌ: "ǋ",
  Ǳ: "ǲ",
  ǳ: "ǲ",
};

const FIELD_GIVEN_FIRST_LOCALES = 0;
const FIELD_SURNAME_FIRST_LOCALES = 1;
const FIELD_LENGTH = 2;
const FIELD_FORMALITY = 3;
const FIELD_NATIVE_SPACE = 4;
const FIELD_FOREIGN_SPACE = 5;
const FIELD_INITIAL = 6;
const FIELD_INITIAL_SEQUENCE = 7;
const FIELD_PATTERNS = 8;

let segmenters;
let scriptTests;
const parsedPatterns = new Map();
const orderSets = new WeakMap();

/**
 * Formats a person's name for a locale with CLDR's person name patterns.
 * @param {PersonName} name
 * @param {FormatNameOptions} options
 * @returns {string}
 */
export function formatName(name, options) {
  if (typeof options !== "object" || options === null) {
    throw new TypeError("Options must be an object with a locale");
  }
  const person = parseName(name);
  const { order: requestedOrder, usage = "referring" } = options;
  if (requestedOrder !== undefined) {
    assertOption("order", requestedOrder, ORDERS);
  }
  assertOption("usage", usage, USAGES);

  let formatter = normalizeLocale(options.locale);
  let data = lookupLocale(PERSON_NAMES, formatter);

  const nameScript = findScript(person);
  let nameLocale = formatter;
  let orderingLocale = formatter;
  if (person.locale !== undefined) {
    nameLocale = replaceScript(person.locale, nameScript);
    orderingLocale = person.locale;
  } else if (nameScript !== "Zzzz") {
    orderingLocale = maximize(`und-${nameScript}`).baseName;
    nameLocale = `${maximize(orderingLocale).language}-${nameScript}`;
  }
  if (
    nameScript !== "Zzzz" &&
    !scriptsMatch(nameScript, maximize(formatter).script)
  ) {
    formatter = resolveLocale(PERSON_NAMES, nameLocale);
    if (!scriptsMatch(nameScript, maximize(formatter).script)) {
      const region = maximize(nameLocale).region;
      formatter = maximize(
        `und-${nameScript}${region ? `-${region}` : ""}`,
      ).baseName;
    }
    data = lookupLocale(PERSON_NAMES, formatter);
  }

  const order =
    requestedOrder ?? person.preferredOrder ?? nameOrder(data, orderingLocale);
  const length = options.length ?? data[FIELD_LENGTH];
  const formality = options.formality ?? data[FIELD_FORMALITY];
  assertOption("length", length, LENGTHS);
  assertOption("formality", formality, FORMALITIES);

  const slot =
    order === "sorting"
      ? 36 + LENGTHS.indexOf(length) * 2 + FORMALITIES.indexOf(formality)
      : ORDERS.indexOf(order) * 18 +
        LENGTHS.indexOf(length) * 6 +
        USAGES.indexOf(usage) * 2 +
        FORMALITIES.indexOf(formality);
  const pattern = choosePattern(data[FIELD_PATTERNS][slot], person);
  const result = applyPattern(pattern, person, data, formatter);

  if (data[FIELD_FOREIGN_SPACE] === " " && data[FIELD_NATIVE_SPACE] === " ") {
    return result;
  }
  const native = sharesLanguageAndScript(
    formatter,
    person.locale ?? nameLocale,
  );
  return result.replace(
    SPACES,
    native ? data[FIELD_NATIVE_SPACE] : data[FIELD_FOREIGN_SPACE],
  );
}

function parseName(name) {
  if (typeof name !== "object" || name === null) {
    throw new TypeError("Name must be an object");
  }
  const person = {
    fields: new Map(),
    locale: undefined,
    preferredOrder: undefined,
  };
  for (const [key, value] of Object.entries(name)) {
    if (value === undefined || value === null || value === "") continue;
    if (key === "locale") {
      person.locale = normalizeLocale(value);
    } else if (key === "preferredOrder") {
      assertOption("preferredOrder", value, ORDERS.slice(0, 2));
      person.preferredOrder = value;
    } else {
      const [field, ...modifiers] = key.split("-");
      if (
        !FIELDS.includes(field) ||
        modifiers.some((m) => !MODIFIERS.includes(m))
      ) {
        throw new TypeError(`Unknown name field: ${key}`);
      }
      if (typeof value !== "string") {
        throw new TypeError(`Name field ${key} must be a string`);
      }
      if (!person.fields.has(field)) person.fields.set(field, []);
      person.fields
        .get(field)
        .push({ modifiers: sortModifiers(modifiers), value });
    }
  }

  for (const values of person.fields.values()) {
    const find = (...modifiers) =>
      values.find((v) => v.modifiers.join() === modifiers.join())?.value;
    const core = find("core");
    if (find() === undefined && core !== undefined) {
      const prefix = find("prefix");
      values.push({
        modifiers: [],
        value: prefix ? `${prefix} ${core}` : core,
      });
    }
    values.sort(
      (a, b) =>
        b.modifiers.length - a.modifiers.length ||
        compareModifiers(a.modifiers, b.modifiers),
    );
  }

  if (!person.fields.has("given") && !person.fields.has("surname")) {
    throw new TypeError("A name needs a given name or a surname");
  }
  return person;
}

function fieldValue(person, field, modifiers) {
  const values = person.fields.get(field);
  if (!values) return null;
  if (values.length === 1)
    return { value: values[0].value, remaining: modifiers };

  let best = null;
  let bestCount = -1;
  let last;
  for (const candidate of values) {
    last = candidate;
    if (candidate.modifiers.length <= bestCount) break;
    const count = candidate.modifiers.filter((m) =>
      modifiers.includes(m),
    ).length;
    if (count !== 0 && count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  if (best === null) return { value: last.value, remaining: modifiers };
  return {
    value: best.value,
    remaining: modifiers.filter((m) => !best.modifiers.includes(m)),
  };
}

function choosePattern(indexes, person) {
  let best;
  let bestCount = -1;
  for (const index of indexes) {
    const pattern = parsePattern(index);
    let count = 0;
    for (const field of pattern.fields) if (person.fields.has(field)) count++;
    if (
      count > bestCount ||
      (count === bestCount && pattern.fields.size < best.fields.size)
    ) {
      best = pattern;
      bestCount = count;
    }
  }
  return best;
}

function parsePattern(index) {
  let pattern = parsedPatterns.get(index);
  if (pattern) return pattern;

  const elements = [];
  const fields = new Set();
  for (const [, literal, field] of PATTERNS[index].matchAll(
    /([^{]+)|\{([^}]+)\}/g,
  )) {
    if (literal !== undefined) {
      elements.push(literal);
    } else {
      const [name, ...modifiers] = field.split("-");
      elements.push({ field: name, modifiers: sortModifiers(modifiers) });
      fields.add(name);
    }
  }
  pattern = { elements, fields };
  parsedPatterns.set(index, pattern);
  return pattern;
}

function applyPattern(pattern, person, data, locale) {
  // Without a surname, the given name takes its place unless shown in full
  const givenAsSurname =
    !person.fields.has("surname") &&
    !pattern.elements.some(
      (element) =>
        typeof element === "object" &&
        element.field === "given" &&
        !element.modifiers.includes("initial") &&
        !element.modifiers.includes("initialCap"),
    );

  let result = "";
  let seenField = false;
  let skippingLeading = false;
  let afterEmptyField = false;
  let literalBefore = ""; // Literal text after the last populated field
  let literalAfter = ""; // Literal text after the last empty field

  for (const element of pattern.elements) {
    if (typeof element === "string") {
      if (skippingLeading) continue;
      if (afterEmptyField) literalAfter += element;
      else literalBefore += element;
      continue;
    }

    let field = element.field;
    if (givenAsSurname && field === "given") field = null;
    else if (givenAsSurname && field === "surname") field = "given";
    const value =
      field && formatField(person, field, element.modifiers, data, locale);

    if (value === null || value === undefined) {
      if (!seenField) {
        skippingLeading = true;
        literalBefore = "";
      } else {
        afterEmptyField = true;
        literalAfter = "";
      }
    } else {
      seenField = true;
      skippingLeading = false;
      if (afterEmptyField) {
        result += coalesceLiterals(literalBefore, literalAfter);
        afterEmptyField = false;
      } else {
        result += literalBefore;
      }
      literalBefore = "";
      literalAfter = "";
      result += value;
    }
  }
  if (!afterEmptyField) result += literalBefore;
  return result;
}

function formatField(person, field, modifiers, data, locale) {
  const found = fieldValue(person, field, modifiers);
  if (found === null) return null;
  let { value } = found;
  for (const modifier of found.remaining) {
    switch (modifier) {
      case "allCaps":
        value = value.toLocaleUpperCase(locale);
        break;
      case "initialCap":
        value = titlecaseFirst(value, locale);
        break;
      case "initial":
        value = initials(value, data, found.remaining.includes("retain"));
        break;
      case "monogram":
        value = firstGrapheme(value);
        break;
      case "prefix":
        return null;
    }
    if (value === null) return null;
  }
  return value;
}

function coalesceLiterals(before, after) {
  if (before.endsWith(after)) after = "";
  let start = 0;
  while (start < before.length && !isWhitespace(before[start])) start++;
  let end = after.length - 1;
  while (end >= 0 && !isWhitespace(after[end])) end--;
  if (start < before.length) start++;
  else if (end >= 0) end--;
  return before.slice(0, start) + after.slice(end + 1);
}

function initials(value, data, retain) {
  let result = null;
  let separator = null;
  for (const { segment } of getSegmenters().word.segment(value)) {
    if (LETTER.test(segment)) {
      const initial = format(data[FIELD_INITIAL], firstGrapheme(segment));
      if (separator !== null) result = (result ?? "") + separator + initial;
      else if (result === null) result = initial;
      else result = format(data[FIELD_INITIAL_SEQUENCE], result, initial);
    } else if (retain && !isWhitespace(segment[0])) {
      separator = (separator ?? "") + segment;
    }
  }
  return result;
}

function titlecaseFirst(value, locale) {
  const match = TITLECASE_START.exec(value);
  if (!match) return value;
  const char = String.fromCodePoint(value.codePointAt(match.index));
  let title = TITLECASE[char];
  if (title === undefined) {
    const upper = char.toLocaleUpperCase(locale);
    const [first, ...rest] = upper;
    title = first + rest.join("").toLocaleLowerCase(locale);
  }
  return (
    value.slice(0, match.index) + title + value.slice(match.index + char.length)
  );
}

function nameOrder(data, locale) {
  let sets = orderSets.get(data);
  if (!sets) {
    sets = {
      givenFirst: new Set(data[FIELD_GIVEN_FIRST_LOCALES].map(normalizeLocale)),
      surnameFirst: new Set(
        data[FIELD_SURNAME_FIRST_LOCALES].map(normalizeLocale),
      ),
    };
    orderSets.set(data, sets);
  }

  const { language, script, region } = new Intl.Locale(locale);
  const suffixes = [[script, region], [script], [region], []]
    .filter((subtags) => subtags.every(Boolean))
    .map((subtags) => subtags.map((subtag) => `-${subtag}`).join(""));
  for (const suffix of new Set(suffixes)) {
    for (const tag of [language + suffix, `und${suffix}`]) {
      if (sets.givenFirst.has(tag)) return "givenFirst";
      if (sets.surnameFirst.has(tag)) return "surnameFirst";
    }
  }
  return "givenFirst";
}

function findScript(person) {
  const text =
    (fieldValue(person, "surname", [])?.value ?? "") +
    (fieldValue(person, "given", [])?.value ?? "");
  scriptTests ??= SCRIPTS.flatMap((script) => {
    try {
      return [[script, new RegExp(`\\p{Script=${script}}`, "u")]];
    } catch {
      return []; // A script newer than the JavaScript engine
    }
  });
  for (const char of text) {
    for (const [script, test] of scriptTests) {
      if (test.test(char)) return script;
    }
  }
  return "Zzzz";
}

function scriptsMatch(a, b) {
  const as = SCRIPT_SETS[a] ?? [a];
  const bs = SCRIPT_SETS[b] ?? [b];
  return as.some((script) => bs.includes(script));
}

function sharesLanguageAndScript(a, b) {
  const [x, y] = [maximize(a), maximize(b)];
  const languagesMatch =
    x.language === y.language ||
    (CJK_LANGUAGES.includes(x.language) && CJK_LANGUAGES.includes(y.language));
  return languagesMatch && scriptsMatch(x.script, y.script);
}

function replaceScript(locale, script) {
  if (script === "Zzzz") return locale;
  const { language, region } = new Intl.Locale(locale);
  return [language, script, region].filter(Boolean).join("-");
}

function maximize(locale) {
  return new Intl.Locale(locale).maximize();
}

function sortModifiers(modifiers) {
  return [...modifiers].sort(
    (a, b) => MODIFIERS.indexOf(a) - MODIFIERS.indexOf(b),
  );
}

function compareModifiers(a, b) {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const difference = MODIFIERS.indexOf(a[i]) - MODIFIERS.indexOf(b[i]);
    if (difference !== 0) return difference;
  }
  return a.length - b.length;
}

function firstGrapheme(value) {
  for (const { segment } of getSegmenters().grapheme.segment(value)) {
    return segment;
  }
  return value;
}

function getSegmenters() {
  segmenters ??= {
    word: new Intl.Segmenter("und", { granularity: "word" }),
    grapheme: new Intl.Segmenter("und", { granularity: "grapheme" }),
  };
  return segmenters;
}

function isWhitespace(char) {
  const code = char.charCodeAt(0);
  if ((code >= 0x09 && code <= 0x0d) || (code >= 0x1c && code <= 0x1f)) {
    return true;
  }
  return (
    SPACE_SEPARATOR.test(char) &&
    code !== 0xa0 &&
    code !== 0x2007 &&
    code !== 0x202f
  );
}

function format(pattern, ...values) {
  return pattern.replace(/\{(\d)\}/g, (_, i) => values[i]);
}

export default { formatName, VERSION };

/**
 * A person's name, with at least a given name or a surname.
 * @typedef {object} PersonName
 * @property {string} [title]
 * @property {string} [given]
 * @property {string} [given-informal]
 * @property {string} [given2] Additional given names or a patronymic
 * @property {string} [surname]
 * @property {string} [surname-prefix] e.g. "van der"
 * @property {string} [surname-core] The surname without its prefix
 * @property {string} [surname2]
 * @property {string} [generation] e.g. "Jr."
 * @property {string} [credentials]
 * @property {string | Intl.Locale} [locale] Inferred from the name's script if missing
 * @property {"givenFirst" | "surnameFirst"} [preferredOrder] Overrides the locale's order
 */

/**
 * Options for formatName()
 * @typedef {object} FormatNameOptions
 * @property {string | Intl.Locale} locale
 * @property {"givenFirst" | "surnameFirst" | "sorting"} [order] Default: the name locale's order
 * @property {"long" | "medium" | "short"} [length] Default: the locale's usual length
 * @property {"referring" | "addressing" | "monogram"} [usage] Default: "referring"
 * @property {"formal" | "informal"} [formality] Default: the locale's usual formality
 */
