import fs from "node:fs/promises";
import path from "node:path";

const CACHE_DIR = path.join(
  import.meta.dirname,
  "../../../../node_modules/.cache/unicode-packages",
);

/** Runs `compute` once per key. */
export function memoizer() {
  const results = new Map();
  return (key, compute) => {
    if (!results.has(key)) results.set(key, compute());
    return results.get(key);
  };
}

/** Cached on disk; unless `immutable`, revalidated with the server. */
export async function download(url, { immutable = false } = {}) {
  const file = path.join(CACHE_DIR, encodeURIComponent(url));
  const cached = await fs.stat(file).catch(() => null);
  if (cached && immutable) return fs.readFile(file);

  // unicode.org's ETags don't validate (they get a "-gzip" suffix)
  const response = await fetch(url, {
    headers: cached ? { "if-modified-since": cached.mtime.toUTCString() } : {},
  });
  if (response.status === 304) return fs.readFile(file);
  if (!response.ok) throw new Error(`GET ${url}: ${response.status}`);

  const body = Buffer.from(await response.arrayBuffer());
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(file, body);
  return body;
}
