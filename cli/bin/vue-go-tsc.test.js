// Run with: node --test cli/bin/vue-go-tsc.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  computeGoMaxProcs,
  computeGoMemLimit,
  measureIdleCpus,
  resolveEnv,
  registerInstance,
  GiB,
  DEFAULT_MEM_FRACTION,
  MIN_MEM_LIMIT,
  AVAILABLE_MEM_FRACTION,
} = require('./vue-go-tsc');

const machine = { cpus: 16, totalMem: 8 * GiB };

test('computeGoMaxProcs defaults to half of the cores when alone', () => {
  assert.strictEqual(computeGoMaxProcs(16), 8);
  assert.strictEqual(computeGoMaxProcs(16, 1), 8);
  assert.strictEqual(computeGoMaxProcs(4), 2);
});

test('computeGoMaxProcs shares the cores between concurrent runs', () => {
  assert.strictEqual(computeGoMaxProcs(16, 2), 8);
  assert.strictEqual(computeGoMaxProcs(16, 3), 5);
  assert.strictEqual(computeGoMaxProcs(16, 4), 4);
  assert.strictEqual(computeGoMaxProcs(16, 8), 2);
});

test('computeGoMaxProcs never goes below one core', () => {
  assert.strictEqual(computeGoMaxProcs(1), 1);
  assert.strictEqual(computeGoMaxProcs(2, 5), 1);
  assert.strictEqual(computeGoMaxProcs(16, 100), 1);
});

test('computeGoMaxProcs returns null for unknown core counts', () => {
  assert.strictEqual(computeGoMaxProcs(0), null);
  assert.strictEqual(computeGoMaxProcs(NaN), null);
});

test('computeGoMaxProcs takes only the idle cores when the machine is busy', () => {
  assert.strictEqual(computeGoMaxProcs(16, 1, 16), 8, 'an idle machine still caps at half');
  assert.strictEqual(computeGoMaxProcs(16, 1, 5.7), 5);
  assert.strictEqual(computeGoMaxProcs(16, 2, 12), 8);
  assert.strictEqual(computeGoMaxProcs(16, 3, 12), 5, 'fair share still applies');
});

test('computeGoMaxProcs keeps a minimum share on a saturated machine', () => {
  assert.strictEqual(computeGoMaxProcs(16, 1, 0), 2);
  assert.strictEqual(computeGoMaxProcs(4, 1, 0), 1);
  // The floor never exceeds the fair share.
  assert.strictEqual(computeGoMaxProcs(16, 16, 0), 1);
});

function cpuTimes(idle, busy) {
  return { times: { user: busy, nice: 0, sys: 0, idle, irq: 0 } };
}

test('measureIdleCpus converts the idle time delta into idle cores', () => {
  const before = [cpuTimes(0, 0), cpuTimes(0, 0)];
  // Core 0 fully idle, core 1 fully busy: one of two cores idle.
  const after = [cpuTimes(200, 0), cpuTimes(0, 200)];
  assert.strictEqual(measureIdleCpus(before, after, 2), 1);
  // Scaled to the cores usable by the process (CPU affinity).
  assert.strictEqual(measureIdleCpus(before, after, 8), 4);
});

test('measureIdleCpus returns undefined when nothing was measured', () => {
  const same = [cpuTimes(10, 10)];
  assert.strictEqual(measureIdleCpus(same, same, 1), undefined);
  assert.strictEqual(measureIdleCpus([], [], 4), undefined);
});

test('computeGoMemLimit defaults to half of total RAM when alone', () => {
  const total = 8 * GiB;
  const limit = computeGoMemLimit(total);
  assert.strictEqual(limit, Math.floor(total * DEFAULT_MEM_FRACTION)); // 4GiB
  assert.ok(limit < total, 'limit must stay below physical RAM');
  assert.strictEqual(computeGoMemLimit(16 * GiB), 8 * GiB);
  assert.strictEqual(computeGoMemLimit(4 * GiB), 2 * GiB);
});

test('computeGoMemLimit keeps concurrent runs below physical RAM combined', () => {
  const total = 16 * GiB;
  for (const n of [2, 3, 4, 6]) {
    const limit = computeGoMemLimit(total, n);
    assert.ok(limit * n < total, `${n} runs must not overcommit RAM`);
    assert.ok(limit <= computeGoMemLimit(total, n - 1), 'more runs never raise the limit');
  }
});

test('computeGoMemLimit never drops below the minimum ceiling', () => {
  assert.strictEqual(computeGoMemLimit(8 * GiB, 100), MIN_MEM_LIMIT);
  // On a tiny machine the floor itself is capped at half of RAM.
  assert.strictEqual(computeGoMemLimit(1 * GiB, 10), Math.floor(0.5 * GiB));
});

