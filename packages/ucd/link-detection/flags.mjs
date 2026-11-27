// A code point's flags: its Link_Term in the low bits, then Link_Email and
// whether it may be in a domain label, in a top-level one, or separate labels
export const TERM = 7;
export const HARD = 0;
export const SOFT = 1;
export const OPEN = 3;
export const CLOSE = 4;
export const TERMS = ["Hard", "Soft", "Include", "Open", "Close"];
export const EMAIL = 8;
export const LABEL = 16;
export const TOP_LEVEL = 32;
export const SEPARATOR = 64;
