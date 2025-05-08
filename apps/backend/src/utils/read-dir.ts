import * as path from 'path';
import { Minimatch } from 'minimatch';
import { type Volume } from 'memfs';
import { type Dirent } from 'fs';

interface FileData {
  path: string;
  content: string;
}

const EXCLUDED_FILES_OR_DIRS = ['.git', 'unified_diff-*.patch'];

export function readDirectoryRecursive(
  dir: string,
  baseDir: string,
  volume: Volume,
): FileData[] {
  const result: FileData[] = [];

  function traverse(currentPath: string) {
    const items = volume.readdirSync(currentPath, {
      withFileTypes: true,
    }) as unknown as Dirent[];

    for (const item of items) {
      const fullPath = path.join(currentPath, item.name);

      if (
        EXCLUDED_FILES_OR_DIRS.some((pattern) =>
          new Minimatch(pattern).match(item.name),
        )
      ) {
        continue;
      }

      if (item.isDirectory()) {
        traverse(fullPath);
      } else if (item.isFile()) {
        const content = volume.readFileSync(fullPath, 'utf-8');
        result.push({
          path: path.relative(baseDir, fullPath),
          content: content.toString(),
        });
      }
    }
  }

  traverse(dir);

  return result;
}
