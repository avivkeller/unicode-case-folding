export const TYPE = 0;
export const FILTER = 1;

export const COMPOUND = 0;
export const CHILDREN = 2;

// SEGMENTS is [start, table, …]; table chars index VALUES from INDEX_FIRST_VALUE
export const RULES = 1;
export const RULE_LIST = 2;
export const VALUES = 3;
export const SEGMENTS = 4;
export const FALLBACK = 5;
export const SETS = 6;
export const FUNCTIONS = 7;
export const INDEX_HOLE = 0x20;
export const INDEX_FIRST_VALUE = 0x21;

export const NORMALIZE = 2;
export const FORM = 2;

export const WORD_BREAK = 3;

export const USE = 4;
export const SHARED_ID = 2;

// Rules: trailing items may be missing, and 0 is an empty context
export const KEY = 0;
export const OUTPUT = 1;
export const POST = 2;
export const ANTE = 3;
export const ANCHORS = 4;
export const CURSOR = 5;
export const ANCHOR_START = 1;
export const ANCHOR_END = 2;

// Pattern elements: a code point, -1 - (index into SETS), or a tuple below
export const QUANTIFIER = 0;
export const SEGMENT = 1;
export const STRINGS = 2;
