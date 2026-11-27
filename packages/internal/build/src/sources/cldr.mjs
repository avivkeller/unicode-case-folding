// Downloaded rather than installed, so every build uses the latest cldr-json
import { parseTarGzip } from "nanotar";
import { download, memoizer } from "../fetch.mjs";

const REGISTRY = "https://registry.npmjs.org";

const memo = memoizer();

/** @returns {Promise<string>} */
export const version = () =>
  memo(
    "version",
    async () =>
      process.env.CLDR_VERSION ??
      JSON.parse(await download(`${REGISTRY}/cldr-core/latest`)).version,
  );

const packageFiles = (name) =>
  memo(`package:${name}`, async () => {
    const url = `${REGISTRY}/${name}/-/${name}-${await version()}.tgz`;
    const entries = await parseTarGzip(
      await download(url, { immutable: true }),
    );
    return new Map(
      entries.map(({ name, text }) => [name.replace(/^package\//, ""), text]),
    );
  });

export async function has(name, file) {
  return (await packageFiles(name)).has(file);
}

export async function text(name, file) {
  const contents = (await packageFiles(name)).get(file);
  if (contents === undefined) throw new Error(`${name} has no ${file}`);
  return contents;
}

export async function json(name, file) {
  return JSON.parse(await text(name, file));
}

export async function likelySubtags() {
  const data = await json("cldr-core", "supplemental/likelySubtags.json");
  return data.supplemental.likelySubtags;
}

export const localeData = (name, section) =>
  memo(`locales:${name}:${section}`, async () => {
    const result = new Map();
    for (const [file, contents] of await packageFiles(name)) {
      const locale = file.match(`^main/([^/]+)/${section}\\.json$`)?.[1];
      if (locale)
        result.set(locale, JSON.parse(contents).main[locale][section]);
    }
    return result;
  });
