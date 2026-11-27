import assert from "node:assert/strict";
import test from "node:test";
import {
  VERSION,
  getWindowsZones,
  ianaToWindows,
  windowsToIana,
  windowsToIanaZones,
} from "../dist/index.mjs";

test("windowsToIana", () => {
  assert.equal(windowsToIana("Pacific Standard Time"), "America/Los_Angeles");
  assert.equal(windowsToIana("W. Europe Standard Time"), "Europe/Berlin");
  assert.equal(windowsToIana("UTC"), "Etc/UTC");
  assert.equal(windowsToIana("eastern standard time"), "America/New_York");
  assert.equal(windowsToIana("Unknown Standard Time"), undefined);
});

test("windowsToIana uses current IANA names", () => {
  assert.equal(windowsToIana("India Standard Time"), "Asia/Kolkata");
  assert.equal(windowsToIana("FLE Standard Time"), "Europe/Kyiv");
});

test("windowsToIana picks the zone for a region", () => {
  assert.equal(
    windowsToIana("Eastern Standard Time", { region: "CA" }),
    "America/Toronto",
  );
  assert.equal(
    windowsToIana("W. Europe Standard Time", { region: "ch" }),
    "Europe/Zurich",
  );
  assert.equal(
    windowsToIana("Pacific Standard Time", { region: "ZZ" }),
    "America/Los_Angeles",
    "unknown regions use the default zone",
  );
});

test("windowsToIanaZones", () => {
  assert.ok(
    windowsToIanaZones("US Eastern Standard Time", "US").includes(
      "America/Indiana/Marengo",
    ),
  );
  assert.deepEqual(windowsToIanaZones("Pacific Standard Time", "001"), [
    "America/Los_Angeles",
  ]);
  assert.deepEqual(windowsToIanaZones("Pacific Standard Time", "DE"), []);
});

test("ianaToWindows", () => {
  assert.equal(ianaToWindows("America/New_York"), "Eastern Standard Time");
  assert.equal(ianaToWindows("Europe/Berlin"), "W. Europe Standard Time");
  assert.equal(ianaToWindows("Asia/Kolkata"), "India Standard Time");
  assert.equal(
    ianaToWindows("Asia/Calcutta"),
    "India Standard Time",
    "deprecated name",
  );
  assert.equal(
    ianaToWindows("europe/kiev"),
    "FLE Standard Time",
    "case-insensitive",
  );
  assert.equal(ianaToWindows("Mars/Olympus_Mons"), undefined);
  assert.throws(() => ianaToWindows(undefined), TypeError);
});

test("every Windows zone round-trips", () => {
  for (const zone of getWindowsZones()) {
    assert.equal(ianaToWindows(windowsToIana(zone)), zone, zone);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
