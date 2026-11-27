import assert from "node:assert/strict";
import test from "node:test";
import {
  VERSION,
  getScript,
  getScriptExtensions,
  hasScript,
} from "../dist/index.mjs";

test("getScript", () => {
  assert.equal(getScript(0x41), "Latn");
  assert.equal(getScript(0x416), "Cyrl");
  assert.equal(getScript(0x4e2d), "Hani");
  assert.equal(getScript(0x3042), "Hira");
  assert.equal(getScript(0x1f600), "Zyyy", "emoji are common");
  assert.equal(getScript(0x31), "Zyyy");
  assert.equal(getScript(0x301), "Zinh", "combining acute accent");
  assert.equal(getScript(0x378), "Zzzz", "unassigned");
  assert.equal(getScript(0x10ffff), "Zzzz");
  assert.throws(() => getScript("A"), TypeError);
  assert.throws(() => getScript(0x110000), RangeError);
});

test("getScriptExtensions", () => {
  assert.deepEqual(getScriptExtensions(0x41), ["Latn"]);
  assert.deepEqual(getScriptExtensions(0x30fc), ["Hira", "Kana"]);
  assert.deepEqual(getScriptExtensions(0x1f600), ["Zyyy"]);
  assert.ok(getScriptExtensions(0x964).includes("Deva"), "danda");
  assert.ok(getScriptExtensions(0x964).length > 5);

  const extensions = getScriptExtensions(0x30fc);
  extensions.push("Latn");
  assert.deepEqual(getScriptExtensions(0x30fc), ["Hira", "Kana"]);
});

test("hasScript", () => {
  assert.equal(hasScript(0x41, "Latn"), true);
  assert.equal(hasScript(0x41, "Cyrl"), false);
  assert.equal(hasScript(0x30fc, "Hira"), true);
  assert.equal(hasScript(0x30fc, "Kana"), true);
  assert.equal(hasScript(0x30fc, "Zyyy"), false, "the script is not listed");
  assert.equal(hasScript(0x41, "Jpan"), false);
  assert.throws(() => hasScript(0x41, "Latin"), RangeError);
  assert.throws(() => hasScript(0x41, 5), TypeError);
});

test("agrees with the engine's script properties for known characters", () => {
  const assigned = /\p{Assigned}/u;
  const tests = new Map();
  const testOf = (property, script) => {
    const key = `${property}=${script}`;
    if (!tests.has(key)) {
      let regex = null;
      try {
        regex = new RegExp(`\\p{${key}}`, "u");
      } catch {
        // A script newer than the engine
      }
      tests.set(key, regex);
    }
    return tests.get(key);
  };
  for (let cp = 0; cp <= 0x10ffff; cp++) {
    if (cp >= 0xd800 && cp <= 0xdfff) continue;
    const char = String.fromCodePoint(cp);
    if (!assigned.test(char)) continue;
    const script = testOf("Script", getScript(cp));
    if (script === null) continue;
    assert.ok(script.test(char), `U+${cp.toString(16)} ${getScript(cp)}`);
  }
  for (const cp of [0x30fc, 0x964, 0x660, 0x1cd0, 0x3001]) {
    for (const code of getScriptExtensions(cp)) {
      assert.ok(
        testOf("Script_Extensions", code).test(String.fromCodePoint(cp)),
        `U+${cp.toString(16)} ${code}`,
      );
    }
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
