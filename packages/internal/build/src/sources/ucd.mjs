// Set UCD_VERSION (e.g. "18.0.0") to build from a release other than the latest
import { dataDirectory } from "./data-directory.mjs";

export { CODE_POINTS, parseCodePoints, parseRange } from "./data-directory.mjs";

const release = process.env.UCD_VERSION ?? "latest";

export const { text, records, ranges, values, version } = dataDirectory(
  release === "latest"
    ? "https://www.unicode.org/Public/UCD/latest/ucd/"
    : `https://www.unicode.org/Public/${release}/ucd/`,
  { immutable: release !== "latest" },
);

/** Long name → short name: shortNames("sc").get("Latin") is "Latn" */
export async function shortNames(property) {
  return new Map(
    (await records("PropertyValueAliases.txt"))
      .filter(([name]) => name === property)
      .map(([, short, long]) => [long, short]),
  );
}
