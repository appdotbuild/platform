import * as path from 'path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { vol } from 'memfs';
import { Volume } from 'memfs/lib/volume';
import { createFsFromVolume } from 'memfs';

export async function copyDirToMemfs(realDirPath: string) {
  const virtualDir = `/app.build-${Date.now()}`;
  const volume = vol;

  volume.mkdirSync(virtualDir, { recursive: true });

  async function internalCopyDirToMemfs(
    realDirPath: string,
    memfsDirPath: string,
    volume: Volume,
  ) {
    const entries = await fs.readdir(realDirPath, { withFileTypes: true });

    for (const entry of entries) {
      const realEntryPath = path.join(realDirPath, entry.name);
      const memfsEntryPath = path.join(memfsDirPath, entry.name);

      if (entry.isDirectory()) {
        volume.mkdirSync(memfsEntryPath, { recursive: true });
        await internalCopyDirToMemfs(realEntryPath, memfsEntryPath, volume);
      } else if (entry.isFile()) {
        const content = await fs.readFile(realEntryPath);
        volume.writeFileSync(memfsEntryPath, content);
      }
    }
  }

  return internalCopyDirToMemfs(realDirPath, virtualDir, volume).then(() => ({
    volume: createFsFromVolume(volume),
    memfsVolume: volume,
    virtualDir,
  }));
}

export async function writeMemfsToTempDir(
  volume: Volume,
  memfsBasePath = '/',
): Promise<string> {
  const realTempDir = path.join(
    os.tmpdir(),
    `appdotbuild-template-${Date.now()}`,
  );
  await fs.mkdir(realTempDir, { recursive: true });

  const files = volume.toJSON();

  for (const [virtualPath, content] of Object.entries(files)) {
    if (!virtualPath.startsWith(memfsBasePath)) continue;

    const relative = path.relative(memfsBasePath, virtualPath);
    const realPath = path.join(realTempDir, relative);

    if (content === null) {
      await fs.mkdir(realPath, { recursive: true });
    } else {
      const dir = path.dirname(realPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(realPath, content as string | Buffer);
    }
  }

  return realTempDir;
}

export async function copyDirToTemp(realDirPath: string, tempDirPath: string) {
  const entries = await fs.readdir(realDirPath, { withFileTypes: true });

  await fs.mkdir(tempDirPath, { recursive: true });

  for (const entry of entries) {
    const realEntryPath = path.join(realDirPath, entry.name);
    const tempEntryPath = path.join(tempDirPath, entry.name);

    if (entry.isDirectory()) {
      await fs.mkdir(tempEntryPath, { recursive: true });
      await copyDirToTemp(realEntryPath, tempEntryPath);
    } else if (entry.isFile()) {
      const content = await fs.readFile(realEntryPath);
      await fs.writeFile(tempEntryPath, content);
    }
  }

  return tempDirPath;
}
