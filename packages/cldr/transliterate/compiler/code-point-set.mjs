// Boundaries are [start0, end0 + 1, …], as in @internal/helpers/tables

const LIMIT = 0x110000;

export class CodePointSet {
  constructor(boundaries = []) {
    this.boundaries = boundaries;
  }

  static fromRanges(ranges) {
    const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
    const boundaries = [];
    for (const [start, end] of sorted) {
      const last = boundaries.length - 1;
      if (last >= 0 && start <= boundaries[last]) {
        boundaries[last] = Math.max(boundaries[last], end + 1);
      } else {
        boundaries.push(start, end + 1);
      }
    }
    return new CodePointSet(boundaries);
  }

  static of(...codePoints) {
    return CodePointSet.fromRanges(codePoints.map((cp) => [cp, cp]));
  }

  static range(start, end) {
    return new CodePointSet([start, end + 1]);
  }

  static all() {
    return new CodePointSet([0, LIMIT]);
  }

  has(codePoint) {
    // Count the boundaries <= codePoint; an odd count means inside a range
    let low = 0;
    let high = this.boundaries.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (this.boundaries[mid] <= codePoint) low = mid + 1;
      else high = mid;
    }
    return (low & 1) === 1;
  }

  get isEmpty() {
    return this.boundaries.length === 0;
  }

  get size() {
    let size = 0;
    for (let i = 0; i < this.boundaries.length; i += 2) {
      size += this.boundaries[i + 1] - this.boundaries[i];
    }
    return size;
  }

  *ranges() {
    for (let i = 0; i < this.boundaries.length; i += 2) {
      yield [this.boundaries[i], this.boundaries[i + 1] - 1];
    }
  }

  *codePoints() {
    for (const [start, end] of this.ranges()) {
      for (let cp = start; cp <= end; cp++) yield cp;
    }
  }

  union(other) {
    return this.#combine(other, (a, b) => a || b);
  }

  intersect(other) {
    return this.#combine(other, (a, b) => a && b);
  }

  subtract(other) {
    return this.#combine(other, (a, b) => a && !b);
  }

  complement() {
    return CodePointSet.all().subtract(this);
  }

  equals(other) {
    return (
      this.boundaries.length === other.boundaries.length &&
      this.boundaries.every((boundary, i) => boundary === other.boundaries[i])
    );
  }

  #combine(other, keep) {
    const a = this.boundaries;
    const b = other.boundaries;
    const result = [];
    let i = 0;
    let j = 0;
    let inA = false;
    let inB = false;
    let inResult = false;
    while (i < a.length || j < b.length) {
      const next = Math.min(a[i] ?? LIMIT, b[j] ?? LIMIT);
      if (a[i] === next) {
        inA = !inA;
        i++;
      }
      if (b[j] === next) {
        inB = !inB;
        j++;
      }
      const included = keep(inA, inB);
      if (included !== inResult) {
        result.push(next);
        inResult = included;
      }
    }
    return new CodePointSet(result);
  }
}
