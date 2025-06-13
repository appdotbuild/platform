#!/usr/bin/env node

import { spawnSync } from 'child_process';

const requiredVersion = 22;
// @ts-ignore
const currentVersion = parseInt(process.version.substring(1).split('.')[0], 10);

if (currentVersion < requiredVersion) {
  console.error(
    `\x1b[31mError: Node.js ${requiredVersion}+ is required. You are using${process.version}.\x1b[0m`,
  );
  console.error(
    '\x1b[31mPlease upgrade your Node.js version and try again.\x1b[0m',
  );
  process.exit(1);
}

// If version check passes, spawn the actual CLI
const execPath = require.resolve('./cli.js');
const result = spawnSync(
  process.execPath,
  [execPath, ...process.argv.slice(2)],
  {
    stdio: 'inherit',
  },
);

if (result.error) {
  console.error('\x1b[31mFailed to start CLI:\x1b[0m', result.error.message);
  process.exit(1);
}

// Forward the exit code from the child process
if (typeof result.status === 'number') {
  process.exit(result.status);
} else if (result.signal) {
  process.kill(process.pid, result.signal);
} else {
  process.exit(1);
}
