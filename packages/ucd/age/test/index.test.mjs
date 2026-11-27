import assert from "node:assert/strict";
import test from "node:test";
import {
  VERSION,
  getAge,
  getRequiredVersion,
  isAssignedIn,
} from "../dist/index.mjs";

test("getAge", () => {
  assert.equal(getAge(0x41), "1.1");
  assert.equal(getAge(0x20ac), "2.1");
  assert.equal(getAge(0x1f600), "6.1");
  assert.equal(getAge(0x1fae8), "15.0");
  assert.equal(getAge(0x0378), undefined, "unassigned");
  assert.throws(() => getAge("A"), TypeError);
});

test("getRequiredVersion", () => {
  assert.equal(getRequiredVersion("abc"), "1.1");
  assert.equal(getRequiredVersion(""), "1.1");
  assert.equal(getRequiredVersion("I \u{1f600} €"), "6.1");
  assert.equal(getRequiredVersion("\u{1fae8}"), "15.0");
  assert.equal(getRequiredVersion("a͸"), undefined, "unassigned");
});

test("isAssignedIn", () => {
  assert.equal(isAssignedIn(0x1fae8, "15.0"), true);
  assert.equal(isAssignedIn(0x1fae8, "14.0"), false);
  assert.equal(isAssignedIn(0x1fae8, "15.1.0"), true);
  assert.equal(isAssignedIn(0x41, "10"), true);
  assert.equal(isAssignedIn(0x0378, "99.0"), false);
  assert.throws(() => isAssignedIn(0x41, "latest"), RangeError);
});

test("agrees with \\p{Assigned} up to the engine's Unicode version", () => {
  // The Age property also covers noncharacters, which \p{Assigned} does not
  const assignedOrNoncharacter = /[\p{Assigned}\p{Noncharacter_Code_Point}]/u;
  const engine = process.versions.unicode;
  for (let cp = 0; cp <= 0x10ffff; cp++) {
    const assigned = assignedOrNoncharacter.test(String.fromCodePoint(cp));
    assert.equal(isAssignedIn(cp, engine), assigned, `U+${cp.toString(16)}`);
  }
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.getAge);
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
