'use client';

import { useEffect, useState } from 'react';
import { getAppCode } from '../actions';
import CodeEditor from './code-editor';
import { FileTree } from './file-tree';

interface CodeViewerProps {
  appId: string;
}

export default function CodeViewer({ appId }: CodeViewerProps) {
  const [files, setFiles] = useState<any[]>([]);
  const [currentFile, setCurrentFile] = useState<{
    path: string;
    content: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCode = async () => {
      try {
        const { files, currentFile } = await getAppCode(appId);
        setFiles(files);
        setCurrentFile(currentFile);
      } catch (err) {
        console.error('Error loading code:', err);
        setError(err instanceof Error ? err.message : 'Failed to load code');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCode();
  }, [appId]);

  if (error) {
    return <div className="text-sm text-red-500">{error}</div>;
  }

  const handleFileSelect = (path: string, content: string) => {
    setCurrentFile({ path, content });
  };

  return (
    <div className="flex flex-1 min-h-0 overflow-x-hidden">
      <FileTree
        files={files}
        selectedFile={currentFile?.path ?? ''}
        onSelectFile={handleFileSelect}
      />
      <div className="flex-1 min-h-0 overflow-auto">
        <CodeEditor
          content={currentFile?.content ?? ''}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