test('computeGoMemLimit leaves memory used by other programs alone', () => {
  const total = 16 * GiB;
  assert.strictEqual(computeGoMemLimit(total, 1, 16 * GiB), 8 * GiB, 'a free machine still caps at half');
  assert.strictEqual(computeGoMemLimit(total, 1, 5 * GiB), Math.floor(5 * GiB * AVAILABLE_MEM_FRACTION));
  assert.strictEqual(computeGoMemLimit(total, 1, 0), MIN_MEM_LIMIT, 'never below the minimum ceiling');
});

test('computeGoMemLimit returns null for unknown/implausible RAM', () => {
  assert.strictEqual(computeGoMemLimit(0), null);
  assert.strictEqual(computeGoMemLimit(-1), null);
  assert.strictEqual(computeGoMemLimit(NaN), null);
});

test('resolveEnv defaults GOMAXPROCS and GOMEMLIMIT (in bytes) when unset', () => {
  const env = resolveEnv({ PATH: '/usr/bin' }, machine);
  assert.strictEqual(env.GOMAXPROCS, '8');
  assert.strictEqual(env.GOMEMLIMIT, String(4 * GiB));
  assert.strictEqual(env.PATH, '/usr/bin', 'existing env is preserved');
});

test('resolveEnv scales down with concurrent runs', () => {
  const env = resolveEnv({}, { ...machine, instances: 4 });
  assert.strictEqual(env.GOMAXPROCS, '4');
  assert.strictEqual(env.GOMEMLIMIT, String(computeGoMemLimit(8 * GiB, 4)));
});

test('resolveEnv adapts to the free CPU and RAM', () => {
  const env = resolveEnv({}, { ...machine, idleCpus: 3.2, availableMem: 2 * GiB });
  assert.strictEqual(env.GOMAXPROCS, '3');
  assert.strictEqual(env.GOMEMLIMIT, String(Math.floor(2 * GiB * AVAILABLE_MEM_FRACTION)));
});

test('resolveEnv never overrides explicit GOMAXPROCS / GOMEMLIMIT', () => {
  const env = resolveEnv({ GOMAXPROCS: '12', GOMEMLIMIT: '6GiB' }, { ...machine, instances: 4 });
  assert.strictEqual(env.GOMAXPROCS, '12');
  assert.strictEqual(env.GOMEMLIMIT, '6GiB');
});

test('resolveEnv leaves values unset when resources are unknown', () => {
  const env = resolveEnv({}, { cpus: 0, totalMem: 0 });
  assert.strictEqual('GOMAXPROCS' in env, false);
  assert.strictEqual('GOMEMLIMIT' in env, false);
});

function tempRegistry() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vue-go-tsc-test-'));
}

test('registerInstance counts itself when alone and cleans up', () => {
  const dir = tempRegistry();
  const { instances, unregister } = registerInstance(dir);
  assert.strictEqual(instances, 1);
  assert.deepStrictEqual(fs.readdirSync(dir), [String(process.pid)]);
  unregister();
  assert.deepStrictEqual(fs.readdirSync(dir), []);
});

test('registerInstance counts other live runs', () => {
  const dir = tempRegistry();
  // The parent process is alive for the duration of the test.
  fs.writeFileSync(path.join(dir, String(process.ppid)), String(Date.now()));
  const { instances, unregister } = registerInstance(dir);
  assert.strictEqual(instances, 2);
  unregister();
});

test('registerInstance prunes dead and stale entries', () => {
  const dir = tempRegistry();
  const now = Date.now();
  // A PID that is not running, and a live PID whose entry is days old.
  fs.writeFileSync(path.join(dir, '2147483646'), String(now));
  fs.writeFileSync(path.join(dir, String(process.ppid)), String(now - 3 * 24 * 60 * 60 * 1000));
  fs.writeFileSync(path.join(dir, 'not-a-pid'), '');
  const { instances, unregister } = registerInstance(dir, process.pid, now);
  assert.strictEqual(instances, 1);
  assert.deepStrictEqual(fs.readdirSync(dir).sort(), ['not-a-pid', String(process.pid)].sort());
  unregister();
});

test('registerInstance degrades to alone when the registry is unusable', () => {
  const file = path.join(tempRegistry(), 'file');
  fs.writeFileSync(file, '');
  const { instances, unregister } = registerInstance(path.join(file, 'sub'));
  assert.strictEqual(instances, 1);
  unregister();
});
