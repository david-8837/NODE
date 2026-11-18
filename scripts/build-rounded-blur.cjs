'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
if (process.platform !== 'win32') {
  console.error('The Windows rounded blur must be compiled on Windows with Rust installed.');
  process.exit(1);
}
const manifest = path.join(root, 'native', 'rounded-blur', 'Cargo.toml');
const args = ['build', '--release', '--locked', '--features', 'ffi', '--manifest-path', manifest];
let result;
try {
  result = spawnSync('cargo', args, { cwd: root, stdio: 'inherit' });
} catch (error) {
  console.warn('Rust cargo toolchain is not available; skipping optional rounded-blur native DLL compilation.');
  process.exit(0);
}
if (result.error || result.status !== 0) {
  console.warn('Could not compile optional rounded blur DLL (cargo not found or exited non-zero); continuing without haze.dll.');
  process.exit(0);
}
const binary = path.join(root, 'native', 'rounded-blur', 'target', 'release', 'haze.dll');
const dest = path.join(root, 'electron', 'native', 'haze.dll');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(binary, dest);
console.log('Built the Windows rounded blur:', dest);
