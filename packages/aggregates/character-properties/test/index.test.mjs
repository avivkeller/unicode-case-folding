import assert from "node:assert/strict";
import test from "node:test";
import * as age from "../../../ucd/age/dist/index.mjs";
import * as block from "../../../ucd/block-property/dist/index.mjs";
import * as eastAsianWidth from "../../../ucd/east-asian-width-property/dist/index.mjs";
import * as generalCategory from "../../../ucd/general-category/dist/index.mjs";
import * as script from "../../../ucd/script-property/dist/index.mjs";
import * as verticalOrientation from "../../../ucd/vertical-orientation/dist/index.mjs";
import characterProperties, * as properties from "../dist/index.mjs";

const { VERSION, getProperties } = properties;
const packages = {
  age,
  block,
  eastAsianWidth,
  generalCategory,
  script,
  verticalOrientation,
};

test("getProperties", () => {
  assert.deepEqual(getProperties(0x41), {
    generalCategory: "Lu",
    script: "Latn",
    scriptExtensions: ["Latn"],
    block: "Basic Latin",
    age: "1.1",
    eastAsianWidth: "Na",
    verticalOrientation: "R",
  });
  assert.deepEqual(getProperties(0x30fc), {
    generalCategory: "Lm",
    script: "Zyyy",
    scriptExtensions: ["Hira", "Kana"],
    block: "Katakana",
    age: "1.1",
    eastAsianWidth: "W",
    verticalOrientation: "Tr",
  });
  assert.deepEqual(getProperties(0x2fe0), {
    generalCategory: "Cn",
    script: "Zzzz",
    scriptExtensions: ["Zzzz"],
    block: undefined,
    age: undefined,
    eastAsianWidth: "N",
    verticalOrientation: "U",
  });
  assert.throws(() => getProperties("A"), TypeError);
  assert.throws(() => getProperties(0x110000), RangeError);
});

test("re-exports every function of the six packages", () => {
  for (const [name, module] of Object.entries(packages)) {
    for (const [key, value] of Object.entries(module)) {
      if (typeof value !== "function" || key === "default") continue;
      assert.equal(typeof properties[key], "function", `${name}: ${key}`);
    }
  }
  for (const cp of [0x41, 0x301, 0x30fc, 0x964, 0x4e2d, 0x1f600, 0x378]) {
    assert.deepEqual(getProperties(cp), {
      generalCategory: generalCategory.getGeneralCategory(cp),
      script: script.getScript(cp),
      scriptExtensions: script.getScriptExtensions(cp),
      block: block.getBlock(cp)?.name,
      age: age.getAge(cp),
      eastAsianWidth: eastAsianWidth.getEastAsianWidth(cp),
      verticalOrientation: verticalOrientation.getVerticalOrientation(cp),
    });
  }
});

test("default export", () => {
  assert.equal(characterProperties, getProperties);
  assert.equal(characterProperties(0x41).generalCategory, "Lu");
  for (const [key, value] of Object.entries(properties)) {
    if (key !== "default") assert.equal(characterProperties[key], value, key);
  }
});

test("VERSION is the one of the six packages", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
  for (const [name, module] of Object.entries(packages)) {
    assert.equal(module.VERSION, VERSION, name);
  }
});
