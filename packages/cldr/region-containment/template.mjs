import { assertString } from "@internal/helpers/assert";
import { CONTAINS, PARENTS, VERSION } from "#generated";

export { VERSION };

const WORLD = "001";
const countries = new Map();

/**
 * Checks whether a region is inside another: a continent, a UN region or a
 * grouping such as "EU" (European Union), "EZ" (eurozone) or "UN"
 * @param {string} region - ISO 3166 or UN M49 code
 * @param {string} container - e.g. "EU", "150" (Europe), "419" (Latin America)
 * @returns {boolean}
 */
export function isInRegion(region, container) {
  return contains(normalize(container), normalize(region));
}

/**
 * Lists every country and territory inside a region, however deep
 * @param {string} container
 * @returns {string[]} ISO 3166 codes, sorted
 */
export function getCountries(container) {
  return [...countriesOf(normalize(container))];
}

/**
 * Returns the continent of a region, e.g. "FR" → "150" (Europe)
 * @param {string} region
 * @returns {string | undefined} "002", "009", "019", "142" or "150"
 */
export function getContinent(region) {
  let code = normalize(region);
  while (PARENTS[code] && PARENTS[code] !== WORLD) code = PARENTS[code];
  return PARENTS[code] === WORLD ? code : undefined;
}

function normalize(region) {
  assertString(region);
  return region.toUpperCase();
}

function contains(container, region) {
  const children = CONTAINS[container];
  if (!children) return false;
  if (!CONTAINS[region]) return countriesOf(container).includes(region);
  return children.some((child) => child === region || contains(child, region));
}

function countriesOf(container) {
  let list = countries.get(container);
  if (list === undefined) {
    const found = new Set();
    const visit = (code) => {
      const children = CONTAINS[code];
      if (children) children.forEach(visit);
      else found.add(code);
    };
    (CONTAINS[container] ?? []).forEach(visit);
    list = [...found].sort();
    countries.set(container, list);
  }
  return list;
}

export default /* @__PURE__ */ Object.assign(isInRegion, {
  isInRegion,
  getCountries,
  getContinent,
  VERSION,
});
