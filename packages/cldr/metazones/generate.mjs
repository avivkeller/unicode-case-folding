import * as cldr from "@internal/build/sources/cldr";

export const VERSION = await cldr.version();

const { metazoneInfo, metazones } = (
  await cldr.json("cldr-core", "supplemental/metaZones.json")
).supplemental.metaZones;
const { tz } = (await cldr.json("cldr-bcp47", "bcp47/timezone.json")).keyword.u;

// CLDR uses the oldest IANA name (Asia/Calcutta); _iana is the current one
const aliasesOf = new Map();
const ianaName = new Map();
for (const { _alias, _iana } of Object.values(tz)) {
  if (!_alias) continue;
  const aliases = _alias.split(" ");
  aliasesOf.set(aliases[0], aliases);
  ianaName.set(aliases[0], _iana ?? aliases[0]);
}
const iana = (zone) => ianaName.get(zone) ?? zone;

const periodsOf = new Map();
(function collect(node, prefix) {
  for (const [name, value] of Object.entries(node)) {
    if (Array.isArray(value)) periodsOf.set(prefix + name, value);
    else collect(value, `${prefix}${name}/`);
  }
})(metazoneInfo.timezone, "");

export const METAZONES = [
  ...new Set(metazones.map(({ mapZone }) => mapZone._other)),
].sort();

// "1977-10-20 23:00" or, once, "1972-01-07 00:44:30", in UTC
function seconds(time) {
  if (time === undefined) return null;
  const [date, clock] = time.split(" ");
  const value = Date.parse(`${date}T${clock.padEnd(8, ":00")}Z`) / 1000;
  if (!Number.isInteger(value)) throw new Error(`Unsupported time: ${time}`);
  return value;
}

export const ZONES = [...periodsOf.keys()].map(iana).sort();

// For each zone of ZONES: [index in METAZONES, from, to, …], the times being
// seconds since the epoch, or null if unbounded
export const PERIODS = [];
// Lowercase IANA name or alias → index in ZONES
export const ZONE_INDEX = new Map();
for (const [zone, periods] of periodsOf) {
  const index = ZONES.indexOf(iana(zone));
  PERIODS[index] = periods.flatMap(({ usesMetazone }) => {
    const metazone = METAZONES.indexOf(usesMetazone._mzone);
    if (metazone === -1) throw new Error(`Unknown ${usesMetazone._mzone}`);
    return [metazone, seconds(usesMetazone._from), seconds(usesMetazone._to)];
  });
  for (const alias of aliasesOf.get(zone) ?? [zone]) {
    ZONE_INDEX.set(alias.toLowerCase(), index);
  }
}

// For each metazone of METAZONES: region → its zone; "001" is the default
export const GOLDEN_ZONES = METAZONES.map(() => ({}));
for (const { mapZone } of metazones) {
  GOLDEN_ZONES[METAZONES.indexOf(mapZone._other)][mapZone._territory] = iana(
    mapZone._type,
  );
}
