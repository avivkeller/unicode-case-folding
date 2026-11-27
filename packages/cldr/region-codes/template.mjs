import { ALPHA2, ALPHA3, NUMERIC, VERSION } from "#generated";

export { VERSION };

let indexes;

/**
 * Returns the ISO 3166-1 alpha-2 code of a region, e.g. "US" for "USA" or 840
 * @param {string | number} code - Alpha-2, alpha-3 or numeric code
 * @returns {string | undefined}
 */
export function toAlpha2(code) {
  return ALPHA2[indexOf(code)];
}

/**
 * Returns the ISO 3166-1 alpha-3 code of a region, e.g. "USA" for "US"
 * @param {string | number} code - Alpha-2, alpha-3 or numeric code
 * @returns {string | undefined}
 */
export function toAlpha3(code) {
  return ALPHA3[indexOf(code)] || undefined;
}

/**
 * Returns the ISO 3166-1 numeric code of a region, e.g. "840" for "US"
 * @param {string | number} code - Alpha-2, alpha-3 or numeric code
 * @returns {string | undefined} Three digits
 */
export function toNumeric(code) {
  return NUMERIC[indexOf(code)] || undefined;
}

/**
 * Returns every code of a region
 * @param {string | number} code - Alpha-2, alpha-3 or numeric code
 * @returns {RegionCodes | undefined}
 */
export function getRegionCodes(code) {
  const index = indexOf(code);
  if (index === undefined) return undefined;
  return {
    alpha2: ALPHA2[index],
    alpha3: ALPHA3[index] || undefined,
    numeric: NUMERIC[index] || undefined,
  };
}

function indexOf(code) {
  if (typeof code !== "string" && typeof code !== "number") {
    throw new TypeError("Region code must be a string or a number");
  }
  const text = String(code);
  const key = /^\d{1,3}$/.test(text)
    ? text.padStart(3, "0")
    : text.toUpperCase();
  if (indexes === undefined) {
    indexes = new Map();
    for (const codes of [ALPHA2, ALPHA3, NUMERIC]) {
      codes.forEach((value, index) => {
        if (value && !indexes.has(value)) indexes.set(value, index);
      });
    }
  }
  return indexes.get(key);
}

export default /* @__PURE__ */ Object.assign(getRegionCodes, {
  getRegionCodes,
  toAlpha2,
  toAlpha3,
  toNumeric,
  VERSION,
});

/**
 * @typedef {object} RegionCodes
 * @property {string} alpha2
 * @property {string} [alpha3]
 * @property {string} [numeric] Three digits
 */
