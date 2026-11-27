import path from "node:path";
import { packInts, packMap } from "@internal/helpers/tables";

// Shorter data is smaller as a literal than as a call to unpack it
const PACKED_LENGTH = 32;
const HELPERS = ["unpackInts", "unpackMap"];

/** @returns {import("rolldown").Plugin} */
export function generatedData() {
  return {
    name: "generated-data",
    async load(id) {
      if (path.basename(id) === "generate.mjs") {
        return serializeModule(await import(id));
      }
    },
  };
}

export function serializeModule(namespace) {
  const exports = Object.entries(namespace)
    .map(([name, value]) => `export const ${name} = ${toSource(value)};\n`)
    .join("");
  const helpers = HELPERS.filter((name) => exports.includes(`${name}(`));
  const imports = helpers.length
    ? `import { ${helpers.join(", ")} } from "@internal/helpers/tables";\n`
    : "";
  return imports + exports;
}

function toSource(value) {
  if (value instanceof Map) {
    const packed = value.size >= PACKED_LENGTH ? packMap(value) : undefined;
    return packed
      ? `/* @__PURE__ */ unpackMap(${packed.map((part) => JSON.stringify(part))})`
      : `/* @__PURE__ */ new Map(${toSource([...value])})`;
  }
  if (value instanceof Set) {
    return `/* @__PURE__ */ new Set(${toSource([...value])})`;
  }
  if (Array.isArray(value)) {
    const isLong = value.length >= PACKED_LENGTH && !value.includes(undefined);
    if (isLong && value.every(Number.isSafeInteger)) {
      return `/* @__PURE__ */ unpackInts(${JSON.stringify(packInts(value))})`;
    }
    if (
      isLong &&
      value.every((item) => typeof item === "string" && !item.includes("\t"))
    ) {
      return `/* @__PURE__ */ ${JSON.stringify(value.join("\t"))}.split("\t")`;
    }
    return `[${value.map(toSource).join(",")}]`;
  }
  if (value?.constructor === Object) {
    const entries = Object.entries(value).map(
      ([key, item]) => `${JSON.stringify(key)}:${toSource(item)}`,
    );
    return `{${entries.join(",")}}`;
  }
  if (
    typeof value === "string" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return JSON.stringify(value);
  }
  if (Number.isFinite(value)) return String(value);
  throw new TypeError(`Cannot serialize ${String(value)}`);
}
