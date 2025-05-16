import path from 'node:path';
import { applyPatches } from 'diff';
import type { Volume } from 'memfs';

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
        const fileName = resolveFilePath(
          patch.newFileName || patch.oldFileName,
        );

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
        const fileName = resolveFilePath(
          patch.newFileName || patch.oldFileName,
        );

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
        console.log('complete patching');
        if (err) {
          console.log('Failed with error:', err);
        }
        resolve(targetDir);
      },
    });
  });
}
