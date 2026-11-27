// Run after `npm run build -- canonicalize-locale`; downloads CLDR's test data
import fs from "node:fs/promises";
import { VERSION } from "../dist/index.mjs";

const FILE = "common/testData/localeIdentifiers/localeCanonicalization.txt";
const OUTPUT = new URL("localeCanonicalization.txt", import.meta.url);

const [major, minor] = VERSION.split(".");
const tag = `release-${major}${minor === "0" ? "" : `-${minor}`}`;
const url = `https://raw.githubusercontent.com/unicode-org/cldr/${tag}/${FILE}`;
const response = await fetch(url);
if (!response.ok) throw new Error(`GET ${url}: ${response.status}`);
await fs.writeFile(OUTPUT, await response.text());
console.log(`Wrote ${FILE} of CLDR ${VERSION} to ${OUTPUT.pathname}`);
