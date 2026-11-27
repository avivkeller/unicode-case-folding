import { casingVersion, generateCasing } from "@internal/build/sources/casing";

export const VERSION = await casingVersion();

export const CASING = await generateCasing({
  kinds: ["title", "lower"],
  properties: ["Cased"],
});
