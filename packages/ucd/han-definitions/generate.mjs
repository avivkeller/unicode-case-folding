import * as ucd from "@internal/build/sources/ucd";

const FILE = "Unihan_Readings.txt";

export const VERSION = await ucd.version(`Unihan.zip/${FILE}`);

export const DEFINITIONS = new Map(
  [...(await ucd.unihan(FILE, "kDefinition"))].sort((a, b) => a[0] - b[0]),
);
