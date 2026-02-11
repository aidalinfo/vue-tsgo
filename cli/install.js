#!/usr/bin/env node

const { existsSync, mkdirSync, chmodSync } = require('fs');
const { join } = require('path');
const https = require('https');
const { createWriteStream } = require('fs');

const PACKAGE_VERSION = require('./package.json').version;
const BINARY_NAME = process.platform === 'win32' ? 'tsgo.exe' : 'tsgo';
const BIN_DIR = join(__dirname, 'bin');
const BIN_PATH = join(BIN_DIR, BINARY_NAME);

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

async function install() {
  try {
    // Check if binary already exists (useful for development)
    if (existsSync(BIN_PATH)) {
      console.log('✓ vue-tsgo binary already exists');
      return;
    }

    console.log('Installing vue-tsgo...');

    const platformBinary = getPlatformBinary();
    const downloadUrl = `https://github.com/nonfx/golar/releases/download/v${PACKAGE_VERSION}/${platformBinary}`;

    console.log(`Downloading from: ${downloadUrl}`);

    // Ensure bin directory exists
    if (!existsSync(BIN_DIR)) {
      mkdirSync(BIN_DIR, { recursive: true });
    }

    // Download binary
    await download(downloadUrl, BIN_PATH);

    // Make executable (Unix-like systems)
    if (process.platform !== 'win32') {
      chmodSync(BIN_PATH, 0o755);
    }

    console.log('✓ vue-tsgo installed successfully!');
    console.log(`\nRun 'vue-tsgo --version' to verify installation`);
  } catch (error) {
    console.error('✗ Installation failed:', error.message);
    console.error('\nManual installation:');
    console.error(`1. Download binary from: https://github.com/nonfx/golar/releases/tag/v${PACKAGE_VERSION}`);
    console.error(`2. Place in: ${BIN_DIR}`);
    console.error(`3. Rename to: ${BINARY_NAME}`);
    process.exit(1);
  }
}

install();
