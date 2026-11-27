// Run to download emoji-test.txt, without its comments and names
import fs from "node:fs/promises";
import { emoji } from "@internal/build/sources/unicode";

const FILE = "emoji-test.txt";
const contents = await emoji.text(FILE);
const header = contents.slice(0, contents.search(/^$/m));
const lines = [];
for (const line of contents.split("\n")) {
  const match = /^([0-9A-F ]+?)\s*; (\S+)\s*# \S+ E(\d+\.\d+)/.exec(line);
  if (match) lines.push(match.slice(1).join(" ; "));
}
await fs.writeFile(
  new URL(FILE, import.meta.url),
  `${header}\n${lines.join("\n")}\n`,
);
console.log(
  `Wrote ${lines.length} lines of ${FILE} (${await emoji.version(FILE)})`,
);
