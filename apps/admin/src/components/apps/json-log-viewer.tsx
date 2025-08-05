import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@appdotbuild/design';
import { Button } from '@appdotbuild/design';
import { Badge } from '@appdotbuild/design';
import { Separator } from '@appdotbuild/design';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Clock,
  FileText,
} from 'lucide-react';
import type { AgentSnapshotMetadata } from '@appdotbuild/core';
import { toast } from 'sonner';

type JsonLogViewerProps = {
  traceData: AgentSnapshotMetadata;
  onClose?: () => void;
};

export function JsonLogViewer({ traceData, onClose }: JsonLogViewerProps) {
  const [expandedIterations, setExpandedIterations] = useState<Set<string>>(
    new Set(),
  );
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const toggleIteration = (folder: string) => {
    const newExpanded = new Set(expandedIterations);
    if (newExpanded.has(folder)) {
      newExpanded.delete(folder);
    } else {
      newExpanded.add(folder);
    }
    setExpandedIterations(newExpanded);
  };

  const toggleFile = (key: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedFiles(newExpanded);
  };

  const copyToClipboard = async (content: any, label: string) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(content, null, 2));
      toast.success(`${label} content copied to clipboard successfully`);
    } catch {
      toast.error('Failed to copy content to clipboard');
    }
  };

  const downloadJson = (content: any, fileName: string) => {
    const jsonString = JSON.stringify(content, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatJsonContent = (content: any): string => {
    return JSON.stringify(content, null, 2);
  };

  const getIterationLabel = (index: number): string => {
    const ordinals = ['1st', '2nd', '3rd'];
    const ordinal = ordinals[index] || `${index + 1}th`;
    return `${ordinal} iteration`;
  };

  const getTimestampFromFolder = (folder: string): string => {
    const match = folder.match(/_(\d+)$/);
    if (match) {
      // Convert timestamp to date
      const timestamp = parseInt(match[1] || '0');
      // Assuming timestamp is Unix timestamp in seconds
      const date = new Date(timestamp * 1000);
      return date.toLocaleString();
    }
    return 'Unknown time';
  };

  if (!traceData || traceData.iterations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            JSON Log Viewer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No log data available for this trace.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              JSON Log Viewer
            </CardTitle>
            {onClose && (
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium break-all">
              Trace ID: {traceData.traceId}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {traceData.iterations.length} iteration
                {traceData.iterations.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {traceData.iterations.map((iteration, index) => {
        const isExpanded = expandedIterations.has(iteration.folderName);
        const fileCount = iteration.jsonFileCount;

        return (
          <Card key={iteration.folderName}>
            <CardHeader
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleIteration(iteration.folderName)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <div>
                    <CardTitle className="text-base">
                      {getIterationLabel(index)}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {fileCount} JSON file{fileCount !== 1 ? 's' : ''}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {getTimestampFromFolder(iteration.folderName)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      void copyToClipboard(
                        iteration.jsonFileCount,
                        `${getIterationLabel(index)} logs`,
                      );
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadJson(
                        iteration.jsonFileCount,
                        `${iteration.folderName}_logs.json`,
                      );
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0">
                <Separator className="mb-4" />
                <div className="space-y-3">
                  {Object.entries(iteration.jsonFileCount)
                    .sort(([a], [b]) => {
                      // Sort numerically by filename
                      const aNum = parseInt(a.split('.')[0] || '0') || 0;
                      const bNum = parseInt(b.split('.')[0] || '0') || 0;
                      return aNum - bNum;
                    })
                    .map(([fileName, content]) => {
                      const fileKey = `${iteration.folderName}-${fileName}`;
                      const isFileExpanded = expandedFiles.has(fileKey);

                      return (
                        <Card
                          key={fileKey}
                          className="border-l-4 border-l-blue-500"
                        >
                          <CardHeader
                            className="cursor-pointer hover:bg-muted/25 transition-colors py-3"
                            onClick={() => toggleFile(fileKey)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {isFileExpanded ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                                  {fileName}
                                </code>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void copyToClipboard(content, fileName);
                                  }}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    downloadJson(content, fileName);
                                  }}
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>

                          {isFileExpanded && (
                            <CardContent className="pt-0">
                              <pre className="bg-slate-900 text-slate-100 p-4 rounded-md overflow-x-auto text-xs font-mono max-h-96 overflow-y-auto">
                                <code>{formatJsonContent(content)}</code>
                              </pre>
                            </CardContent>
                          )}
                        </Card>
                      );
                    })}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
