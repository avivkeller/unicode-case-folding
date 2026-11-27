import * as cldr from "@internal/build/sources/cldr";

export const VERSION = await cldr.version();

const { territoryContainment } = (
  await cldr.json("cldr-core", "supplemental/territoryContainment.json")
).supplemental;

// "…-status-deprecated" and "…-status-grouping" keys are left out
const containers = Object.entries(territoryContainment).filter(
  ([code]) => !code.includes("-"),
);

export const CONTAINS = Object.fromEntries(
  containers.map(([code, { _contains }]) => [code, _contains]),
);

// Groupings (EU, UN…) overlap the tree of the world, and are not parents
export const PARENTS = Object.fromEntries(
  containers
    .filter(([, { _grouping }]) => _grouping !== "true")
    .flatMap(([code, { _contains }]) =>
      _contains.map((child) => [child, code]),
    ),
);
