import { findLinks, formatLink } from "../dist/index.mjs";

const OPEN = "⸠";
const CLOSE = "⸡";
const PART = /([𝑺𝑯𝑷𝑸𝑽𝑭𝑫])=(.*?)(?= [𝑺𝑯𝑷𝑸𝑽𝑭𝑫]=|$)/gu;

export function checkDetection(contents) {
  const lines = contents
    .split("\n")
    .filter((line) => line !== "" && !line.startsWith("#"));
  const failures = lines.flatMap((line) => {
    const text = line.replaceAll(OPEN, "").replaceAll(CLOSE, "");
    let marked = "";
    let copied = 0;
    for (const { start, end } of findLinks(text)) {
      marked +=
        text.slice(copied, start) + OPEN + text.slice(start, end) + CLOSE;
      copied = end;
    }
    marked += text.slice(copied);
    return marked === line ? [] : [`${line}\n   got: ${marked}`];
  });
  return { total: lines.length, failures };
}

export function parseFormattingTest(contents) {
  const cases = [];
  let parts;
  let source;
  for (const line of contents.split("\n")) {
    if (line.startsWith("# {")) {
      parts = parseParts(line.slice(3, line.lastIndexOf("}")));
      source = undefined;
    } else if (line === "" || line.startsWith("#")) {
      continue;
    } else if (source === undefined) {
      source = line;
    } else {
      cases.push({ parts, source, expected: line });
      source = undefined;
    }
  }
  return cases;
}

function parseParts(structure) {
  const parts = { base: "" };
  for (const [, kind, value] of structure.matchAll(PART)) {
    if (kind === "𝑺" || kind === "𝑯") parts.base += value;
    else if (kind === "𝑷") (parts.path ??= []).push(value);
    else if (kind === "𝑸") (parts.query ??= []).push([value]);
    else if (kind === "𝑽") parts.query.at(-1).push(value);
    else if (kind === "𝑭") parts.fragment = value;
    else (parts.directives ??= []).push(value);
  }
  return parts;
}

export function checkFormatting(contents) {
  const cases = parseFormattingTest(contents);
  const failures = cases.flatMap(({ parts, expected }) => {
    const actual = formatLink(parts);
    return actual === expected ? [] : [`${expected}\n   got: ${actual}`];
  });
  return { total: cases.length, failures };
}
