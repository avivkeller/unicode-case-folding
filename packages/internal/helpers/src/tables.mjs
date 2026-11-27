export function mappingTable(mappings) {
  const table = new Map();
  for (const [codePoint, mapping] of [...mappings].sort(
    (a, b) => a[0] - b[0],
  )) {
    const value =
      typeof mapping === "string" ? mapping : String.fromCodePoint(...mapping);
    if (value !== String.fromCodePoint(codePoint)) table.set(codePoint, value);
  }
  return table;
}

const SEPARATOR = "\t";

/**
 * Integers as a string: a mode ("1" bit: deltas, "2" bit: signed), then
 * each as base-32 digits from "0", + 32 when another digit follows.
 */
export function packInts(ints) {
  const encode = (delta) => {
    const values = delta
      ? ints.map((int, i) => int - (ints[i - 1] ?? 0))
      : ints;
    const signed = values.some((value) => value < 0) ? 2 : 0;
    let packed = String(signed + delta);
    for (const value of values) {
      let rest = value;
      if (signed) rest = rest < 0 ? -2 * rest - 1 : 2 * rest;
      do {
        const digit = rest % 32;
        rest = (rest - digit) / 32;
        packed += String.fromCharCode(48 + digit + (rest ? 32 : 0));
      } while (rest);
    }
    return packed;
  };
  const [plain, deltas] = [encode(0), encode(1)];
  return deltas.length < plain.length ? deltas : plain;
}

/** @param {string} packed */
export function unpackInts(packed) {
  const mode = packed.charCodeAt(0) - 48;
  const ints = [];
  let previous = 0;
  for (let i = 1; i < packed.length; ) {
    let int = 0;
    let scale = 1;
    let digit;
    do {
      digit = packed.charCodeAt(i++) - 48;
      int += (digit & 31) * scale;
      scale *= 32;
    } while (digit & 32);
    if (mode & 2) int = int % 2 ? -(int + 1) / 2 : int / 2;
    if (mode & 1) int = previous += int;
    ints.push(int);
  }
  return ints;
}

/** @returns {[string, string] | undefined} undefined if it cannot be packed */
export function packMap(table) {
  const isPackable = [...table].every(
    ([codePoint, mapping]) =>
      Number.isSafeInteger(codePoint) &&
      typeof mapping === "string" &&
      !mapping.includes(SEPARATOR),
  );
  if (!isPackable) return undefined;
  return [packInts([...table.keys()]), [...table.values()].join(SEPARATOR)];
}

/**
 * @param {string} keys
 * @param {string} mappings
 * @returns {{ get(codePoint: number): string | undefined }}
 */
export function unpackMap(keys, mappings) {
  let table;
  return {
    get(codePoint) {
      if (table === undefined) {
        const values = mappings.split(SEPARATOR);
        table = new Map(unpackInts(keys).map((key, i) => [key, values[i]]));
      }
      return table.get(codePoint);
    },
  };
}

/** Sorted range boundaries: [start0, end0 + 1, start1, …] */
export function codePointSet(ranges) {
  const boundaries = [];
  for (const [start, end] of [...ranges].sort((a, b) => a[0] - b[0])) {
    if (start <= boundaries.at(-1)) {
      boundaries[boundaries.length - 1] = Math.max(boundaries.at(-1), end + 1);
    } else {
      boundaries.push(start, end + 1);
    }
  }
  return boundaries;
}

export function codePointSetWhere(predicate) {
  const boundaries = [];
  let inside = false;
  for (let codePoint = 0; codePoint <= 0x110000; codePoint++) {
    if ((codePoint <= 0x10ffff && predicate(codePoint)) !== inside) {
      boundaries.push(codePoint);
      inside = !inside;
    }
  }
  return boundaries;
}

export function inSet(set, codePoint) {
  // Inside a range when the last boundary <= codePoint is a start
  return (findRun(set, codePoint) & 1) === 0;
}

/** [starts, values]: each run's first code point, and its value */
export function rangeTable(ranges, fallback) {
  const starts = [];
  const values = [];
  const push = (start, value) => {
    if (values.length && values.at(-1) === value) return;
    starts.push(start);
    values.push(value);
  };
  let next = 0;
  for (const [start, end, value] of [...ranges].sort((a, b) => a[0] - b[0])) {
    if (start > next) push(next, fallback);
    push(start, value);
    next = end + 1;
  }
  if (next <= 0x10ffff) push(next, fallback);
  return [starts, values];
}

export function rangeTableOf(values) {
  const starts = [];
  const runs = [];
  for (let codePoint = 0; codePoint < values.length; codePoint++) {
    if (codePoint === 0 || values[codePoint] !== values[codePoint - 1]) {
      starts.push(codePoint);
      runs.push(values[codePoint]);
    }
  }
  return [starts, runs];
}

export function lookupRange([starts, values], codePoint) {
  return values[findRun(starts, codePoint)];
}

export function toCodePoints(string) {
  const codePoints = [];
  for (let i = 0; i < string.length; ) {
    const codePoint = string.codePointAt(i);
    codePoints.push(codePoint);
    i += codePoint > 0xffff ? 2 : 1;
  }
  return codePoints;
}

/**
 * @param {[number[], number[]]} table - Values < 256
 * @returns {(codePoint: number) => number}
 */
export function directLookup([starts, values]) {
  let direct;
  return (codePoint) => {
    if (codePoint > 0xffff) return values[findRun(starts, codePoint)];
    if (direct === undefined) {
      direct = new Uint8Array(0x10000);
      for (let i = 0; starts[i] <= 0xffff; i++) {
        direct.fill(values[i], starts[i], starts[i + 1]);
      }
    }
    return direct[codePoint];
  };
}

/** Index of the last start <= codePoint, or -1 */
export function findRun(starts, codePoint) {
  let low = 0;
  let high = starts.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (starts[mid] <= codePoint) low = mid + 1;
    else high = mid;
  }
  return low - 1;
}
