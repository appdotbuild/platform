'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@appdotbuild/design';
import { Button } from '@appdotbuild/design';
import { Badge } from '@appdotbuild/design';
import { Skeleton } from '@appdotbuild/design';
import { Alert } from '@appdotbuild/design';
import { Separator } from '@appdotbuild/design';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FileText,
  Download,
  Eye,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { logsApi, formatFileSize, formatTimestamp } from './logs-index';
import { LogFileViewer } from './log-file-viewer';
import type { LogFolder, LogFileWithUrl } from './logs-types';

type LogFolderListProps = {
  appId: string;
  folders: LogFolder[];
  onRefresh?: () => void;
  refreshing?: boolean;
};

type ExpandedFolder = {
  folderId: string;
  files: LogFileWithUrl[];
  loading: boolean;
  error: string | null;
};

export function LogFolderList({
  appId,
  folders,
  onRefresh,
  refreshing,
}: LogFolderListProps) {
  const [expandedFolders, setExpandedFolders] = useState<
    Record<string, ExpandedFolder>
  >({});
  const [selectedFile, setSelectedFile] = useState<{
    appId: string;
    folderId: string;
    file: LogFileWithUrl;
  } | null>(null);

  const toggleFolder = async (folder: LogFolder) => {
    const folderId = folder.folderName;

    if (expandedFolders[folderId]) {
      // Collapse folder
      const newExpanded = { ...expandedFolders };
      delete newExpanded[folderId];
      setExpandedFolders(newExpanded);
    } else {
      // Expand folder and load files
      setExpandedFolders((prev) => ({
        ...prev,
        [folderId]: { folderId, files: [], loading: true, error: null },
      }));

      try {
        const files = await logsApi.getFilesWithUrls(appId, folderId);
        setExpandedFolders((prev) => ({
          ...prev,
          [folderId]: { folderId, files, loading: false, error: null },
        }));
      } catch (error) {
        setExpandedFolders((prev) => ({
          ...prev,
          [folderId]: {
            folderId,
            files: [],
            loading: false,
            error:
              error instanceof Error ? error.message : 'Failed to load files',
          },
        }));
      }
    }
  };

  const retryLoadFolder = async (folder: LogFolder) => {
    const folderId = folder.folderName;
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: {
        folderId,
        files: prev[folderId]?.files || [],
        loading: true,
        error: null,
      },
    }));

    try {
      const files = await logsApi.getFilesWithUrls(appId, folderId);
      setExpandedFolders((prev) => ({
        ...prev,
        [folderId]: { folderId, files, loading: false, error: null },
      }));
    } catch (error) {
      setExpandedFolders((prev) => ({
        ...prev,
        [folderId]: {
          folderId,
          files: [],
          loading: false,
          error:
            error instanceof Error ? error.message : 'Failed to load files',
        },
      }));
    }
  };

  const handleFileView = (folderId: string, file: LogFileWithUrl) => {
    setSelectedFile({ appId, folderId, file });
  };

  const handleFileDownload = async (folderId: string, file: LogFileWithUrl) => {
    try {
      let presignedUrl = file.presignedUrl;

      if (!presignedUrl) {
        const urlData = await logsApi.getFilePresignedUrl(
          appId,
          folderId,
          file.fileName,
        );
        presignedUrl = urlData.readUrl;
      }

      const content = await logsApi.downloadFileContent(presignedUrl);
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  };

  if (selectedFile) {
    return (
      <LogFileViewer
        appId={selectedFile.appId}
        folderId={selectedFile.folderId}
        file={selectedFile.file}
        onClose={() => setSelectedFile(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Log Folders</h3>
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        )}
      </div>

      {folders.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No log folders found for this application.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {folders.map((folder) => {
            const expanded = expandedFolders[folder.folderName];
            const isExpanded = !!expanded;

            return (
              <Card key={folder.folderName}>
                <CardHeader className="pb-3">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleFolder(folder)}
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <Folder className="h-4 w-4 text-blue-500" />
                      <CardTitle className="text-base">
                        {folder.folderName}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {formatTimestamp(folder.timestamp)}
                      </Badge>
                      <Badge variant="secondary" className="text-xs font-mono">
                        {folder.traceId.slice(0, 8)}...
                      </Badge>
                    </div>
                  </div>
                  {folder.lastModified && (
                    <div className="text-sm text-muted-foreground ml-6">
                      Last modified: {formatTimestamp(folder.lastModified)}
                    </div>
                  )}
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    <Separator className="mb-4" />

                    {expanded.loading && (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    )}

                    {expanded.error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <div className="flex items-center justify-between">
                          <span>Error loading files: {expanded.error}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => retryLoadFolder(folder)}
                          >
                            Retry
                          </Button>
                        </div>
                      </Alert>
                    )}

                    {expanded.files.length === 0 &&
                      !expanded.loading &&
                      !expanded.error && (
                        <div className="text-center text-muted-foreground py-4">
                          <FileText className="h-6 w-6 mx-auto mb-2 opacity-50" />
                          <p>No files found in this folder.</p>
                        </div>
                      )}

                    {expanded.files.length > 0 && !expanded.loading && (
                      <div className="space-y-2">
                        {expanded.files.map((file) => (
                          <div
                            key={file.key}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="font-medium truncate">
                                  {file.fileName}
                                </div>
                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                  <span>{formatFileSize(file.size)}</span>
                                  <span>•</span>
                                  <span>
                                    {formatTimestamp(file.lastModified)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleFileView(folder.folderName, file)
                                }
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleFileDownload(folder.folderName, file)
                                }
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
