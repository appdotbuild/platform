export interface FileItem {
  name: string;
  path: string;
  additionalCount?: number;
}

export interface FileNode {
  type: 'file';
  additionalCount?: number;
}

export interface DirectoryNode {
  type: 'directory';
  children: Record<string, FileNode | DirectoryNode>;
}

export type TreeNode = FileNode | DirectoryNode;

const FILE_ICONS: Record<string, string> = {
  ts: '📘',
  tsx: '📘',
  js: '📄',
  jsx: '📄',
  json: '📋',
  md: '📝',
  css: '🎨',
  scss: '🎨',
  html: '🌐',
};

export const getFileIcon = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext ? FILE_ICONS[ext] || '📄' : '📄';
};

export const parseFilesFromMessage = (message: string): FileItem[] => {
  const files: FileItem[] = [];
  const lines = message.split('\n');

  for (const line of lines) {
    const fileMatch = line.match(/📝\s+(.+?)(?:\s+\(\+(\d+)\s+more\))?$/);
    if (fileMatch) {
      const fullPath = fileMatch[1];
      const additionalCount = fileMatch[2] ? parseInt(fileMatch[2]) : 0;

      files.push({
        name: fullPath.split('/').pop() || fullPath,
        path: fullPath,
        additionalCount: additionalCount > 0 ? additionalCount : undefined,
      });
    }
  }

  return files;
};

export const buildFileTree = (files: FileItem[]): Record<string, TreeNode> => {
  const tree: Record<string, TreeNode> = {};

  files.forEach((file) => {
    const parts = file.path.split('/');
    let current = tree;

    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        current[part] = {
          type: 'file',
          additionalCount: file.additionalCount,
        };
      } else {
        if (!current[part]) {
          current[part] = { type: 'directory', children: {} };
        }
        const dirNode = current[part] as DirectoryNode;
        current = dirNode.children;
      }
    });
  });

  return tree;
};

export const calculateTotalFiles = (files: FileItem[]): number => {
  return files.reduce((sum, file) => sum + 1 + (file.additionalCount || 0), 0);
}; 
