import { CONTEXT_PROPERTIES } from "@internal/helpers/casing";
import { codePointSet, mappingTable } from "@internal/helpers/tables";
import * as ucd from "./ucd.mjs";

const KINDS = ["lower", "title", "upper"];

const caseData = (async () => {
  const mappings = { lower: new Map(), title: new Map(), upper: new Map() };
  const combiningAbove = [];
  const combiningOther = [];
  for (const fields of await ucd.records("UnicodeData.txt")) {
    const codePoint = parseInt(fields[0], 16);
    const ccc = Number(fields[3]);
    if (ccc === 230) combiningAbove.push([codePoint, codePoint]);
    else if (ccc !== 0) combiningOther.push([codePoint, codePoint]);

    const [upper, lower] = [fields[12], fields[13]];
    const title = fields[14] || upper; // Empty means the same as uppercase
    if (lower) mappings.lower.set(codePoint, ucd.parseCodePoints(lower));
    if (title) mappings.title.set(codePoint, ucd.parseCodePoints(title));
    if (upper) mappings.upper.set(codePoint, ucd.parseCodePoints(upper));
  }

  const conditional = [];
  for (const [code, lower, title, upper, conditions] of await ucd.records(
    "SpecialCasing.txt",
  )) {
    const codePoint = parseInt(code, 16);
    const full = {
      lower: ucd.parseCodePoints(lower),
      title: ucd.parseCodePoints(title),
      upper: ucd.parseCodePoints(upper),
    };
    if (!conditions) {
      for (const kind of KINDS) mappings[kind].set(codePoint, full[kind]);
      continue;
    }

    const rule = { codePoint, language: null, contexts: [], ...full };
    for (const condition of conditions.split(" ")) {
      if (/^[a-z]{2,3}$/.test(condition)) rule.language = condition;
      else if (condition.replace(/^Not_/, "") in CONTEXT_PROPERTIES) {
        rule.contexts.push(condition);
      } else
        throw new Error(`Unknown SpecialCasing.txt condition ${condition}`);
    }
    conditional.push(rule);
  }

  // Language-specific rules take precedence over language-independent ones
  const rules = Map.groupBy(
    conditional.toSorted(
      (a, b) => (a.language === null) - (b.language === null),
    ),
    (rule) => rule.codePoint,
  );
  return { mappings, rules, combiningAbove, combiningOther };
})();

const PROPERTIES = {
  Cased: () => ucd.ranges("DerivedCoreProperties.txt", "Cased"),
  Case_Ignorable: () =>
    ucd.ranges("DerivedCoreProperties.txt", "Case_Ignorable"),
  Soft_Dotted: () => ucd.ranges("PropList.txt", "Soft_Dotted"),
  Combining_Above: async () => (await caseData).combiningAbove,
  Combining_Other: async () => (await caseData).combiningOther,
};

export const casingVersion = () =>
  ucd.version("SpecialCasing.txt", "DerivedCoreProperties.txt", "PropList.txt");

export async function generateCasing({ kinds, properties = [] }) {
  const { mappings, rules } = await caseData;
  const asString = (codePoints) => String.fromCodePoint(...codePoints);

  // First match wins: a default rule stays if a later one could replace it
  const emitted = [];
  for (const [codePoint, list] of rules) {
    for (const [i, rule] of list.entries()) {
      const isDefault = kinds.every(
        (kind) =>
          asString(rule[kind]) ===
          asString(mappings[kind].get(codePoint) ?? [codePoint]),
      );
      const couldBeReplaced = list
        .slice(i + 1)
        .some(
          ({ language }) => language === null || language === rule.language,
        );
      if (isDefault && !couldBeReplaced) continue;
      emitted.push({
        codePoint,
        language: rule.language,
        contexts: rule.contexts,
        mappings: Object.fromEntries(
          kinds.map((kind) => [kind, asString(rule[kind])]),
        ),
      });
    }
  }

  const needed = new Set(properties);
  for (const { contexts } of emitted) {
    for (const context of contexts) {
      for (const name of CONTEXT_PROPERTIES[context.replace(/^Not_/, "")]) {
        needed.add(name);
      }
    }
  }
  const sets = {};
  for (const name of [...needed].sort()) {
    sets[name] = codePointSet(await PROPERTIES[name]());
  }

  return {
    mappings: Object.fromEntries(
      kinds.map((kind) => [kind, mappingTable(mappings[kind])]),
    ),
    rules: emitted,
    properties: sets,
  };
}
