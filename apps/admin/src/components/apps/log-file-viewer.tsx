'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@appdotbuild/design';
import { Button } from '@appdotbuild/design';
import { Badge } from '@appdotbuild/design';
import { Skeleton } from '@appdotbuild/design';
import { Alert } from '@appdotbuild/design';
import { Download, FileText, Copy, Check, X } from 'lucide-react';
import { formatFileSize, getFileExtension, logsApi } from './logs-index';
import type { LogFileWithUrl } from './logs-types';

type LogFileViewerProps = {
  appId: string;
  folderId: string;
  file: LogFileWithUrl;
  onClose?: () => void;
};

export function LogFileViewer({
  appId,
  folderId,
  file,
  onClose,
}: LogFileViewerProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadFileContent = async () => {
    if (!file.presignedUrl) {
      try {
        setLoading(true);
        setError(null);
        const urlData = await logsApi.getFilePresignedUrl(
          appId,
          folderId,
          file.fileName,
        );
        const fileContent = await logsApi.downloadFileContent(urlData.readUrl);
        setContent(fileContent);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load file content',
        );
      } finally {
        setLoading(false);
      }
    } else {
      try {
        setLoading(true);
        setError(null);
        const fileContent = await logsApi.downloadFileContent(
          file.presignedUrl,
        );
        setContent(fileContent);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load file content',
        );
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadFileContent();
  }, [appId, folderId, file]);

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy content:', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLanguageFromExtension = (extension: string): string => {
    const languageMap: Record<string, string> = {
      js: 'javascript',
      ts: 'typescript',
      json: 'json',
      log: 'text',
      txt: 'text',
      md: 'markdown',
      yml: 'yaml',
      yaml: 'yaml',
      xml: 'xml',
      html: 'html',
      css: 'css',
      py: 'python',
      java: 'java',
      go: 'go',
      rs: 'rust',
      php: 'php',
      rb: 'ruby',
      sh: 'bash',
      sql: 'sql',
    };
    return languageMap[extension] || 'text';
  };

  const fileExtension = getFileExtension(file.fileName);
  const language = getLanguageFromExtension(fileExtension);

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle className="text-lg break-all">{file.fileName}</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {formatFileSize(file.size)}
            </Badge>
            {fileExtension && (
              <Badge variant="outline" className="text-xs uppercase">
                {fileExtension}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {content && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyContent}
                  disabled={loading}
                >
                  {copied ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  disabled={loading}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </>
            )}
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          Last modified: {new Date(file.lastModified).toLocaleString()}
        </div>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <div className="flex items-center gap-2">
              <X className="h-4 w-4" />
              <span>Error loading file: {error}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadFileContent}
              className="mt-2"
            >
              Retry
            </Button>
          </Alert>
        )}

        {content && !loading && !error && (
          <div className="relative">
            <pre className="bg-muted rounded-md p-4 overflow-auto max-h-96 text-sm font-mono">
              <code className={`language-${language}`}>{content}</code>
            </pre>
            {content.length > 10000 && (
              <div className="mt-2 text-sm text-muted-foreground">
                Large file ({content.length.toLocaleString()} characters).
                Consider downloading for better performance.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
