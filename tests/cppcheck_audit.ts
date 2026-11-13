/**
 * Runs the real Cppcheck analyzer against the firmware sources used in this repo.
 * CI installs Cppcheck explicitly. Developer machines without the optional binary
 * get an honest skip rather than a regex-based substitute or a false pass claim.
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';

const rootPath = process.cwd();
const cppcheck = process.env.CPPCHECK_BIN || 'cppcheck';
const firmwareFiles = [
  'firmware/arduino_firmware.ino',
  'qmk_firmware/grid_macro_1/config.h',
  'qmk_firmware/grid_macro_1/grid_macro_1.h',
  'qmk_firmware/grid_macro_1/keymaps/default/keymap.c',
  'qmk_firmware/grid_macro_1/keymaps/via/keymap.c',
].map((file) => path.join(rootPath, file));

const version = spawnSync(cppcheck, ['--version'], {
  cwd: rootPath,
  encoding: 'utf8',
});

if ((version.error as NodeJS.ErrnoException | undefined)?.code === 'ENOENT') {
  console.warn('SKIP: Cppcheck is not installed; no firmware static analysis was run.');
  console.warn('Install Cppcheck or set CPPCHECK_BIN to its executable to enable this check.');
} else if (version.error) {
  throw version.error;
} else if (version.status !== 0) {
  process.stderr.write(version.stderr || version.stdout);
  process.exitCode = version.status ?? 1;
} else {
  console.log(`Running ${version.stdout.trim()} on Arduino and QMK firmware sources`);
  // Newer Cppcheck versions otherwise stop at their normal branch limit and
  // return a failing informational diagnostic with --error-exitcode. Older
  // CI versions do not support this option.
  const help = spawnSync(cppcheck, ['--help'], { cwd: rootPath, encoding: 'utf8' });
  const exhaustive = help.status === 0 && help.stdout.includes('--check-level=')
    ? ['--check-level=exhaustive']
    : [];
  const result = spawnSync(
    cppcheck,
    [
      '--enable=warning,style,performance,portability',
      ...exhaustive,
      '--error-exitcode=1',
      '--inline-suppr',
      '--suppress=missingInclude',
      '--suppress=missingIncludeSystem',
      '--language=c++',
      '--std=c++11',
      ...firmwareFiles,
    ],
    { cwd: rootPath, encoding: 'utf8' }
  );

  if (result.error) throw result.error;
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) process.exitCode = result.status ?? 1;
}
