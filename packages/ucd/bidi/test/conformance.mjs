import { getEmbeddingLevels, reorderLine } from "../dist/index.mjs";

// None of these may be a paired bracket
export const CLASS_CHARACTERS = {
  L: 0x0061,
  R: 0x05d0,
  AL: 0x0627,
  EN: 0x0031,
  ES: 0x002b,
  ET: 0x0023,
  AN: 0x0661,
  CS: 0x002c,
  NSM: 0x0300,
  BN: 0x00ad,
  B: 0x2029,
  S: 0x0009,
  WS: 0x0020,
  ON: 0x0021,
  LRE: 0x202a,
  LRO: 0x202d,
  RLE: 0x202b,
  RLO: 0x202e,
  PDF: 0x202c,
  LRI: 0x2066,
  RLI: 0x2067,
  FSI: 0x2068,
  PDI: 0x2069,
};

const BIDI_TEST_DIRECTIONS = [
  [1, "auto"],
  [2, "ltr"],
  [4, "rtl"],
];
const CHARACTER_TEST_DIRECTIONS = ["ltr", "rtl", "auto"];

export function checkBidiTest(contents) {
  const results = { passed: 0, failures: [] };
  let levels = [];
  let order = [];
  for (const line of dataLines(contents)) {
    if (line.startsWith("@Levels:")) {
      levels = fields(line.slice("@Levels:".length));
    } else if (line.startsWith("@Reorder:")) {
      order = fields(line.slice("@Reorder:".length)).map(Number);
    } else if (!line.startsWith("@")) {
      const [input, bitset] = line.split(";");
      const codePoints = fields(input).map((name) => CLASS_CHARACTERS[name]);
      for (const [bit, direction] of BIDI_TEST_DIRECTIONS) {
        if ((parseInt(bitset, 16) & bit) === 0) continue;
        const expected = { paragraphLevel: undefined, levels, order };
        record(results, `${line} (${direction})`, () =>
          check(codePoints, direction, expected),
        );
      }
    }
  }
  return results;
}

export function checkBidiCharacterTest(contents) {
  const results = { passed: 0, failures: [] };
  for (const line of dataLines(contents)) {
    const [input, direction, paragraphLevel, levels, order] = line.split(";");
    const codePoints = fields(input).map((hex) => parseInt(hex, 16));
    const expected = {
      paragraphLevel: Number(paragraphLevel),
      levels: fields(levels),
      order: fields(order).map(Number),
    };
    record(results, line, () =>
      check(codePoints, CHARACTER_TEST_DIRECTIONS[direction], expected),
    );
  }
  return results;
}

function check(codePoints, direction, expected) {
  const text = String.fromCodePoint(...codePoints);
  const offsets = [];
  let offset = 0;
  for (const codePoint of codePoints) {
    offsets.push(offset);
    offset += codePoint > 0xffff ? 2 : 1;
  }

  const embeddingLevels = getEmbeddingLevels(text, { direction });
  const paragraphLevel = embeddingLevels.paragraphs[0]?.level;
  if (
    expected.paragraphLevel !== undefined &&
    paragraphLevel !== expected.paragraphLevel
  ) {
    return `paragraph level ${paragraphLevel}`;
  }

  const levels = offsets.map((offset, i) =>
    expected.levels[i] === "x" ? "x" : String(embeddingLevels.levels[offset]),
  );
  if (levels.join(" ") !== expected.levels.join(" ")) {
    return `levels ${levels.join(" ")}`;
  }

  const codePointAt = new Map(offsets.map((offset, i) => [offset, i]));
  const order = reorderLine(text, embeddingLevels)
    .order.map((offset) => codePointAt.get(offset))
    .filter((i) => i !== undefined && expected.levels[i] !== "x");
  if (order.join(" ") !== expected.order.join(" ")) {
    return `order ${order.join(" ")}`;
  }
  return undefined;
}

function record(results, name, run) {
  let failure;
  try {
    failure = run();
  } catch (error) {
    failure = String(error);
  }
  if (failure === undefined) results.passed++;
  else results.failures.push(`${name}: got ${failure}`);
}

function dataLines(contents) {
  return contents
    .split("\n")
    .map((line) => line.replace(/#.*/, "").trim())
    .filter((line) => line !== "");
}

function fields(text) {
  return text.trim().split(/\s+/).filter(Boolean);
}
