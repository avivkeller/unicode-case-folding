import * as ucd from "@internal/build/sources/ucd";
import { rangeTableOf } from "@internal/helpers/tables";

const DERIVED_CORE = "DerivedCoreProperties.txt";
const PROP_LIST = "PropList.txt";

export const VERSION = await ucd.version(DERIVED_CORE, PROP_LIST);

const PROPERTIES = [
  [DERIVED_CORE, "ID_Start"],
  [DERIVED_CORE, "ID_Continue"],
  [DERIVED_CORE, "XID_Start"],
  [DERIVED_CORE, "XID_Continue"],
  [PROP_LIST, "Pattern_Syntax"],
  [PROP_LIST, "Pattern_White_Space"],
];

const flags = new Array(ucd.CODE_POINTS).fill(0);
for (const [bit, [file, property]] of PROPERTIES.entries()) {
  for (const [start, end] of await ucd.ranges(file, property)) {
    for (let codePoint = start; codePoint <= end; codePoint++) {
      flags[codePoint] |= 1 << bit;
    }
  }
}

// One bit per property, in the order of PROPERTIES
export const FLAGS = rangeTableOf(flags);
