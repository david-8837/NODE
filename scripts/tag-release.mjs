#!/usr/bin/env node
/**
 * scripts/tag-release.mjs
 *
 * Convenience script to bump package.json version, commit, and push — which
 * triggers the release.yml GitHub Actions pipeline automatically.
 *
 * Usage:
 *   node scripts/tag-release.mjs patch   # 1.1.15 → 1.1.16
 *   node scripts/tag-release.mjs minor   # 1.1.15 → 1.2.0
 *   node scripts/tag-release.mjs major   # 1.1.15 → 2.0.0
 *   node scripts/tag-release.mjs 1.2.3   # explicit version
 *
 * What it does:
 *   1. Bumps version in package.json (and package-lock.json via `npm version`)
 *   2. Commits with "chore(release): vX.Y.Z"
 *   3. Pushes the commit to `main`
 *
 * The release.yml workflow detects the new version, auto-creates the git tag,
 * runs all tests, builds firmware + installer, and publishes to GitHub Releases.
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, '..');

const bump = process.argv[2];
if (!bump) {
  console.error('Usage: node scripts/tag-release.mjs <patch|minor|major|x.y.z>');
  process.exit(1);
}

const run = (cmd) => execSync(cmd, { cwd: root, stdio: 'inherit' });
const json = (file) => JSON.parse(readFileSync(resolve(root, file), 'utf8'));

// Confirm working tree is clean before bumping.
try {
  execSync('git diff --quiet HEAD', { cwd: root });
} catch {
  console.error('Working tree has uncommitted changes. Commit or stash first.');
  process.exit(1);
}

const prevVersion = json('package.json').version;
console.log(`Current version: ${prevVersion}`);

// `npm version` bumps package.json + package-lock.json and commits.
// --no-git-tag-version: we let release.yml create the tag so it can wait
// for CI before tagging (prevents a bad tag on a broken build).
const isExplicit = /^\d+\.\d+\.\d+$/.test(bump);
const npmArg = isExplicit ? bump : bump; // patch | minor | major | explicit
run(`npm version ${npmArg} --no-git-tag-version`);

const newVersion = json('package.json').version;
console.log(`Bumped to: ${newVersion}`);

// Amend the files npm version touched (package.json + package-lock.json).
run(`git add package.json package-lock.json`);
run(`git commit -m "chore(release): v${newVersion}"`);
run(`git push origin main`);

console.log(`\n✅  Pushed v${newVersion} to main.`);
console.log(`   GitHub Actions will now run the release pipeline.`);
console.log(`   Track it at: https://github.com/david-8837/NODE/actions`);
