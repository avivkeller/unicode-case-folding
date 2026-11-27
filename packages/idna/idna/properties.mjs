// Layout of a code point's properties: status | bidi class | joining type | flags
export const STATUS_MASK = 7;
export const VALID = 0;
export const DEVIATION = 1;
export const MAPPED = 2;
export const IGNORED = 3;
export const DISALLOWED = 4;
export const STATUSES = {
  valid: VALID,
  deviation: DEVIATION,
  mapped: MAPPED,
  ignored: IGNORED,
  disallowed: DISALLOWED,
};

export const BIDI_SHIFT = 3;
export const BIDI_MASK = 15;
export const BIDI_OTHER = 0;
export const BIDI_L = 1;
export const BIDI_R = 2;
export const BIDI_AL = 3;
export const BIDI_AN = 4;
export const BIDI_EN = 5;
export const BIDI_ES = 6;
export const BIDI_CS = 7;
export const BIDI_ET = 8;
export const BIDI_ON = 9;
export const BIDI_BN = 10;
export const BIDI_NSM = 11;
export const BIDI_CLASSES = {
  L: BIDI_L,
  R: BIDI_R,
  AL: BIDI_AL,
  AN: BIDI_AN,
  EN: BIDI_EN,
  ES: BIDI_ES,
  CS: BIDI_CS,
  ET: BIDI_ET,
  ON: BIDI_ON,
  BN: BIDI_BN,
  NSM: BIDI_NSM,
};

export const JOINING_SHIFT = 7;
export const JOINING_MASK = 7;
export const JOINING_L = 1;
export const JOINING_D = 2;
export const JOINING_R = 3;
export const JOINING_T = 4;
export const JOINING_TYPES = {
  L: JOINING_L,
  D: JOINING_D,
  R: JOINING_R,
  T: JOINING_T,
};

export const VIRAMA = 1 << 10;
export const MARK = 1 << 11;
