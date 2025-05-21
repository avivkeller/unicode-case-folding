import { test } from 'node:test';
import assert from 'node:assert/strict';

import { caseFold, caseFoldEquals, lookupFolding } from '../lib.js';

test('basic case folding', async (t) => {
  const testCases = [
    ['Hello World', 'hello world'],
    ['UPPERCASE', 'uppercase'],
    ['lowercase', 'lowercase'],
    ['MiXeD cAsE', 'mixed case'],
  ];

  for (const [input, expected] of testCases) {
    await t.test(`caseFold("${input}")`, () => {
      assert.equal(caseFold(input), expected);
    });
  }
});

test('special Unicode case folding', async (t) => {
  await t.test('German sharp S (ẞ) should fold to "ss"', () => {
    assert.equal(caseFold('ẞ'), 'ss');
  });

  await t.test('"Straße" should fold to "strasse"', () => {
    assert.equal(caseFold('Straße'), 'strasse');
  });
});

test('case fold comparison', async (t) => {
  await t.test('"HELLO" should be case-fold-equal to "hello"', () => {
    assert.equal(caseFoldEquals('HELLO', 'hello'), true);
  });

  await t.test('"ẞ" should be case-fold-equal to "ss"', () => {
    assert.equal(caseFoldEquals('ẞ', 'ss'), true);
  });
});

test('error handling', async (t) => {
  await t.test('caseFold should throw on non-string input', () => {
    assert.throws(() => caseFold(123), { name: 'TypeError' });
  });

  await t.test('lookupFolding should throw on non-number input', () => {
    assert.throws(() => lookupFolding('A'), { name: 'TypeError' });
  });
});