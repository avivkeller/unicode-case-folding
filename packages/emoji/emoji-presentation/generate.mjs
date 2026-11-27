import * as ucd from "@internal/build/sources/ucd";
import { codePointSet, inSet } from "@internal/helpers/tables";

const DATA_FILE = "emoji/emoji-data.txt";
const SEQUENCES_FILE = "emoji/emoji-variation-sequences.txt";

export const VERSION = await ucd.version(DATA_FILE, SEQUENCES_FILE);

export const EMOJI = codePointSet(await ucd.ranges(DATA_FILE, "Emoji"));
export const EMOJI_PRESENTATION = codePointSet(
  await ucd.ranges(DATA_FILE, "Emoji_Presentation"),
);

const styles = new Map();
for (const [sequence, style] of await ucd.records(SEQUENCES_FILE)) {
  const [base, selector] = ucd.parseCodePoints(sequence);
  if (!inSet(EMOJI, base)) throw new Error(`${sequence} is not an emoji`);
  styles.set(base, `${styles.get(base) ?? ""}${selector}:${style};`);
}
for (const [base, style] of styles) {
  if (style !== "65038:text style;65039:emoji style;") {
    throw new Error(`Unexpected variation sequences of ${base}: ${style}`);
  }
}

export const VARIATION_BASES = codePointSet(
  [...styles.keys()].map((base) => [base, base]),
);
