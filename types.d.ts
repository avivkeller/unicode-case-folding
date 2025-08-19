/**
 * Applies Unicode case folding to a string
 */
export function caseFold(input: string): string;

/**
 * Compares two strings using Unicode case folding
 */
export function caseFoldEquals(str1: string, str2: string): boolean;

/**
 * Returns the full case folding mapping for a code point
 */
export function lookupFolding(codePoint: number): number[] | undefined;

/**
 * Default export object containing case folding utilities
 */
declare const defaultExport: {
  caseFold: typeof caseFold;
  caseFoldEquals: typeof caseFoldEquals;
  lookupFolding: typeof lookupFolding;
};

export default defaultExport;
