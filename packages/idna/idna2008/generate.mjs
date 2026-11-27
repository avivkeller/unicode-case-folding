import * as ucd from "@internal/build/sources/ucd";
import { idna } from "@internal/build/sources/unicode";
import { codePointSet, rangeTableOf } from "@internal/helpers/tables";

const FILE = "Idna2008.txt";
const SCRIPTS_FILE = "Scripts.txt";
// The code points with a rule in appendix A of RFC 5892
const CONTEXT_RULES = [
  "00B7",
  "0375",
  "05F3..05F4",
  "0660..0669",
  "06F0..06F9",
  "200C..200D",
  "30FB",
];

export const VERSION = await idna.version(FILE);
if ((await ucd.version(SCRIPTS_FILE)) !== VERSION) {
  throw new Error(`${FILE} and ${SCRIPTS_FILE} have different versions`);
}

const contextual = (await idna.records(FILE))
  .filter(([, category]) => category.startsWith("CONTEXT"))
  .map(([range]) => range);
if (contextual.join() !== CONTEXT_RULES.join()) {
  throw new Error(`${FILE}: unsupported contextual code points ${contextual}`);
}

const categories = await idna.values(FILE);
export const CATEGORY_NAMES = [...new Set(categories)].sort();
export const CATEGORIES = rangeTableOf(
  categories.map((category) => CATEGORY_NAMES.indexOf(category)),
);

const script = async (...names) =>
  codePointSet(
    (
      await Promise.all(names.map((name) => ucd.ranges(SCRIPTS_FILE, name)))
    ).flat(),
  );
export const GREEK = await script("Greek");
export const HEBREW = await script("Hebrew");
export const KANA_OR_HAN = await script("Hiragana", "Katakana", "Han");
