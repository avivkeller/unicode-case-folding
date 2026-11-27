// Run after `npm run build -- locale-matcher`; downloads ICU's test data
import fs from "node:fs/promises";
import { VERSION } from "../dist/index.mjs";

const FILE = "icu4c/source/test/testdata/localeMatcherTest.txt";
const OUTPUT = new URL("localeMatcherTest.txt", import.meta.url);

// ICU 79 has the data of CLDR 49
const tag = `release-${Number(VERSION.split(".")[0]) + 30}.1`;
const url = `https://raw.githubusercontent.com/unicode-org/icu/${tag}/${FILE}`;
const response = await fetch(url);
if (!response.ok) throw new Error(`GET ${url}: ${response.status}`);
await fs.writeFile(OUTPUT, await response.text());
console.log(`Wrote ${FILE} of ICU ${tag} to ${OUTPUT.pathname}`);
