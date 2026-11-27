import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import unicodeIdna, {
  VERSION,
  domainToASCII,
  domainToUnicode,
  toASCII,
  toUnicode,
} from "../dist/index.mjs";
import { findFailures, parseIdnaTest } from "./idna-test.mjs";

test("IdnaTestV2.txt", () => {
  const cases = parseIdnaTest(
    fs.readFileSync(new URL("IdnaTestV2.txt", import.meta.url), "utf8"),
  );
  assert.ok(cases.length > 6000);
  assert.deepEqual(findFailures(cases), []);
});

test("domainToASCII", async (t) => {
  const cases = [
    ["example.com", "example.com"],
    ["EXAMPLE.com", "example.com"],
    ["Bücher.de", "xn--bcher-kva.de"],
    ["Bücher.de", "xn--bcher-kva.de"],
    ["faß.de", "xn--fa-hia.de"],
    ["日本語。ＪＰ", "xn--wgv71a119e.jp"],
    ["☕.us", "xn--53h.us"],
    ["xn--bcher-kva.de", "xn--bcher-kva.de"],
    ["مثال.إختبار", "xn--mgbh0fb.xn--kgbechtv"],
    ["a­b.com", "ab.com"],
    ["", undefined],
    ["a⒈com", undefined],
    ["xn--0.pt", undefined],
    ["xn--u-ccb.com", undefined],
    ["-a.com", undefined],
    ["a_b.com", undefined],
    ["0a.א", undefined],
    ["example.com.", undefined],
    [`${"a".repeat(64)}.com`, undefined],
  ];
  for (const [domain, expected] of cases) {
    await t.test(JSON.stringify(domain), () => {
      assert.equal(domainToASCII(domain), expected);
    });
  }
  assert.throws(() => domainToASCII(1), TypeError);
});

test("domainToUnicode", () => {
  assert.equal(domainToUnicode("xn--bcher-kva.de"), "bücher.de");
  assert.equal(domainToUnicode("XN--BCHER-KVA.DE"), "bücher.de");
  assert.equal(domainToUnicode("xn--fa-hia.de"), "faß.de");
  assert.equal(domainToUnicode("Example.COM"), "example.com");
  assert.equal(domainToUnicode("xn--0.pt"), "xn--0.pt", "invalid Punycode");
  assert.throws(() => domainToUnicode(null), TypeError);
});

test("toASCII and toUnicode report errors", () => {
  assert.deepEqual(toASCII("Bücher.de"), {
    domain: "xn--bcher-kva.de",
    error: false,
  });
  assert.deepEqual(toASCII("-a.de"), { domain: "-a.de", error: true });
  assert.deepEqual(toUnicode("xn--bcher-kva.de"), {
    domain: "bücher.de",
    error: false,
  });
  assert.deepEqual(toUnicode("xn--a-ecp.ru"), {
    domain: "a⒈.ru",
    error: true,
  });
});

test("options", async (t) => {
  await t.test("checkHyphens", () => {
    const domain = "r3---sn-apo3qvuoxuxbt-j5pe.example";
    assert.equal(domainToASCII(domain), undefined);
    assert.equal(domainToASCII(domain, { checkHyphens: false }), domain);
    assert.equal(
      toUnicode("xn--xn---epa.de", { checkHyphens: false }).error,
      true,
    );
  });
  await t.test("useStd3AsciiRules", () => {
    assert.equal(
      domainToASCII("_dmarc.example.com", { useStd3AsciiRules: false }),
      "_dmarc.example.com",
    );
    assert.equal(
      domainToASCII("＿dmarc.example.com", { useStd3AsciiRules: false }),
      "_dmarc.example.com",
    );
  });
  await t.test("checkBidi", () => {
    assert.equal(domainToASCII("0a.א", { checkBidi: false }), "0a.xn--4db");
  });
  await t.test("checkJoiners", () => {
    assert.equal(domainToASCII("a‌b"), undefined);
    assert.equal(domainToASCII("a‌b", { checkJoiners: false }), "xn--ab-j1t");
    assert.equal(domainToASCII("क्‍"), "xn--11b6iy14e");
  });
  await t.test("verifyDnsLength", () => {
    const options = { verifyDnsLength: false };
    assert.equal(domainToASCII("example.com.", options), "example.com.");
    assert.equal(domainToASCII("a..b", options), "a..b");
    assert.equal(domainToASCII("", options), "");
    const long = `${"a".repeat(64)}.com`;
    assert.equal(domainToASCII(long, options), long);
  });
  await t.test("transitional", () => {
    assert.equal(domainToASCII("faß.de", { transitional: true }), "fass.de");
    assert.equal(domainToASCII("FAẞ.de", { transitional: true }), "fass.de");
    assert.equal(domainToASCII("FAẞ.de"), "xn--fa-hia.de");
  });
  await t.test("ignoreInvalidPunycode", () => {
    assert.deepEqual(toUnicode("xn--0.pt", { ignoreInvalidPunycode: true }), {
      domain: "xn--0.pt",
      error: false,
    });
  });
});

test("agrees with node:url on valid domains", async () => {
  const url = await import("node:url");
  const lenient = {
    checkHyphens: false,
    useStd3AsciiRules: false,
    verifyDnsLength: false,
  };
  for (const domain of [
    "Bücher.de",
    "日本語.jp",
    "example.com",
    "مثال.إختبار",
    "ȷ.com",
    "xn--bcher-kva.de",
  ]) {
    assert.equal(domainToASCII(domain, lenient), url.domainToASCII(domain));
    assert.equal(domainToUnicode(domain, lenient), url.domainToUnicode(domain));
  }
});

test("long labels", () => {
  const label = "ü".repeat(5000);
  const { domain, error } = toASCII(label, { verifyDnsLength: false });
  assert.equal(error, false);
  assert.equal(toUnicode(domain).domain, label);
});

test("default export", () => {
  assert.equal(unicodeIdna, domainToASCII);
  assert.equal(unicodeIdna("Bücher.de"), "xn--bcher-kva.de");
  assert.equal(unicodeIdna.domainToUnicode, domainToUnicode);
  assert.equal(unicodeIdna.toASCII, toASCII);
  assert.equal(unicodeIdna.toUnicode, toUnicode);
  assert.equal(unicodeIdna.VERSION, VERSION);
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
