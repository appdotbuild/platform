import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Alert,
} from '@appdotbuild/design';
import { Button } from '@appdotbuild/design';
import { Badge } from '@appdotbuild/design';
import { Input } from '@appdotbuild/design';
import {
  Copy,
  Download,
  X,
  FileText,
  Maximize2,
  Clock,
  Search,
  AlertTriangle,
} from 'lucide-react';
import { JsonViewer } from '@textea/json-viewer';
import { cn } from '@appdotbuild/design';
import { toast } from 'sonner';
import type { SingleIterationJsonData } from '@/components/apps/logs-types';
import {
  iterationHasErrors,
  countRuntimeErrors,
} from '@/components/apps/logs-utils';

type JsonViewerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  data: SingleIterationJsonData | null;
  loading?: boolean;
};

export function JsonViewerModal({
  isOpen,
  onClose,
  data,
  loading = false,
}: JsonViewerModalProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Check for runtime errors
  const hasRuntimeErrors = data ? iterationHasErrors(data) : false;
  const runtimeErrorCount = data ? countRuntimeErrors(data) : 0;

  // Get sorted file entries
  const sortedFiles = data?.jsonFiles
    ? Object.entries(data.jsonFiles).sort(([a], [b]) => {
        const aNum = parseInt(a.split('.')[0] || '0', 10);
        const bNum = parseInt(b.split('.')[0] || '0', 10);
        return aNum - bNum;
      })
    : [];

  // Create unified JSON object with all files
  const unifiedJson = data?.jsonFiles
    ? Object.entries(data.jsonFiles)
        .sort(([a], [b]) => {
          const aNum = parseInt(a.split('.')[0] || '0', 10);
          const bNum = parseInt(b.split('.')[0] || '0', 10);
          return aNum - bNum;
        })
        .reduce((acc, [fileName, content]) => {
          acc[fileName.replace('.json', '')] = content;
          return acc;
        }, {} as Record<string, any>)
    : {};

  // Filter JSON based on search term
  const filteredJson = searchTerm
    ? filterJsonBySearch(unifiedJson, searchTerm.toLowerCase())
    : unifiedJson;

  // Search function that recursively filters JSON
  function filterJsonBySearch(obj: any, searchTerm: string): any {
    if (typeof obj === 'string') {
      return obj.toLowerCase().includes(searchTerm) ? obj : null;
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return obj.toString().toLowerCase().includes(searchTerm) ? obj : null;
    }

    if (Array.isArray(obj)) {
      const filtered = obj
        .map((item) => filterJsonBySearch(item, searchTerm))
        .filter((item) => item !== null);
      return filtered.length > 0 ? filtered : null;
    }

    if (obj && typeof obj === 'object') {
      const filtered: any = {};
      let hasMatches = false;

      for (const [key, value] of Object.entries(obj)) {
        // Check if key matches
        const keyMatches = key.toLowerCase().includes(searchTerm);
        // Check if value matches
        const filteredValue = filterJsonBySearch(value, searchTerm);

        if (keyMatches || filteredValue !== null) {
          filtered[key] = keyMatches ? value : filteredValue;
          hasMatches = true;
        }
      }

      return hasMatches ? filtered : null;
    }

    return null;
  }

  const handleCopyAll = async () => {
    if (!data || !unifiedJson) return;

    try {
      await navigator.clipboard.writeText(JSON.stringify(unifiedJson, null, 2));
      toast.success('JSON copied to clipboard');
    } catch (error) {
      console.error('Failed to copy unified JSON:', error);
      toast.error('Failed to copy JSON');
    }
  };

  const handleDownload = (fileName: string, content: any) => {
    const blob = new Blob([JSON.stringify(content, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getOrdinalSuffix = (num: number): string => {
    if (num >= 11 && num <= 13) return 'th';
    switch (num % 10) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
  };

  if (!data && !loading) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        showCloseButton={false}
        className={`${
          fullscreen
            ? '!max-w-[98vw] !h-[98vh] !w-[98vw]'
            : '!max-w-[90vw] !w-[90vw] sm:!w-[85vw] md:!w-[80vw] lg:!w-[75vw] xl:!w-[70vw] !h-[90vh]'
        } flex flex-col p-3 sm:p-6`}
        aria-describedby="json-viewer-description"
      >
        <DialogHeader className="flex-shrink-0 pb-2 sm:pb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base sm:text-lg font-semibold mb-1 sm:mb-2">
                {data
                  ? `${data.iteration}${getOrdinalSuffix(
                      data.iteration,
                    )} Iteration`
                  : 'Loading...'}
              </DialogTitle>
              <DialogDescription id="json-viewer-description">
                {data && (
                  <>
                    <span className="font-mono text-xs break-all mb-1 sm:mb-2 text-muted-foreground block">
                      {data.traceId}
                    </span>
                    <span className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {data.totalFiles} JSON files
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span className="truncate">{data.timestamp}</span>
                      </span>
                    </span>
                  </>
                )}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 ml-2 sm:ml-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFullscreen(!fullscreen)}
                className="p-1 sm:p-2"
              >
                <Maximize2 className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="p-1 sm:p-2"
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">
                Loading JSON data...
              </p>
            </div>
          </div>
        ) : data && Object.keys(unifiedJson).length > 0 ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Runtime Error Alert */}
            {hasRuntimeErrors && (
              <div className="flex-shrink-0 mb-3">
                <Alert
                  variant="destructive"
                  className="border-red-500 bg-red-50 dark:bg-red-950/30"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <div className="flex-1">
                    <div className="font-medium">Runtime Errors Detected</div>
                    <div className="text-sm mt-1">
                      Found {runtimeErrorCount} JSON file
                      {runtimeErrorCount !== 1 ? 's' : ''} containing
                      MessageKind.RUNTIME_ERROR. These indicate generation
                      errors in the agent process.
                    </div>
                  </div>
                </Alert>
              </div>
            )}

            {/* Actions Bar */}
            <div className="flex flex-col gap-2 py-2 px-1 border-b flex-shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="secondary" className="text-xs flex-shrink-0">
                    {sortedFiles.length} files unified
                  </Badge>
                  {hasRuntimeErrors && (
                    <Badge
                      variant="destructive"
                      className="text-xs flex-shrink-0"
                    >
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {runtimeErrorCount} error
                      {runtimeErrorCount !== 1 ? 's' : ''}
                    </Badge>
                  )}
                  {data.folderName && (
                    <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px] sm:max-w-xs">
                      {data.folderName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyAll}
                    className="text-xs"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Copy All</span>
                    <span className="sm:hidden">Copy</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleDownload(
                        `${data.traceId}_iteration_${data.iteration}_unified.json`,
                        unifiedJson,
                      )
                    }
                    className="text-xs"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Download</span>
                    <span className="sm:hidden">Save</span>
                  </Button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    placeholder="Search keys and values..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 text-xs h-8"
                  />
                </div>
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchTerm('')}
                    className="text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Unified JSON View */}
            <div className="flex-1 min-h-0 border rounded-md p-2 sm:p-4 bg-muted/20 overflow-auto mt-2">
              {Object.keys(filteredJson || {}).length > 0 ? (
                <JsonViewer
                  value={filteredJson}
                  theme="dark"
                  displayDataTypes={false}
                  displaySize={false}
                  enableClipboard={true}
                  defaultInspectDepth={searchTerm ? 10 : 2}
                  rootName={
                    searchTerm
                      ? `search: "${searchTerm}"`
                      : `iteration_${data.iteration}`
                  }
                  className={cn(
                    'bg-transparent font-mono',
                    fullscreen ? 'text-sm' : 'text-xs',
                  )}
                  groupArraysAfterLength={20}
                  quotesOnKeys={false}
                />
              ) : searchTerm ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <div className="text-center">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      No results found for "{searchTerm}"
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">
                No JSON files found
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
