#!/usr/bin/env node

const { existsSync, mkdirSync, chmodSync, copyFileSync } = require('fs');
const { join } = require('path');
const os = require('os');
const https = require('https');
const { createWriteStream } = require('fs');

const PACKAGE_VERSION = require('./package.json').version;
const BINARY_NAME = process.platform === 'win32' ? 'tsgo.exe' : 'tsgo';
const BIN_DIR = join(__dirname, 'bin');
const BIN_PATH = join(BIN_DIR, BINARY_NAME);

// Shared on-disk cache keyed by version + platform asset name. Lets CI restore
// the binary across runs (cache ~/.cache/vue-go-tsc) and avoids re-downloading
// on local reinstalls. Override the location with VUE_GO_TSC_CACHE_DIR.
const CACHE_ROOT = process.env.VUE_GO_TSC_CACHE_DIR || join(os.homedir(), '.cache', 'vue-go-tsc');
const CACHE_DIR = join(CACHE_ROOT, `v${PACKAGE_VERSION}`);

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

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        download(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Download failed: ${response.statusCode} ${response.statusMessage}`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

function finalizeBinary() {
  // Make executable (Unix-like systems)
  if (process.platform !== 'win32') {
    chmodSync(BIN_PATH, 0o755);
  }
}

async function install() {
  try {
    // Check if binary already exists (useful for development)
    if (existsSync(BIN_PATH)) {
      console.log('✓ vue-go-tsc binary already exists');
      return;
    }

    if (!existsSync(BIN_DIR)) {
      mkdirSync(BIN_DIR, { recursive: true });
    }

    const platformBinary = getPlatformBinary();
    const cachedBinary = join(CACHE_DIR, platformBinary);

    // 1) Serve from the shared cache when present (best-effort — a cache miss or
    //    error just falls through to the download below).
    try {
      if (existsSync(cachedBinary)) {
        copyFileSync(cachedBinary, BIN_PATH);
        finalizeBinary();
        console.log(`✓ vue-go-tsc restored from cache (${cachedBinary})`);
        return;
      }
    } catch {
      // ignore — download is the source of truth
    }

    // 2) Download from the GitHub Release for this version.
    const downloadUrl = `https://github.com/aidalinfo/vue-tsgo/releases/download/v${PACKAGE_VERSION}/${platformBinary}`;
    console.log('Installing vue-go-tsc...');
    console.log(`Downloading from: ${downloadUrl}`);
    await download(downloadUrl, BIN_PATH);
    finalizeBinary();

    // 3) Populate the cache for next time (never fail the install on this).
    try {
      if (!existsSync(CACHE_DIR)) {
        mkdirSync(CACHE_DIR, { recursive: true });
      }
      copyFileSync(BIN_PATH, cachedBinary);
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

install();
