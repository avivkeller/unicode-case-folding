import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { parseTarGzip } from "nanotar";
import semver from "semver";
import { findPackages, writeManifest } from "./packages.mjs";

const { values, positionals } = parseArgs({
  options: { "dry-run": { type: "boolean" } },
  allowPositionals: true,
});

const released = [];
for (const pkg of await findPackages(positionals)) {
  const response = await fetch(`https://registry.npmjs.org/${pkg.name}/latest`);
  if (response.status === 404) {
    console.log(
      `::warning::${pkg.name} was never published. Publish it once by hand ` +
        `(npm publish ${pkg.relativeDir}/dist), then set up trusted publishing.`,
    );
    continue;
  }
  const latest = await response.json();
  const tarball = await fetch(latest.dist.tarball);
  const files = await parseTarGzip(await tarball.arrayBuffer());

  const changed = await changedFiles(pkg, files);
  if (changed.length === 0) continue;

  const version = semver.gt(pkg.version, latest.version)
    ? pkg.version
    : semver.inc(latest.version, "patch");
  console.log(`${pkg.name}@${version}: ${changed.join(", ")} changed`);
  if (values["dry-run"]) continue;

  pkg.manifest.version = version;
  await fs.writeFile(
    path.join(pkg.dir, "package.json"),
    `${JSON.stringify(pkg.manifest, null, 2)}\n`,
  );
  await writeManifest(pkg);
  execFileSync("npm", ["publish", pkg.distDir, "--provenance"], {
    stdio: "inherit",
  });
  released.push(`${pkg.name}@${version}`);
}

if (process.env.GITHUB_OUTPUT && released.length) {
  await fs.appendFile(
    process.env.GITHUB_OUTPUT,
    `released=${released.join(", ")}\n`,
  );
}

async function changedFiles(pkg, releaseFiles) {
  const released = new Map(
    releaseFiles.map(({ name, text }) => [
      name.replace(/^package\//, ""),
      text,
    ]),
  );
  const local = new Map();
  for (const file of await fs.readdir(pkg.distDir)) {
    local.set(file, await fs.readFile(path.join(pkg.distDir, file), "utf8"));
  }
  const comparable = (file, text) =>
    file === "package.json"
      ? JSON.stringify({ ...JSON.parse(text), version: undefined })
      : text;
  return [...new Set([...local.keys(), ...released.keys()])].filter(
    (file) =>
      !local.has(file) ||
      !released.has(file) ||
      comparable(file, local.get(file)) !==
        comparable(file, released.get(file)),
  );
}
