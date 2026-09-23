#!/usr/bin/env node

const { existsSync, mkdirSync, chmodSync, copyFileSync, renameSync, rmSync, readdirSync, createWriteStream } = require('fs');
const { join } = require('path');
const os = require('os');
const http = require('http');
const https = require('https');
const { spawnSync } = require('child_process');

const PACKAGE_VERSION = require('./package.json').version;
const BINARY_NAME = process.platform === 'win32' ? 'tsgo.exe' : 'tsgo';
const BIN_DIR = join(__dirname, 'bin');
const BIN_PATH = join(BIN_DIR, BINARY_NAME);

// Shared on-disk cache keyed by version + platform asset name. Lets CI restore
// the binary across runs (cache ~/.cache/vue-go-tsc) and avoids re-downloading
// on local reinstalls. Override the location with VUE_GO_TSC_CACHE_DIR.
const CACHE_ROOT = process.env.VUE_GO_TSC_CACHE_DIR || join(os.homedir(), '.cache', 'vue-go-tsc');
const CACHE_DIR = join(CACHE_ROOT, `v${PACKAGE_VERSION}`);

const MAX_REDIRECTS = 10;

// Platform mapping for GitHub releases
const PLATFORM_MAP = {
  'darwin-x64': 'tsgo-darwin-amd64',
  'darwin-arm64': 'tsgo-darwin-arm64',
  'linux-x64': 'tsgo-linux-amd64',
  'linux-arm64': 'tsgo-linux-arm64',
  'win32-x64': 'tsgo-windows-amd64.exe',
};

function getPlatformBinary() {
  const platform = process.platform;
  const arch = process.arch;
  const key = `${platform}-${arch}`;

  if (!PLATFORM_MAP[key]) {
    throw new Error(
      `Unsupported platform: ${platform}-${arch}\n` +
      `Supported platforms: ${Object.keys(PLATFORM_MAP).join(', ')}`
    );
  }

  return PLATFORM_MAP[key];
}

// A file next to `dest` that is unique to this process, so concurrent
// installs (parallel CI jobs, pnpm workspaces) never write the same file.
function tempPathFor(dest) {
  return `${dest}.${process.pid}.tmp`;
}

// Temporary files being written by this process, removed if it is killed.
const pendingTempFiles = new Set();

function cleanupPendingTempFiles() {
  for (const tmp of pendingTempFiles) {
    rmSync(tmp, { force: true });
  }
}

// Remove temporary binaries left in `dir` by an install that was killed
// before it could clean up. Only for directories no other install writes to.
function removeStaleTempFiles(dir, name) {
  try {
    for (const entry of readdirSync(dir)) {
      if (entry.startsWith(`${name}.`) && entry.endsWith('.tmp')) {
        rmSync(join(dir, entry), { force: true });
      }
    }
  } catch {}
}

// Download `url` to `dest`.
//
// The body is streamed into a temporary file and only renamed onto `dest` once
// it is complete: an interrupted install (Ctrl+C, a sibling postinstall
// failing, a network cut) must never leave a truncated binary behind, since a
// present binary is what later installs trust. A body shorter than the
// announced Content-Length is rejected for the same reason.
function download(url, dest, redirects = 0) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('http:') ? http : https;
    const request = client.get(url, (response) => {
      const { statusCode } = response;
      if ([301, 302, 303, 307, 308].includes(statusCode) && response.headers.location) {
        response.resume();
        if (redirects >= MAX_REDIRECTS) {
          reject(new Error(`Download failed: too many redirects (${url})`));
          return;
        }
        const next = new URL(response.headers.location, url).toString();
        download(next, dest, redirects + 1).then(resolve, reject);
        return;
      }

      if (statusCode !== 200) {
        response.resume();
        reject(new Error(`Download failed: ${statusCode} ${response.statusMessage}`));
        return;
      }

      const expected = Number(response.headers['content-length']);
      const tmp = tempPathFor(dest);
      pendingTempFiles.add(tmp);
      const file = createWriteStream(tmp);
      let received = 0;
      let failed = false;

      const fail = (err) => {
        if (failed) return;
        failed = true;
        response.destroy();
        file.destroy();
        rmSync(tmp, { force: true });
        pendingTempFiles.delete(tmp);
        reject(err);
      };

      response.on('data', (chunk) => {
        received += chunk.length;
      });
      response.on('aborted', () => fail(new Error('Download failed: connection closed early')));
      response.on('error', fail);
      file.on('error', fail);
      file.on('finish', () => {
        if (failed) return;
        if (Number.isFinite(expected) && expected > 0 && received !== expected) {
          fail(new Error(`Download failed: received ${received} of ${expected} bytes`));
          return;
        }
        file.close((err) => {
          if (err) {
            fail(err);
            return;
          }
          try {
            renameSync(tmp, dest);
            pendingTempFiles.delete(tmp);
            resolve();
          } catch (renameErr) {
            fail(renameErr);
          }
        });
      });

      response.pipe(file);
    });
    request.on('error', reject);
  });
}

