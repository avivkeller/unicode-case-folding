import { emoji } from "@internal/build/sources/unicode";
import { parseCodePoints } from "@internal/build/sources/ucd";

const FILE = "emoji-test.txt";
const LINE = /^([0-9A-F ]+?)\s*; (\S+)\s*# \S+ E(\d+\.\d+) (.+)$/;

export const VERSION = await emoji.version(FILE);

export const STATUS_NAMES = [
  "fully-qualified",
  "minimally-qualified",
  "unqualified",
  "component",
];
export const GROUPS = [];
export const SUBGROUPS = [];
// The number of subgroups up to the end of each group
export const GROUP_ENDS = [];
// The number of emoji up to the end of each subgroup
export const SUBGROUP_ENDS = [];
export const EMOJIS = [];
export const STATUSES = [];
// A name for each emoji whose status is not 1 or 2: those have the name of
// the emoji before them
export const NAMES = [];
export const VERSIONS = [];
export const EMOJI_VERSIONS = [];

let name;
for (const line of (await emoji.text(FILE)).split("\n")) {
  if (line.startsWith("# group: ")) {
    GROUPS.push(line.slice(9));
    GROUP_ENDS.push(SUBGROUPS.length);
  } else if (line.startsWith("# subgroup: ")) {
    SUBGROUPS.push(line.slice(12));
    GROUP_ENDS[GROUP_ENDS.length - 1] = SUBGROUPS.length;
    SUBGROUP_ENDS.push(EMOJIS.length);
  }
  const match = LINE.exec(line);
  if (!match) continue;
  const status = STATUS_NAMES.indexOf(match[2]);
  if (status === -1) throw new Error(`Unknown status in "${line}"`);
  if (status === 0 || status === 3) {
    name = match[4];
    NAMES.push(name);
  } else if (match[4] !== name) {
    throw new Error(`"${line}" does not follow its fully-qualified emoji`);
  }
  if (!VERSIONS.includes(match[3])) VERSIONS.push(match[3]);
  EMOJIS.push(String.fromCodePoint(...parseCodePoints(match[1])));
  STATUSES.push(status);
  EMOJI_VERSIONS.push(VERSIONS.indexOf(match[3]));
  SUBGROUP_ENDS[SUBGROUP_ENDS.length - 1] = EMOJIS.length;
}
