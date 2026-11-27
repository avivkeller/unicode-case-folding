import { assertOption } from "@internal/helpers/assert";
import { normalizeLocale } from "@internal/helpers/locale";
import { DEFAULT_RULE, RULES, VERSION } from "#generated";

export { VERSION };

const GENDERS = ["male", "female", "other"];

/**
 * Returns the gender of a group of people, e.g. "male" in French for a woman and a man
 * @param {Iterable<Gender>} genders - The gender of each person
 * @param {string | Intl.Locale} locale
 * @returns {Gender}
 */
export function getGroupGender(genders, locale) {
  const group = [...genders];
  for (const gender of group) assertOption("gender", gender, GENDERS);
  const rule = ruleOf(normalizeLocale(locale));
  if (group.length === 0) return "other";
  if (group.length === 1) return group[0];
  if (rule === "maleTaints") {
    return group.every((gender) => gender === "female") ? "female" : "male";
  }
  if (rule === "mixedNeutral") {
    return group.every((gender) => gender === group[0]) ? group[0] : "other";
  }
  return "other";
}

function ruleOf(tag) {
  for (;;) {
    const rule = RULES.get(tag);
    if (rule !== undefined) return rule;
    const dash = tag.lastIndexOf("-");
    if (dash === -1) return DEFAULT_RULE;
    tag = tag.slice(0, dash);
  }
}

export default /* @__PURE__ */ Object.assign(getGroupGender, {
  getGroupGender,
  VERSION,
});

/**
 * @typedef {"male" | "female" | "other"} Gender
 */
