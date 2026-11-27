import * as cldr from "@internal/build/sources/cldr";

export const VERSION = await cldr.version();

const likelySubtags = Object.entries(await cldr.likelySubtags()).sort(
  ([a], [b]) => (a < b ? -1 : 1),
);

// Tab-separated and parallel; template.mjs builds a Map on first use
export const TAGS = likelySubtags.map(([tag]) => tag).join("\t");
export const LIKELY = likelySubtags.map(([, likely]) => likely).join("\t");
