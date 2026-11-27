// The runtime tests ranges of classes, so their order matters

// Grapheme_Cluster_Break, split by Indic_Conjunct_Break and Extended_Pictographic
export const G_OTHER = 0;
// G_EXTEND_INCB to G_SPACING_MARK: no break before them (GB9, GB9a)
export const G_EXTEND_INCB = 1; // Extend, InCB=Extend
export const G_LINKER = 2; // Extend, InCB=Linker
export const G_EXTEND = 3; // Extend, InCB=None
export const G_ZWJ = 4;
export const G_SPACING_MARK = 5;
export const G_CONSONANT = 6; // Other, InCB=Consonant
export const G_OTHER_LINKER = 7; // Other, InCB=Linker
export const G_PICTOGRAPHIC = 8; // Other, Extended_Pictographic
export const G_PREPEND = 9;
export const G_RI = 10; // Regional_Indicator
export const G_L = 11;
export const G_V = 12;
export const G_T = 13;
export const G_LV = 14;
export const G_LVT = 15;
// G_CONTROL and above: breaks on both sides (GB4, GB5)
export const G_CONTROL = 16;
export const G_CR = 17;
export const G_LF = 18;

// Word_Break, split by Extended_Pictographic and Alphabetic
// Up to W_HEBREW_LETTER: AHLetter. Up to W_OTHER_LETTER: word-like
export const W_ALETTER = 0;
export const W_ALETTER_PICTOGRAPHIC = 1; // ALetter, Extended_Pictographic
export const W_HEBREW_LETTER = 2;
export const W_NUMERIC = 3;
export const W_KATAKANA = 4;
export const W_OTHER_LETTER = 5; // Other, Alphabetic
export const W_EXTEND_NUM_LET = 6;
export const W_OTHER = 7;
export const W_PICTOGRAPHIC = 8; // Other, Extended_Pictographic
// W_MID_LETTER to W_SINGLE_QUOTE: MidLetter | MidNumLetQ
// W_MID_NUM_LET to W_MID_NUM: MidNum | MidNumLetQ
export const W_MID_LETTER = 9;
export const W_MID_NUM_LET = 10;
export const W_SINGLE_QUOTE = 11;
export const W_MID_NUM = 12;
export const W_DOUBLE_QUOTE = 13;
export const W_WSEG_SPACE = 14;
export const W_RI = 15; // Regional_Indicator
// W_EXTEND to W_ZWJ: ignored (WB4)
export const W_EXTEND = 16;
export const W_FORMAT = 17;
export const W_ZWJ = 18;
// W_NEWLINE and above: breaks on both sides (WB3a, WB3b)
export const W_NEWLINE = 19;
export const W_CR = 20;
export const W_LF = 21;

// Sentence_Break
// Up to S_FORMAT: ignored (SB5)
export const S_EXTEND = 0;
export const S_FORMAT = 1;
export const S_OTHER = 2;
export const S_OLETTER = 3;
export const S_LOWER = 4;
export const S_UPPER = 5;
export const S_NUMERIC = 6;
export const S_CLOSE = 7;
export const S_SP = 8;
export const S_SCONTINUE = 9;
// S_ATERM and above: SATerm | ParaSep. S_SEP and above: ParaSep
export const S_ATERM = 10;
export const S_STERM = 11;
export const S_SEP = 12;
export const S_CR = 13;
export const S_LF = 14;
