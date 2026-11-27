import { emoji } from "@internal/build/sources/unicode";
import { parseCodePoints, parseRange } from "@internal/build/sources/ucd";

const FILES = ["emoji-sequences.txt", "emoji-zwj-sequences.txt"];

export const VERSION = await emoji.version(...FILES);

const root = { end: false, children: new Map() };
for (const file of FILES) {
  for (const [field] of await emoji.records(file)) {
    if (field.includes("..")) {
      const [start, end] = parseRange(field);
      for (let codePoint = start; codePoint <= end; codePoint++) {
        insert([codePoint]);
      }
    } else {
      insert(parseCodePoints(field));
    }
  }
}

function insert(sequence) {
  let node = root;
  for (const codePoint of sequence) {
    if (!node.children.has(codePoint)) {
      node.children.set(codePoint, { end: false, children: new Map() });
    }
    node = node.children.get(codePoint);
  }
  node.end = true;
}

const escape = (codePoint) => `\\u{${codePoint.toString(16).toUpperCase()}}`;

function characterClass(codePoints) {
  const ranges = [];
  for (const codePoint of codePoints.sort((a, b) => a - b)) {
    if (ranges.at(-1)?.[1] === codePoint - 1) ranges.at(-1)[1] = codePoint;
    else ranges.push([codePoint, codePoint]);
  }
  if (ranges.length === 1 && ranges[0][0] === ranges[0][1]) {
    return escape(ranges[0][0]);
  }
  const parts = ranges.map(([start, end]) =>
    start === end
      ? escape(start)
      : `${escape(start)}${end - start > 1 ? "-" : ""}${escape(end)}`,
  );
  return `[${parts.join("")}]`;
}

// The longest sequence wins: each tail is optional and greedy
function toPattern(node) {
  const bySuffix = new Map();
  for (const [codePoint, child] of node.children) {
    const suffix = toPattern(child);
    if (!bySuffix.has(suffix)) bySuffix.set(suffix, []);
    bySuffix.get(suffix).push(codePoint);
  }
  const alternatives = [...bySuffix].map(
    ([suffix, codePoints]) => characterClass(codePoints) + suffix,
  );
  if (alternatives.length === 0) return "";
  const isAtom =
    alternatives.length === 1 &&
    /^(?:\\u\{[0-9A-F]+\}|\[[^\]]+\])$/.test(alternatives[0]);
  if (node === root) return alternatives.join("|");
  if (!node.end) {
    return alternatives.length === 1
      ? alternatives[0]
      : `(?:${alternatives.join("|")})`;
  }
  return isAtom ? `${alternatives[0]}?` : `(?:${alternatives.join("|")})?`;
}

export const PATTERN = toPattern(root);
