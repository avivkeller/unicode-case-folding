import { ZipBuffer } from "node:zlib";
import { download, memoizer } from "../fetch.mjs";

export const CODE_POINTS = 0x110000;
// "# @missing: 0000..10FFFF; Left_To_Right"
const MISSING = /^# @missing: ([0-9A-F.]+)\s*;\s*([^;\s]+)\s*$/;

export function dataDirectory(baseUrl, { immutable }) {
  const memo = memoizer();
  const fetchFile = (file) =>
    download(new URL(file, baseUrl).href, { immutable });

  /** @returns {Promise<string>} */
  const text = (file) =>
    memo(`text:${file}`, async () => {
      const [, archive, entry] = /^(.+\.zip)\/(.+)$/.exec(file) ?? [];
      const body = archive
        ? await new ZipBuffer(await fetchFile(archive)).get(entry).content()
        : await fetchFile(file);
      return Buffer.from(body).toString();
    });

  const records = (file) =>
    memo(`records:${file}`, async () =>
      (await text(file))
        .split("\n")
        .map((line) => line.split("#", 1)[0])
        .filter((line) => line.trim())
        .map((line) => line.split(";").map((field) => field.trim())),
    );

  const ranges = (file, value) =>
    memo(`ranges:${file}:${value}`, async () => {
      const result = (await records(file))
        .filter(([, name]) => name === value)
        .map(([range]) => parseRange(range));
      if (result.length === 0) throw new Error(`${file} has no ${value}`);
      return result;
    });

  // The result is memoized: not to be modified
  const values = (file) =>
    memo(`values:${file}`, async () => {
      const result = new Array(CODE_POINTS);
      for (const line of (await text(file)).split("\n")) {
        if (!line.startsWith("# @missing:")) continue;
        const missing = MISSING.exec(line);
        if (!missing) throw new Error(`${file}: unsupported line "${line}"`);
        const [start, end] = parseRange(missing[1]);
        result.fill(missing[2], start, end + 1);
      }
      for (const [range, value] of await records(file)) {
        const [start, end] = parseRange(range);
        result.fill(value, start, end + 1);
      }
      if (result.includes(undefined)) {
        throw new Error(`${file} does not give every code point a value`);
      }
      return result;
    });

  /** @returns {Promise<string>} */
  async function version(...files) {
    const versions = new Set();
    for (const file of files) {
      const contents = await text(file);
      // "# CaseFolding-18.0.0.txt", "# Version: 18.0.0", "# Unicode Version 18.0.0"
      const [, version] =
        /^# \S+-(\d+\.\d+\.\d+)\.txt/.exec(contents) ??
        /^# (?:Unicode )?Version:? (\d+\.\d+(?:\.\d+)?)\s*$/m.exec(contents) ??
        [];
      if (!version) throw new Error(`${file} has no version`);
      versions.add(version);
    }
    if (versions.size !== 1)
      throw new Error(`${files} have different versions`);
    return [...versions][0];
  }

  return { text, records, ranges, values, version };
}

export function parseRange(field) {
  const [start, end = start] = field.split("..");
  return [parseInt(start, 16), parseInt(end, 16)];
}

export function parseCodePoints(field) {
  return field ? field.split(" ").map((hex) => parseInt(hex, 16)) : [];
}
