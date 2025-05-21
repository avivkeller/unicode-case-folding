import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CASE_FOLDING_URL = 'https://www.unicode.org/Public/UCD/latest/ucd/CaseFolding.txt';
const TEMPLATE_PATH = path.join(__dirname, 'template.js');
const OUTPUT_PATH = path.join(__dirname, '../lib.js');

async function main() {
  console.log('Fetching Unicode case folding data...');
  const response = await fetch(CASE_FOLDING_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
  }
  const text = await response.text();
  
  console.log('Parsing case folding data...');
  const foldings = parseCaseFolding(text);
  
  console.log('Generating index.js from template...');
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  const code = generateCode(template, foldings);
  
  // Ensure the lib directory exists
  const libDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(libDir)) {
    fs.mkdirSync(libDir, { recursive: true });
  }
  
  // Write the generated code to index.js
  fs.writeFileSync(OUTPUT_PATH, code);
  console.log(`Successfully generated ${OUTPUT_PATH}`);
}

function parseCaseFolding(text) {
  const foldings = new Map();
  
  // Process each line of the file
  text.split('\n').forEach(line => {
    // Skip comments and empty lines
    if (line.startsWith('#') || !line.trim()) return;
    
    // Parse the fields (code; status; mapping; name # comment)
    const fields = line.split(';').map(field => field.trim());
    if (fields.length < 3) return;
    
    const [codeStr, status] = fields;
    const mapping = fields[2];
    
    // We're interested in 'C' (common) and 'F' (full) mappings
    if (status === 'C' || status === 'F') {
      const codePoint = parseInt(codeStr, 16);
      const mappingPoints = mapping.split(' ')
        .map(str => parseInt(str, 16));
      
      foldings.set(codePoint, mappingPoints);
    }
  });
  
  return foldings;
}

function generateCode(template, foldings) {
  // Convert Map to array of entries for serialization
  const foldingEntries = Array.from(foldings.entries());
  
  // Create the Map initialization code
  const mapCode = `
// Mapping of code points to their case-folded equivalents
const FOLDING_MAP = new Map([
${foldingEntries.map(([cp, mappings]) => `  [0x${cp.toString(16).padStart(4, '0')}, [${mappings.map(m => '0x' + m.toString(16).padStart(4, '0')).join(', ')}]]`).join(',\n')}
]);`;

  // Replace placeholder in template
  return template.replace('// MAPPING_DATA_PLACEHOLDER', mapCode);
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});