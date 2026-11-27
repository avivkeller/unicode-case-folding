import { inSet, toCodePoints } from "./tables.mjs";

export const CONTEXT_PROPERTIES = {
  Final_Sigma: ["Cased", "Case_Ignorable"],
  After_Soft_Dotted: ["Soft_Dotted", "Combining_Other"],
  More_Above: ["Combining_Above", "Combining_Other"],
  Before_Dot: ["Combining_Other"],
  After_I: ["Combining_Other"],
};

/**
 * @typedef {object} CasingData
 * @property {Record<string, Map<number, string>>} mappings - By kind
 * @property {Array<{ codePoint: number, language: string | null, contexts: string[], mappings: Record<string, string> }>} rules
 * @property {Record<string, number[]>} properties
 */

/** @param {CasingData} data */
export function createCaseMapper({ mappings, rules, properties }) {
  const scan = (codePoints, index, step, test) => {
    for (let i = index + step; i >= 0 && i < codePoints.length; i += step) {
      if (test(codePoints[i])) return true;
      if (!inSet(properties.Combining_Other, codePoints[i])) return false;
    }
    return false;
  };
  const contexts = {
    Final_Sigma(codePoints, index) {
      const casedBeyond = (step) => {
        for (let i = index + step; i >= 0 && i < codePoints.length; i += step) {
          if (inSet(properties.Cased, codePoints[i])) return true;
          if (!inSet(properties.Case_Ignorable, codePoints[i])) return false;
        }
        return false;
      };
      return casedBeyond(-1) && !casedBeyond(1);
    },
    After_Soft_Dotted: (codePoints, index) =>
      scan(codePoints, index, -1, (cp) => inSet(properties.Soft_Dotted, cp)),
    More_Above: (codePoints, index) =>
      scan(codePoints, index, 1, (cp) => inSet(properties.Combining_Above, cp)),
    Before_Dot: (codePoints, index) =>
      scan(codePoints, index, 1, (cp) => cp === 0x0307),
    After_I: (codePoints, index) =>
      scan(codePoints, index, -1, (cp) => cp === 0x0049),
  };

  const rulesByCodePoint = new Map();
  for (const rule of rules) {
    const tests = rule.contexts.map((name) =>
      name.startsWith("Not_")
        ? (codePoints, i) => !contexts[name.slice(4)](codePoints, i)
        : contexts[name],
    );
    const list = rulesByCodePoint.get(rule.codePoint) ?? [];
    rulesByCodePoint.set(rule.codePoint, [...list, { ...rule, tests }]);
  }
  const languages = new Set(rules.map((rule) => rule.language));

  function resolveLanguage(locale) {
    if (locale === undefined) return undefined;
    const language =
      typeof locale === "string"
        ? locale.split(/[-_]/, 1)[0].toLowerCase()
        : locale.language;
    if (typeof language !== "string") {
      throw new TypeError("Locale must be a string or an Intl.Locale");
    }
    return languages.has(language) ? language : undefined;
  }

  function mapAt(codePoints, index, kind, language) {
    const conditional = rulesByCodePoint.get(codePoints[index]);
    if (conditional !== undefined) {
      for (const rule of conditional) {
        if (rule.language !== null && rule.language !== language) continue;
        if (rule.tests.every((test) => test(codePoints, index))) {
          return rule.mappings[kind];
        }
      }
    }
    return mappings[kind].get(codePoints[index]);
  }

  function convert(input, kind, language) {
    const codePoints = toCodePoints(input);
    let result = "";
    for (let i = 0; i < codePoints.length; i++) {
      result +=
        mapAt(codePoints, i, kind, language) ??
        String.fromCodePoint(codePoints[i]);
    }
    return result;
  }

  return {
    resolveLanguage,
    mapAt,
    convert,
    lookup: (codePoint, kind) => mappings[kind].get(codePoint),
    isCased: (codePoint) => inSet(properties.Cased, codePoint),
  };
}
