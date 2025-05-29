#!/usr/bin/env node

// Simple Node.js version check using only features available in all Node versions
const requiredVersion = 22;
const currentVersion = parseInt(process.version.substring(1).split('.')[0], 10);

if (currentVersion < requiredVersion) {
  console.error(
    '\x1b[31mError: Node.js ' +
      requiredVersion +
      '+ is required. You are using v' +
      process.version +
      '.\x1b[0m',
  );
  console.error(
    '\x1b[31mPlease upgrade your Node.js version and try again.\x1b[0m',
  );
  process.exit(1);
}

// If version check passes, load the actual CLI
(async function () {
  try {
    await import('./cli.js');
  } catch (error) {
    console.error('\x1b[31mFailed to start CLI:\x1b[0m', error.message);
    process.exit(1);
  }
})();
