// Run with: node --test cli/bin/vue-go-tsc.test.js
const { test } = require('node:test');
const assert = require('node:assert');

const { computeGoMemLimit, resolveEnv, GiB, DEFAULT_MEM_FRACTION } = require('./vue-go-tsc');

test('computeGoMemLimit defaults to half of total RAM', () => {
  const total = 8 * GiB;
  const limit = computeGoMemLimit(total);
  assert.strictEqual(limit, Math.floor(total * DEFAULT_MEM_FRACTION)); // 4GiB
  assert.ok(limit < total, 'limit must stay below physical RAM');
});

test('computeGoMemLimit scales with RAM', () => {
  assert.strictEqual(computeGoMemLimit(16 * GiB), 8 * GiB);
  assert.strictEqual(computeGoMemLimit(4 * GiB), 2 * GiB);
});

test('computeGoMemLimit returns null for unknown/implausible RAM', () => {
  assert.strictEqual(computeGoMemLimit(0), null);
  assert.strictEqual(computeGoMemLimit(-1), null);
  assert.strictEqual(computeGoMemLimit(NaN), null);
});

test('resolveEnv defaults GOMEMLIMIT (in bytes) when unset', () => {
  const env = resolveEnv({ PATH: '/usr/bin' }, 8 * GiB);
  assert.strictEqual(env.GOMEMLIMIT, String(4 * GiB));
  assert.strictEqual(env.PATH, '/usr/bin', 'existing env is preserved');
});

test('resolveEnv never overrides an explicit GOMEMLIMIT', () => {
  const env = resolveEnv({ GOMEMLIMIT: '6GiB' }, 8 * GiB);
  assert.strictEqual(env.GOMEMLIMIT, '6GiB');
});

test('resolveEnv leaves GOMEMLIMIT unset when RAM is unknown', () => {
  const env = resolveEnv({}, 0);
  assert.strictEqual('GOMEMLIMIT' in env, false);
});
