import * as ucd from "@internal/build/sources/ucd";
import { codePointSet } from "@internal/helpers/tables";

const EAW = "EastAsianWidth.txt";

export const VERSION = await ucd.version(
  EAW,
  "emoji/emoji-data.txt",
  "extracted/DerivedGeneralCategory.txt",
  "DerivedCoreProperties.txt",
);

// Emoji_Presentation adds the emoji whose East_Asian_Width is Neutral
export const WIDE = codePointSet([
  ...(await ucd.ranges(EAW, "W")),
  ...(await ucd.ranges(EAW, "F")),
  ...(await ucd.ranges("emoji/emoji-data.txt", "Emoji_Presentation")),
]);

export const AMBIGUOUS = codePointSet(await ucd.ranges(EAW, "A"));

// Hangul vowel and final jamo combine with the initial consonant before them
const generalCategory = "extracted/DerivedGeneralCategory.txt";
export const ZERO_WIDTH = codePointSet([
  ...(await ucd.ranges(generalCategory, "Mn")),
  ...(await ucd.ranges(generalCategory, "Me")),
  ...(await ucd.ranges(generalCategory, "Cf")),
  ...(await ucd.ranges(generalCategory, "Cc")),
  ...(await ucd.ranges(
    "DerivedCoreProperties.txt",
    "Default_Ignorable_Code_Point",
  )),
  [0x1160, 0x11ff],
  [0xd7b0, 0xd7ff],
]);

export const EMOJI = codePointSet(
  await ucd.ranges("emoji/emoji-data.txt", "Emoji"),
);
