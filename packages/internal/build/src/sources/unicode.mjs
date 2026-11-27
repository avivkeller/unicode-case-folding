import { dataDirectory } from "./data-directory.mjs";

const directory = (path) =>
  dataDirectory(`https://www.unicode.org/Public/${path}/`, {
    immutable: false,
  });

export const security = directory("security/latest");
export const idna = directory("idna/latest");
export const emoji = directory("emoji/latest");
export const uca = directory("UCA/latest");
export const linkification = directory("UCD/latest/linkification");