// Copy `src` onto `dest` through a temporary file, so a reader never sees a
// partially written binary (the shared cache is read by concurrent installs).
function copyAtomic(src, dest) {
  const tmp = tempPathFor(dest);
  try {
    copyFileSync(src, tmp);
    renameSync(tmp, dest);
  } finally {
    rmSync(tmp, { force: true });
  }
}

function makeExecutable(path) {
  // Make executable (Unix-like systems)
  if (process.platform !== 'win32') {
    chmodSync(path, 0o755);
  }
}

// A binary is usable when it exists and actually runs: this rejects a
// truncated or corrupted file (e.g. left by an install from an older version
// of this script) instead of trusting it forever.
function isUsableBinary(path) {
  if (!existsSync(path)) {
    return false;
  }
  const result = spawnSync(path, ['--version'], { stdio: 'ignore', timeout: 30000 });
  return !result.error && result.status === 0;
}

async function install() {
  try {
    // Keep a working binary (useful for development and reinstalls).
    if (isUsableBinary(BIN_PATH)) {
      console.log('✓ vue-go-tsc binary already exists');
      return;
    }
    rmSync(BIN_PATH, { force: true });
    removeStaleTempFiles(BIN_DIR, BINARY_NAME);

    if (!existsSync(BIN_DIR)) {
      mkdirSync(BIN_DIR, { recursive: true });
    }

    const platformBinary = getPlatformBinary();
    const cachedBinary = join(CACHE_DIR, platformBinary);

    // 1) Serve from the shared cache when present (best-effort — a cache miss,
    //    an error or a corrupted entry just falls through to the download).
    try {
      if (existsSync(cachedBinary)) {
        copyAtomic(cachedBinary, BIN_PATH);
        makeExecutable(BIN_PATH);
        if (isUsableBinary(BIN_PATH)) {
          console.log(`✓ vue-go-tsc restored from cache (${cachedBinary})`);
          return;
        }
        rmSync(BIN_PATH, { force: true });
        rmSync(cachedBinary, { force: true });
      }
    } catch {
      // ignore — download is the source of truth
    }

    // 2) Download from the GitHub Release for this version.
    const downloadUrl = `https://github.com/aidalinfo/vue-tsgo/releases/download/v${PACKAGE_VERSION}/${platformBinary}`;
    console.log('Installing vue-go-tsc...');
    console.log(`Downloading from: ${downloadUrl}`);
    await download(downloadUrl, BIN_PATH);
    makeExecutable(BIN_PATH);

    // 3) Populate the cache for next time (never fail the install on this).
    try {
      if (!existsSync(CACHE_DIR)) {
        mkdirSync(CACHE_DIR, { recursive: true });
      }
      copyAtomic(BIN_PATH, cachedBinary);
    } catch {
      // cache is an optimization only
    }

    console.log('✓ vue-go-tsc installed successfully!');
    console.log(`\nRun 'vue-go-tsc --version' to verify installation`);
  } catch (error) {
    console.error('✗ Installation failed:', error.message);
    console.error('\nManual installation:');
    console.error(`1. Download binary from: https://github.com/aidalinfo/vue-tsgo/releases/tag/v${PACKAGE_VERSION}`);
    console.error(`2. Place in: ${BIN_DIR}`);
    console.error(`3. Rename to: ${BINARY_NAME}`);
    process.exit(1);
  }
}

if (require.main === module) {
  // An interrupted install must not leave a partial download behind.
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.on(signal, () => {
      cleanupPendingTempFiles();
      process.exit(128 + os.constants.signals[signal]);
    });
  }
  install();
}

module.exports = { download, copyAtomic, isUsableBinary };
