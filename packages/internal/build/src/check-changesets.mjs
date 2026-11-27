import { readChangesets } from "@changesets/read";
import { ROOT } from "./packages.mjs";

// Patch versions are reserved for the automatic data releases
const wrong = (await readChangesets(ROOT)).flatMap(({ id, releases }) =>
  releases
    .filter(({ type }) => type !== "minor")
    .map(({ name, type }) => `.changeset/${id}.md: ${name} is ${type}`),
);
if (wrong.length > 0) {
  console.error(`Changesets must be minor:\n${wrong.join("\n")}`);
  process.exitCode = 1;
}
