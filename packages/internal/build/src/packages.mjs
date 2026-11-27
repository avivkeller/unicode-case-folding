import fs from "node:fs/promises";
import path from "node:path";

export const ROOT = path.resolve(import.meta.dirname, "../../../..");

/**
 * @typedef {object} Package
 * @property {string} name
 * @property {string} version
 * @property {string} dir
 * @property {string} relativeDir
 * @property {string} distDir
 * @property {Record<string, any>} manifest
 */

/** @returns {Promise<Package[]>} */
export async function findPackages(filters = []) {
  const packages = [];
  const manifests = fs.glob("packages/*/*/package.json", {
    cwd: ROOT,
    exclude: (file) => file.startsWith("packages/internal/"),
  });
  for await (const file of manifests) {
    const relativeDir = path.dirname(file);
    const dir = path.join(ROOT, relativeDir);
    const manifest = JSON.parse(
      await fs.readFile(path.join(ROOT, file), "utf8"),
    );
    packages.push({
      name: manifest.name,
      version: manifest.version,
      dir,
      relativeDir,
      distDir: path.join(dir, "dist"),
      manifest,
    });
  }

  const matches = (pkg, filter) =>
    pkg.name === filter || path.basename(pkg.dir) === filter;
  const unknown = filters.filter((f) => !packages.some((p) => matches(p, f)));
  if (unknown.length)
    throw new Error(`Unknown packages: ${unknown.join(", ")}`);
  return packages
    .filter((pkg) => !filters.length || filters.some((f) => matches(pkg, f)))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function writeManifest(pkg) {
  const root = JSON.parse(
    await fs.readFile(path.join(ROOT, "package.json"), "utf8"),
  );
  const { name, version, description, keywords } = pkg.manifest;
  const manifest = {
    name,
    version,
    description,
    keywords,
    license: root.license,
    author: root.author,
    type: "module",
    main: "./index.mjs",
    types: "./index.d.mts",
    exports: { ".": { types: "./index.d.mts", default: "./index.mjs" } },
    files: ["index.mjs", "index.d.mts"],
    sideEffects: false,
    repository: { ...root.repository, directory: pkg.relativeDir },
    bugs: root.bugs,
    homepage: `${root.homepage}/tree/main/${pkg.relativeDir}#readme`,
  };
  await fs.writeFile(
    path.join(pkg.distDir, "package.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}
