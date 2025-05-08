type ParsedDiff = {
  fileA: string;
  fileB: string;
  header: string[];
  hunks: string[];
};

export function parseGitDiff(diff: string): ParsedDiff[] {
  const lines = diff.split(/\r?\n/);
  const files: ParsedDiff[] = [];
  let currentFile: ParsedDiff | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line && line.startsWith('diff --git')) {
      if (currentFile) files.push(currentFile);

      const match = line.match(/^diff --git a\/(.+?) b\/(.+)/);
      currentFile = {
        fileA: match?.[1] || '',
        fileB: match?.[2] || '',
        header: [line],
        hunks: [],
      };
      continue;
    }

    if (line && line.startsWith('@@') && currentFile) {
      const hunkLines: string[] = [line];
      i++;

      // Collect all lines in this hunk
      while (
        i < lines.length &&
        !lines[i]?.startsWith('diff --git') &&
        !lines[i]?.startsWith('@@')
      ) {
        hunkLines.push(lines[i]!);
        i++;
      }

      currentFile.hunks.push(hunkLines.join('\n'));
      i--; // Rewind to re-process diff/hunk starter
      continue;
    }

    if (currentFile) {
      currentFile.header.push(line!);
    }
  }

  if (currentFile) {
    files.push(currentFile);
  }

  return files;
}
