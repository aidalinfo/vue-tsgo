// Run with: node --test cli/bin/vue-go-tsc.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const { EventEmitter } = require('node:events');
const path = require('node:path');

const {
  parseCodegenArgs,
  resolveProjectConfig,
  computeCodegenWorkers,
  computeGoMaxProcs,
  computeGoMemLimit,
  measureIdleCpus,
  resolveEnv,
  registerInstance,
  countInstances,
  computeRunMemLimit,
  computeAdjustedMemLimit,
  followMemLimit,
  GiB,
  MEM_LIMIT_STEP,
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

test('parseCodegenArgs defaults to the Volar codegen and strips the flag', () => {
  assert.deepStrictEqual(parseCodegenArgs(['--noEmit', '-p', 'tsconfig.json']), {
    codegen: 'volar',
    args: ['--noEmit', '-p', 'tsconfig.json'],
  });
  assert.deepStrictEqual(parseCodegenArgs(['--codegen=go', '--noEmit']), { codegen: 'go', args: ['--noEmit'] });
  assert.deepStrictEqual(parseCodegenArgs(['--noEmit', '--codegen', 'go']), { codegen: 'go', args: ['--noEmit'] });
});

test('parseCodegenArgs honors VUE_GO_TSC_CODEGEN, the flag wins', () => {
  assert.strictEqual(parseCodegenArgs([], { VUE_GO_TSC_CODEGEN: 'go' }).codegen, 'go');
  assert.strictEqual(parseCodegenArgs(['--codegen=volar'], { VUE_GO_TSC_CODEGEN: 'go' }).codegen, 'volar');
});

test('parseCodegenArgs rejects unknown modes', () => {
  assert.match(parseCodegenArgs(['--codegen=fast']).error, /invalid codegen mode "fast"/);
  assert.match(parseCodegenArgs(['--codegen']).error, /invalid codegen mode/);
});

test('resolveProjectConfig finds the checked tsconfig', () => {
  const isDir = (p) => !p.endsWith('.json');
  assert.strictEqual(resolveProjectConfig(['--noEmit'], '/app', isDir), '/app/tsconfig.json');
  assert.strictEqual(resolveProjectConfig(['-p', '.nuxt/tsconfig.shared.json'], '/app', isDir), '/app/.nuxt/tsconfig.shared.json');
  assert.strictEqual(resolveProjectConfig(['--project', 'sub'], '/app', isDir), '/app/sub/tsconfig.json');
  assert.strictEqual(resolveProjectConfig(['--project=/abs/tsconfig.json'], '/app', isDir), '/abs/tsconfig.json');
  assert.strictEqual(resolveProjectConfig(['-b', 'packages/a', '--noEmit'], '/app', isDir), '/app/packages/a/tsconfig.json');
  assert.strictEqual(resolveProjectConfig(['-b', '--noEmit'], '/app', isDir), '/app/tsconfig.json');
});

test('computeCodegenWorkers uses half the cores, capped, and fits the free memory', () => {
  assert.strictEqual(computeCodegenWorkers(8, 32 * GiB), 4);
  assert.strictEqual(computeCodegenWorkers(4, 32 * GiB), 2);
  assert.strictEqual(computeCodegenWorkers(1, 32 * GiB), 1);
  assert.strictEqual(computeCodegenWorkers(8, 3 * GiB), 1, '1/8 of 3 GiB fits one 200 MB worker');
  assert.strictEqual(computeCodegenWorkers(8, 0), 4, 'unknown free memory: cores only');
});

test('resolveEnv wires the Volar codegen and reserves its memory', () => {
  const volar = { pluginEntry: '/pkg/volar/plugin.mjs', nodePath: '/usr/bin/node', tsconfig: '/app/tsconfig.json' };
  const env = resolveEnv({}, { ...machine, codegen: 'volar', volar, availableMem: 8 * GiB });
  assert.strictEqual(env.GOLAR_PLUGIN, 'vue');
  assert.strictEqual(env.GOLAR_PLUGIN_WORKERS, '4');
  assert.strictEqual(env.GOLAR_VUE_PLUGIN_ENTRY, volar.pluginEntry);
  assert.strictEqual(env.GOLAR_NODE, volar.nodePath);
  assert.strictEqual(env.GOLAR_VUE_TSCONFIG, volar.tsconfig);
  const goLimit = Number(resolveEnv({}, { ...machine, availableMem: 8 * GiB }).GOMEMLIMIT);
  assert.strictEqual(Number(env.GOMEMLIMIT), goLimit - 200 * 1024 ** 2 * 5, 'base + 4 workers reserved');
});

test('resolveEnv with the Go codegen never enables the plugin', () => {
  const env = resolveEnv({ GOLAR_PLUGIN: 'vue' }, { ...machine, codegen: 'go' });
  assert.strictEqual('GOLAR_PLUGIN' in env, false);
});

test('countInstances counts live runs without registering', () => {
  const dir = tempRegistry();
  assert.strictEqual(countInstances(dir), 1);
  const other = path.join(dir, String(process.ppid));
  fs.writeFileSync(other, String(Date.now()));
  assert.strictEqual(countInstances(dir), 2);
  fs.unlinkSync(other);
  assert.strictEqual(countInstances(dir), 1, 'a finished run frees its share');
});

test('computeAdjustedMemLimit counts the memory already held by the run as available', () => {
  const totalMem = 16 * GiB;
  // Alone on the machine, holding 3 GiB, with 9 GiB still free: the run is
  // entitled to the same half of RAM it would get on a free machine.
  const limit = computeAdjustedMemLimit({ totalMem, instances: 1, availableMem: 9 * GiB, usage: 3 * GiB });
  assert.strictEqual(limit, 8 * GiB);
  // Without accounting for its own usage, its growth would shrink its limit.
  assert.ok(computeGoMemLimit(totalMem, 1, 9 * GiB) < limit);
});

test('computeAdjustedMemLimit matches the startup limit for an idle run', () => {
  const opts = { totalMem: 16 * GiB, instances: 2, availableMem: 5 * GiB };
  assert.strictEqual(
    computeAdjustedMemLimit({ ...opts, usage: 0, workers: 4 }),
    computeRunMemLimit(16 * GiB, 2, 5 * GiB + 200 * 1024 ** 2 * 5, 4)
  );
  assert.strictEqual(computeAdjustedMemLimit({ ...opts, usage: 0 }), computeRunMemLimit(16 * GiB, 2, 5 * GiB));
});

// A fake tsgo end of the launcher channel.
function fakeChannel() {
  const channel = new EventEmitter();
  channel.sent = [];
  channel.setEncoding = () => {};
  channel.write = (line) => channel.sent.push(line);
  return channel;
}

test('followMemLimit raises the limit once a concurrent run has finished', () => {
  const totalMem = 16 * GiB;
  const workers = 4;
  // Pulse starts next to Docs: two runs, little free RAM.
  let state = { instances: 2, availableMem: 4.5 * GiB };
  const initialLimit = computeRunMemLimit(totalMem, state.instances, state.availableMem, workers);
  const channel = fakeChannel();
  followMemLimit(channel, { initialLimit, totalMem, workers, measure: () => state });

  // Still sharing the machine, the codegen workers and 1 GiB of Go heap now
  // hold part of the RAM that was free at startup: nothing changes.
  state = { instances: 2, availableMem: 4.5 * GiB - 200 * 1024 ** 2 * 5 - GiB };
  channel.emit('data', `usage ${GiB}\n`);
  assert.deepStrictEqual(channel.sent, []);

  // Docs finishes: Pulse holds 2.5 GiB and the RAM Docs used is free again.
  state = { instances: 1, availableMem: 9 * GiB };
  channel.emit('data', `usage ${2.5 * GiB}\n`);
  const raised = computeAdjustedMemLimit({ totalMem, ...state, usage: 2.5 * GiB, workers });
  assert.deepStrictEqual(channel.sent, [`limit ${raised}\n`]);
  assert.ok(raised > initialLimit + GiB, `${raised} should be well above ${initialLimit}`);
});

test('followMemLimit lowers the limit when another run starts', () => {
  const totalMem = 16 * GiB;
  let state = { instances: 1, availableMem: 14 * GiB };
  const initialLimit = computeRunMemLimit(totalMem, 1, state.availableMem);
  const channel = fakeChannel();
  followMemLimit(channel, { initialLimit, totalMem, workers: 0, measure: () => state });
  state = { instances: 3, availableMem: 10 * GiB };
  channel.emit('data', `usage ${2 * GiB}\n`);
  assert.deepStrictEqual(channel.sent, [`limit ${computeGoMemLimit(totalMem, 3, 12 * GiB)}\n`]);
});

test('followMemLimit ignores small moves, partial lines and noise', () => {
  const totalMem = 16 * GiB;
  const state = { instances: 1, availableMem: 10 * GiB };
  const initialLimit = computeAdjustedMemLimit({ totalMem, ...state, usage: GiB });
  const channel = fakeChannel();
  followMemLimit(channel, { initialLimit, totalMem, workers: 0, measure: () => state });
  channel.emit('data', `usage ${GiB + MEM_LIMIT_STEP / 2}\n`);
  channel.emit('data', 'garbage\nusage abc\n');
  assert.deepStrictEqual(channel.sent, [], 'below the step or unparsable');

  // A report split across chunks is only read once complete; the most recent
  // complete report wins.
  state.instances = 4;
  channel.emit('data', 'usage 1');
  assert.deepStrictEqual(channel.sent, []);
  channel.emit('data', `0\nusage ${GiB}\n`);
  assert.deepStrictEqual(channel.sent, [`limit ${computeAdjustedMemLimit({ totalMem, ...state, usage: GiB })}\n`]);
});
