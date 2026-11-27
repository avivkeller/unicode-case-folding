import * as cldr from "@internal/build/sources/cldr";

export const VERSION = await cldr.version();

const { mapTimezones } = (
  await cldr.json("cldr-core", "supplemental/windowsZones.json")
).supplemental.windowsZones;
const { tz } = (await cldr.json("cldr-bcp47", "bcp47/timezone.json")).keyword.u;

// CLDR uses the oldest IANA name (Asia/Calcutta); _iana is the current one
const aliasesOf = new Map();
const ianaName = new Map();
for (const { _alias, _iana } of Object.values(tz)) {
  if (!_alias) continue;
  const aliases = _alias.split(" ");
  for (const alias of aliases) {
    aliasesOf.set(alias, aliases);
    ianaName.set(alias, _iana ?? aliases[0]);
  }
}

/** [name, { region: IANA zones }]; region "001" is the default */
export const WINDOWS_ZONES = [];
export const WINDOWS_INDEX = new Map();
export const IANA_INDEX = new Map();

// "001" entries come first, so they win for IANA zones listed several times
for (const { mapZone } of mapTimezones) {
  const { _other: windows, _territory: region, _type: zones } = mapZone;
  const key = windows.toLowerCase();
  if (!WINDOWS_INDEX.has(key)) {
    WINDOWS_INDEX.set(key, WINDOWS_ZONES.push([windows, {}]) - 1);
  }
  const index = WINDOWS_INDEX.get(key);
  WINDOWS_ZONES[index][1][region] = zones
    .split(" ")
    .map((zone) => ianaName.get(zone) ?? zone);

  for (const zone of zones.split(" ")) {
    for (const alias of aliasesOf.get(zone) ?? [zone]) {
      const aliasKey = alias.toLowerCase();
      if (!IANA_INDEX.has(aliasKey)) IANA_INDEX.set(aliasKey, index);
    }
  }
}
