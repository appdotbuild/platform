import path from 'node:path';
import { applyPatches } from 'diff';
import type { Volume } from 'memfs';
import { logger } from '../logger';

export async function applyDiff(
  diffPath: string,
  targetDir: string,
  volume: Volume,
): Promise<string> {
  const diff = volume.readFileSync(diffPath, 'utf8');
  const resolveFilePath = (fileName: string) =>
    path.join(targetDir, fileName.replace('a/', '').replace('b/', ''));

  return new Promise((resolve) => {
    applyPatches(diff.toString(), {
      loadFile: (patch, callback) => {
        const isNewFile = patch.oldFileName === '/dev/null';
        const patchFileName = patch.newFileName || patch.oldFileName;

        if (!patchFileName) {
          logger.info('[loading] No file name: %s', patch);
          callback(undefined, '');
          return;
        }

        const fileName = resolveFilePath(patchFileName);

        if (isNewFile) {
          callback(undefined, '');
          return;
        }

        try {
          const fileContents = volume.readFileSync(fileName).toString();
          callback(undefined, fileContents);
        } catch (e) {
          callback(`No such file: ${fileName}`, '');
        }
      },
      patched: (patch, patchedContent, callback) => {
        const isDeleted = patch.newFileName === '/dev/null';

        const patchFileName = patch.newFileName || patch.oldFileName;

        if (!patchFileName) {
          logger.info('[patched] No file name: %s', patch);
          callback(undefined);
          return;
        }

        const fileName = resolveFilePath(patchFileName);

        if (isDeleted) {
          volume.unlinkSync(resolveFilePath(patch.oldFileName));
          return callback(undefined);
        }

        if (patchedContent === false) {
          callback(`Failed to apply patch to ${fileName}`);
          return;
        }

        volume.mkdirSync(path.dirname(fileName), { recursive: true });
        volume.writeFileSync(fileName, patchedContent);
        callback(undefined);
      },
      complete: (err) => {
        logger.info('complete patching');
        if (err) {
          logger.error('Failed with error:', err);
        }
        resolve(targetDir);
      },
    });
  });
}
