import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const version = process.argv[2];

if (!version) {
  console.error('No version passed.');
  process.exit(1);
}

const pkgPath = resolve(join(__dirname, '../tmp/package.json'));

console.log({ cwd: process.cwd() });
console.log({ pkgPath });

const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

pkg.version = version;

writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

console.log(`tmp/package.json updated to version ${version}`);
