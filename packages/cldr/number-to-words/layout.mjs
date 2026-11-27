export const FILE_SETS = 0;
export const FILE_NAMES = 1;
export const FILE_DEFAULT = 2;

// The most common entries come first, as trailing holes take no space
export const SET_BASES = 0;
export const SET_BODIES = 1;
export const SET_DIVISORS = 2;
export const SET_PARTS = 3;
export const SET_NEGATIVE = 4; // "-x"
export const SET_IMPROPER = 5; // "x.x"
export const SET_INFINITY = 6; // "Inf"
export const SET_PROPER = 7; // "0.x"
export const SET_NAN = 8; // "NaN"
export const SET_DEFAULT = 9; // "x.0"
export const SET_FRACTION_LCM = 10;

export const PART_KIND = 0;

export const SUBSTITUTION_SET = 1;
export const SUBSTITUTION_PATTERN = 2;
// MODULUS: preceding rule; DIGITS: false = unspaced; NUMERATOR: true = zeros
export const SUBSTITUTION_OPTION = 3;

export const MULTIPLIER = 0; // "<<" in normal rules
export const MODULUS = 1; // ">>" in normal rules
export const SAME = 2; // "=="
export const ABSOLUTE = 3; // ">>" in negative rules
export const INTEGRAL = 4; // "<<" in fraction rules
export const FRACTIONAL = 5; // ">%set>" in fraction rules
export const DIGITS = 6; // ">>" in fraction rules
export const NUMERATOR = 7; // "<<" in fraction sets

export const CARDINAL_PLURAL = 8;
export const ORDINAL_PLURAL = 9;
export const PLURAL_FORMS = {
  zero: 1,
  one: 2,
  two: 3,
  few: 4,
  many: 5,
  other: 6,
};

export const PATTERN_MIN_INTEGER = 0;
export const PATTERN_MIN_FRACTION = 1;
export const PATTERN_MAX_FRACTION = 2;
export const PATTERN_GROUPING = 3; // [primary, secondary], or null
export const PATTERN_SHOW_DECIMAL = 4; // As in "#."
