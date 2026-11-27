import fs from "node:fs/promises";
import path from "node:path";
import { build } from "rolldown";
import { dts } from "rolldown-plugin-dts";
import { generatedData } from "./generated-data.mjs";
import { ROOT, findPackages, writeManifest } from "./packages.mjs";

const packages = await findPackages(process.argv.slice(2));
const templates = new Map(
  (await findPackages()).map((pkg) => [
    pkg.name,
    path.join(pkg.dir, "template.mjs"),
  ]),
);
await Promise.all(packages.map(buildPackage));

async function buildPackage(pkg) {
  await fs.rm(pkg.distDir, { recursive: true, force: true });
  const { output: chunks } = await build({
    input: { index: path.join(pkg.dir, "template.mjs") },
    platform: "neutral",
    plugins: [
      siblingPackages(),
      generatedData(),
      dts({ emitJs: true, tsconfig: path.join(ROOT, "tsconfig.json") }),
    ],
    onLog(level, log, handler) {
      // Plugins taking most of the time is expected: they generate the data
      if (log.code === "PLUGIN_TIMINGS") return;
      handler(level === "warn" ? "error" : level, log);
    },
    output: {
      dir: pkg.distDir,
      entryFileNames: "[name].mjs",
      banner: `/*! ${pkg.name} | MIT License | Includes data © Unicode, Inc., Unicode License v3 (https://www.unicode.org/license.txt) */`,
      minify: true,
      // @__PURE__ annotations let consumers' bundlers drop unused data
      comments: { legal: true, annotation: true, jsdoc: false },
    },
  });

  await fs.copyFile(
    path.join(pkg.dir, "README.md"),
    path.join(pkg.distDir, "README.md"),
  );
  await fs.copyFile(
    path.join(ROOT, "LICENSE"),
    path.join(pkg.distDir, "LICENSE"),
  );
  await writeManifest(pkg);
  const { code } = chunks.find((chunk) => chunk.fileName === "index.mjs");
  const kilobytes = (Buffer.byteLength(code) / 1024).toFixed(1);
  console.log(`  ${pkg.name} (${kilobytes} kB)`);
}

/**
 * Bundles a package that another one imports by name
 * @returns {import("rolldown").Plugin}
 */
function siblingPackages() {
  return {
    name: "sibling-packages",
    resolveId: (source) => templates.get(source),
  };
}
