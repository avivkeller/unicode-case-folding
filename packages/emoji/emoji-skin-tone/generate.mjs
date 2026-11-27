import { emoji } from "@internal/build/sources/unicode";
import { parseCodePoints } from "@internal/build/sources/ucd";

const FILE = "emoji-test.txt";
const LINE = /^([0-9A-F ]+?)\s*; fully-qualified\s*# \S+ E\d+\.\d+ (.+)$/;
const TONES = ["light", "medium-light", "medium", "medium-dark", "dark"];
const FIRST_MODIFIER = 0x1f3fb;

export const VERSION = await emoji.version(FILE);

const byName = new Map();
for (const line of (await emoji.text(FILE)).split("\n")) {
  const match = LINE.exec(line);
  if (match) byName.set(match[2], parseCodePoints(match[1]));
}

const isModifier = (codePoint) =>
  codePoint >= FIRST_MODIFIER && codePoint < FIRST_MODIFIER + TONES.length;

// Base name → variants, by 5 × the first tone + the second
const variants = new Map();
for (const [name, codePoints] of byName) {
  if (!codePoints.some(isModifier)) continue;
  const [head, ...details] = name.split(/: |, /);
  const tones = details
    .filter((detail) => detail.endsWith(" skin tone"))
    .map((detail) => TONES.indexOf(detail.slice(0, -10)));
  const modifiers = codePoints
    .filter(isModifier)
    .map((codePoint) => codePoint - FIRST_MODIFIER);
  const used = tones.length === 1 ? modifiers.map(() => tones[0]) : tones;
  if (tones.includes(-1) || used.join() !== modifiers.join()) {
    throw new Error(`Unexpected skin tones in "${name}"`);
  }

  const rest = details.filter((detail) => !detail.endsWith(" skin tone"));
  const join = (list) => [head, list.join(", ")].filter(Boolean).join(": ");
  const base = [
    join(rest),
    join(rest.filter((detail) => detail !== "person")),
  ].find((candidate) => byName.has(candidate));
  if (!base) throw new Error(`No emoji without skin tone for "${name}"`);
  if (!variants.has(base)) variants.set(base, []);
  const index = tones.length === 1 ? 6 * tones[0] : 5 * tones[0] + tones[1];
  if (variants.get(base)[index]) throw new Error(`Two variants as "${name}"`);
  variants.get(base)[index] = String.fromCodePoint(...codePoints);
}

export const SINGLE_BASES = [];
export const SINGLE_VARIANTS = [];
export const PAIR_BASES = [];
// 5 × the first tone + the second; a pair of one tone is its shorter variant
export const PAIR_VARIANTS = [];
for (const [name, list] of variants) {
  const base = String.fromCodePoint(...byName.get(name));
  const count = Object.keys(list).length;
  if (count === 5) {
    SINGLE_BASES.push(base);
    SINGLE_VARIANTS.push(...list.filter(Boolean));
  } else if (count === 25) {
    PAIR_BASES.push(base);
    PAIR_VARIANTS.push(...list);
  } else {
    throw new Error(`Unexpected skin tone variants of "${name}"`);
  }
}
