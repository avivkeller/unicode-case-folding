// A package's "specs" maps each specification it implements to the revision
// it was last checked against. Without a flag, lists the ones that changed;
// --open-issues reports them on GitHub, --update records the new revisions.
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { findPackages } from "./packages.mjs";

const [mode, ...filters] = process.argv.slice(2);

const packages = (await findPackages(filters)).filter(
  (pkg) => pkg.manifest.specs,
);
const urls = [
  ...new Set(packages.flatMap((pkg) => Object.keys(pkg.manifest.specs))),
].sort();

for (const url of urls) {
  const { title, revision, link } = await fetchSpec(url);
  const stale = packages.filter(
    (pkg) => url in pkg.manifest.specs && pkg.manifest.specs[url] !== revision,
  );
  if (stale.length === 0) continue;
  console.log(
    `${title}: revision ${revision} (${stale.map((pkg) => `${pkg.name} is at ${pkg.manifest.specs[url]}`).join(", ")})`,
  );
  if (mode === "--open-issues") openIssue(url, title, revision, link, stale);
  if (mode === "--update") {
    for (const pkg of stale) await record(pkg, url, revision);
  }
}

async function fetchSpec(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GET ${url}: ${response.status}`);
  const html = await response.text();
  // "This Version": …/reports/tr29/tr29-49.html, …/reports/tr35/tr35-79/tr35.html
  const [link, , revision] =
    /https:\/\/www\.unicode\.org\/reports\/tr(\d+)\/tr\1-(\d+)[\w./-]*/.exec(
      html,
    ) ?? [];
  if (!link) throw new Error(`${url} does not link to its revision`);
  const title =
    /<title>([^<]+)<\/title>/.exec(html)?.[1].trim().replace("&amp;", "&") ??
    url;
  return { title, revision: Number(revision), link };
}

function openIssue(url, title, revision, link, stale) {
  const issueTitle = `${title}: revision ${revision}`;
  const existing = JSON.parse(
    execFileSync(
      "gh",
      [
        "issue",
        "list",
        "--state=all",
        "--json=title",
        `--search="${issueTitle}" in:title`,
      ],
      { encoding: "utf8" },
    ),
  );
  if (existing.some((issue) => issue.title === issueTitle)) return;

  const body = [
    `[${title}](${url}) is now at [revision ${revision}](${link}).`,
    "",
    "These packages implement an earlier revision:",
    "",
    ...stale.map(
      (pkg) =>
        `- [ ] \`${pkg.name}\` (\`${pkg.relativeDir}\`), checked against revision ${pkg.manifest.specs[url]}`,
    ),
    "",
    "Review the modifications of the specification, update the packages they affect, then record the revision:",
    "",
    "```sh",
    `npm run specs -- --update ${stale.map((pkg) => pkg.name).join(" ")}`,
    "```",
  ].join("\n");
  execFileSync(
    "gh",
    ["issue", "create", `--title=${issueTitle}`, `--body=${body}`],
    { stdio: "inherit" },
  );
}

// Edits the text, to keep the formatting of package.json
async function record(pkg, url, revision) {
  const file = path.join(pkg.dir, "package.json");
  const manifest = await fs.readFile(file, "utf8");
  const entry = `${JSON.stringify(url)}: `;
  const start = manifest.indexOf(entry) + entry.length;
  const end = start + String(pkg.manifest.specs[url]).length;
  await fs.writeFile(
    file,
    manifest.slice(0, start) + revision + manifest.slice(end),
  );
}
