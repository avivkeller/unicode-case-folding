import * as ucd from "@internal/build/sources/ucd";
import { rangeTableOf } from "@internal/helpers/tables";

const FILE = "EastAsianWidth.txt";

export const VERSION = await ucd.version(FILE);

const values = await ucd.values(FILE);

export const WIDTH_CODES = [...new Set(values)].sort();

export const WIDTHS = rangeTableOf(
  values.map((value) => WIDTH_CODES.indexOf(value)),
);
