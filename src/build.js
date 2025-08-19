import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CASE_FOLDING_URL =
  "https://www.unicode.org/Public/UCD/latest/ucd/CaseFolding.txt";
const TEMPLATE_PATH = path.join(__dirname, "template.js");
const OUTPUT_PATH = path.join(__dirname, "../index.js");

console.log("Fetching Unicode case folding data...");
const response = await fetch(CASE_FOLDING_URL);
if (!response.ok) {
  throw new Error(
    `Failed to fetch data: ${response.status} ${response.statusText}`,
  );
}

console.log("Parsing case folding data...");
const foldings = new Map();

// Parse the case folding data line by line
const text = await response.text();
for (const line of text.split("\n")) {
  // Skip comments and empty lines
  if (line.startsWith("#") || !line.trim()) continue;

  // Parse the fields (code; status; mapping; name # comment)
  const [codeStr, status, mapping] = line
    .split(";")
    .map((field) => field.trim());
  if (!mapping) continue;

  // We're interested in 'C' (common) and 'F' (full) mappings
  if (status === "C" || status === "F") {
    const codePoint = parseInt(codeStr, 16);
    const mappingPoints = mapping.split(" ").map((str) => parseInt(str, 16));
    foldings.set(codePoint, mappingPoints);
  }
}

console.log(`Generating ${OUTPUT_PATH} from template...`);
const template = fs.readFileSync(TEMPLATE_PATH, "utf8");
const code = template.replace(
  "/* MAPPING_DATA_PLACEHOLDER */",
  JSON.stringify(Array.from(foldings.entries())),
);

fs.writeFileSync(OUTPUT_PATH, code);

console.log(`Successfully generated ${OUTPUT_PATH}`);
