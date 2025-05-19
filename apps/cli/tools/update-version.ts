import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const version = process.argv[2];

if (!version) {
  console.error('No version passed.');
  process.exit(1);
}

const pkgPath = resolve('./tmp/package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

pkg.version = version;

writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

console.log(`tmp/package.json updated to version ${version}`);
