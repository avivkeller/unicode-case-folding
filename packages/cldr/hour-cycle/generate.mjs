import * as cldr from "@internal/build/sources/cldr";

export const VERSION = await cldr.version();

const { timeData } = (
  await cldr.json("cldr-core", "supplemental/timeData.json")
).supplemental;
const likelySubtags = await cldr.likelySubtags();

// "hb" and "hB" are "h" with flexible day periods
const CYCLES = { h: "h12", hb: "h12", hB: "h12", H: "h23", K: "h11", k: "h24" };

function cyclesOf({ _preferred, _allowed }) {
  const cycles = [_preferred, ..._allowed.split(" ")].map((symbol) => {
    if (!CYCLES[symbol]) throw new Error(`Unknown hour symbol: ${symbol}`);
    return CYCLES[symbol];
  });
  return [...new Set(cycles)].join(" ");
}

export const DEFAULT_CYCLES = cyclesOf(timeData["001"]);

// Region ("US") or language and region ("fr-CA") → cycles, preferred first
export const CYCLES_BY_REGION = new Map(
  Object.entries(timeData)
    .filter(([key]) => key !== "001")
    .map(([key, data]) => [key, cyclesOf(data)])
    .sort(([a], [b]) => (a < b ? -1 : 1)),
);

export const LIKELY_REGIONS = new Map();
for (const [from, to] of Object.entries(likelySubtags)) {
  if (!/^[a-z]{2,3}(?:-[A-Z][a-z]{3})?$/.test(from)) continue;
  const [language, , region] = to.split("-");
  const cycles =
    CYCLES_BY_REGION.get(`${language}-${region}`) ??
    CYCLES_BY_REGION.get(region) ??
    DEFAULT_CYCLES;
  if (cycles !== DEFAULT_CYCLES) LIKELY_REGIONS.set(from, region);
}
