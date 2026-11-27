import * as ucd from "@internal/build/sources/ucd";
import { rangeTableOf } from "@internal/helpers/tables";

const FILE = "VerticalOrientation.txt";

export const VERSION = await ucd.version(FILE);

const values = await ucd.values(FILE);

export const ORIENTATION_CODES = [...new Set(values)].sort();

export const ORIENTATIONS = rangeTableOf(
  values.map((value) => ORIENTATION_CODES.indexOf(value)),
);
