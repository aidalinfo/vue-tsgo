// Run with: node --test cli/install.test.js
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const { download, copyAtomic, isUsableBinary } = require('./install');

const BODY = Buffer.alloc(256 * 1024, 7);
let server;
let base;

before(async () => {
  server = http.createServer((req, res) => {
    if (req.url === '/full') {
      res.writeHead(200, { 'content-length': BODY.length });
      res.end(BODY);
    } else if (req.url === '/truncated') {
      // Announce the full size, send half of it, then drop the connection.
      res.writeHead(200, { 'content-length': BODY.length });
      res.write(BODY.subarray(0, BODY.length / 2), () => res.socket.destroy());
    } else if (req.url === '/redirect') {
      res.writeHead(302, { location: '/full' });
      res.end();
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vue-go-tsc-install-'));
}

test('download writes the complete body', async () => {
  const dest = path.join(tempDir(), 'tsgo');
  await download(`${base}/full`, dest);
  assert.ok(fs.readFileSync(dest).equals(BODY));
  assert.deepStrictEqual(fs.readdirSync(path.dirname(dest)), ['tsgo'], 'no temporary file left');
});

test('download follows relative redirects', async () => {
  const dest = path.join(tempDir(), 'tsgo');
  await download(`${base}/redirect`, dest);
  assert.ok(fs.readFileSync(dest).equals(BODY));
});

test('an interrupted download leaves no binary behind', async () => {
  const dir = tempDir();
  const dest = path.join(dir, 'tsgo');
  await assert.rejects(download(`${base}/truncated`, dest));
  assert.deepStrictEqual(fs.readdirSync(dir), [], 'neither dest nor a temporary file exists');
});

test('download rejects HTTP errors', async () => {
  const dir = tempDir();
  await assert.rejects(download(`${base}/missing`, path.join(dir, 'tsgo')), /404/);
  assert.deepStrictEqual(fs.readdirSync(dir), []);
});

test('copyAtomic copies without leaving a temporary file', () => {
  const dir = tempDir();
  const src = path.join(dir, 'src');
  fs.writeFileSync(src, BODY);
  copyAtomic(src, path.join(dir, 'dest'));
  assert.ok(fs.readFileSync(path.join(dir, 'dest')).equals(BODY));
  assert.deepStrictEqual(fs.readdirSync(dir).sort(), ['dest', 'src']);
});

test('isUsableBinary rejects missing and broken binaries', { skip: process.platform === 'win32' }, () => {
  const dir = tempDir();
  assert.strictEqual(isUsableBinary(path.join(dir, 'missing')), false);

  const truncated = path.join(dir, 'truncated');
  fs.writeFileSync(truncated, Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0, 0, 0]));
  fs.chmodSync(truncated, 0o755);
  assert.strictEqual(isUsableBinary(truncated), false);

  const notExecutable = path.join(dir, 'not-executable');
  fs.writeFileSync(notExecutable, '#!/bin/sh\nexit 0\n');
  assert.strictEqual(isUsableBinary(notExecutable), false);
});

test('isUsableBinary accepts a binary that runs', { skip: process.platform === 'win32' }, () => {
  const bin = path.join(tempDir(), 'tsgo');
  fs.writeFileSync(bin, '#!/bin/sh\necho "Version 7.0.0-dev"\n');
  fs.chmodSync(bin, 0o755);
  assert.strictEqual(isUsableBinary(bin), true);
});
