import { assertString } from "@internal/helpers/assert";
import {
  EMOJIS,
  EMOJI_VERSIONS,
  GROUPS,
  GROUP_ENDS,
  NAMES,
  STATUSES,
  STATUS_NAMES,
  SUBGROUPS,
  SUBGROUP_ENDS,
  VERSION,
  VERSIONS,
} from "#generated";

export { VERSION };

const FULLY_QUALIFIED = 0;
const COMPONENT = 3;
const MODIFIER = /[\u{1F3FB}-\u{1F3FF}]/u;

let names;
let subgroups;
let indexes;

/**
 * Lists the emoji in keyboard order, e.g. for an emoji picker
 * @param {EmojiListOptions} [options]
 * @returns {Emoji[]}
 */
export function getEmojiList(options = {}) {
  const { group, skinTones = true } = options;
  let start = 0;
  let end = EMOJIS.length;
  if (group !== undefined) {
    assertString(group);
    const index = GROUPS.indexOf(group);
    if (index === -1) throw new RangeError(`Unknown emoji group: ${group}`);
    [start, end] = groupRange(index);
  }
  const list = [];
  for (let i = start; i < end; i++) {
    if (STATUSES[i] !== FULLY_QUALIFIED) continue;
    if (!skinTones && MODIFIER.test(EMOJIS[i])) continue;
    list.push(entry(i));
  }
  return list;
}

/**
 * Returns the name, group and version of an emoji, in any of its forms
 * @param {string} emoji
 * @returns {Emoji | undefined}
 */
export function getEmojiInfo(emoji) {
  assertString(emoji);
  indexes ??= new Map(EMOJIS.map((string, i) => [string, i]));
  const index = indexes.get(emoji);
  return index === undefined ? undefined : entry(index);
}

/**
 * Lists the groups of emoji and their subgroups, in keyboard order
 * @returns {EmojiGroup[]}
 */
export function getEmojiGroups() {
  const groups = [];
  for (let i = 0; i < GROUPS.length; i++) {
    // The group of the skin tone and hair components has no emoji
    const [start, end] = groupRange(i);
    const first = STATUSES.indexOf(FULLY_QUALIFIED, start);
    if (first === -1 || first >= end) continue;
    groups.push({
      group: GROUPS[i],
      subgroups: SUBGROUPS.slice(
        i === 0 ? 0 : GROUP_ENDS[i - 1],
        GROUP_ENDS[i],
      ),
    });
  }
  return groups;
}

function groupRange(group) {
  return [
    group === 0 ? 0 : SUBGROUP_ENDS[GROUP_ENDS[group - 1] - 1],
    SUBGROUP_ENDS[GROUP_ENDS[group] - 1],
  ];
}

function entry(index) {
  if (names === undefined) {
    names = new Array(EMOJIS.length);
    subgroups = new Uint8Array(EMOJIS.length);
    for (let i = 0, named = -1, subgroup = 0; i < EMOJIS.length; i++) {
      if (STATUSES[i] === FULLY_QUALIFIED || STATUSES[i] === COMPONENT) named++;
      while (SUBGROUP_ENDS[subgroup] <= i) subgroup++;
      names[i] = NAMES[named];
      subgroups[i] = subgroup;
    }
  }
  const subgroup = subgroups[index];
  let group = 0;
  while (GROUP_ENDS[group] <= subgroup) group++;
  return {
    emoji: EMOJIS[index],
    name: names[index],
    group: GROUPS[group],
    subgroup: SUBGROUPS[subgroup],
    version: VERSIONS[EMOJI_VERSIONS[index]],
    status: STATUS_NAMES[STATUSES[index]],
  };
}

export default /* @__PURE__ */ Object.assign(getEmojiList, {
  getEmojiList,
  getEmojiInfo,
  getEmojiGroups,
  VERSION,
});

/**
 * @typedef {object} Emoji
 * @property {string} emoji
 * @property {string} name English name, e.g. "waving hand: medium skin tone"
 * @property {string} group e.g. "People & Body"
 * @property {string} subgroup e.g. "hand-fingers-open"
 * @property {string} version Emoji version that introduced it, e.g. "1.0"
 * @property {"fully-qualified" | "minimally-qualified" | "unqualified" | "component"} status
 */

/**
 * @typedef {object} EmojiListOptions
 * @property {string} [group] Only the emoji of a group
 * @property {boolean} [skinTones] false leaves out the skin tone variants
 */

/**
 * @typedef {object} EmojiGroup
 * @property {string} group
 * @property {string[]} subgroups
 */
