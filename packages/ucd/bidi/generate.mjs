import { bidiVersion, generateBidi } from "@internal/build/sources/bidi";

export const VERSION = await bidiVersion();
export const BIDI = await generateBidi({ mirrored: true });
