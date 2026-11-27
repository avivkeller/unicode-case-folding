import { dataDirectory } from "./data-directory.mjs";

export const security = dataDirectory(
  "https://www.unicode.org/Public/security/latest/",
  { immutable: false },
);
