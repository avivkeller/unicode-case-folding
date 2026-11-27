export function assertString(input) {
  if (typeof input !== "string") {
    throw new TypeError("Input must be a string");
  }
}

export function assertCodePoint(codePoint) {
  if (typeof codePoint !== "number") {
    throw new TypeError("Code point must be a number");
  }
  if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
    throw new RangeError(`Invalid code point: ${codePoint}`);
  }
}

export function assertOption(name, value, allowed) {
  if (!allowed.includes(value)) {
    throw new RangeError(
      `Invalid ${name}: ${value} (expected ${allowed.join(", ")})`,
    );
  }
}
