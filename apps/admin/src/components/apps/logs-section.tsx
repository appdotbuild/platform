import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@appdotbuild/design';
import { Button } from '@appdotbuild/design';
import { Alert } from '@appdotbuild/design';
import { Skeleton } from '@appdotbuild/design';
import { Badge } from '@appdotbuild/design';
import {
  FileText,
  RefreshCw,
  AlertCircle,
  Database,
  Eye,
  ChevronLeft,
  AlertTriangle,
} from 'lucide-react';
import { JsonViewerModal } from './json-viewer-modal';
import {
  useLogMetadata,
  useSingleIterationJson,
  useLogsRefresh,
  usePrefetchIterations,
} from './logs-hooks';
import type { TraceLogMetadata, SingleIterationJsonData } from './logs-types';
import { iterationHasErrors, countRuntimeErrors } from './logs-utils';

type LogsSectionProps = {
  appId: string;
  appName?: string;
};

export function LogsSection({ appId, appName }: LogsSectionProps) {
  // State for different views
  const [view, setView] = useState<'traces' | 'iterations' | 'json'>('traces');
  const [selectedTrace, setSelectedTrace] = useState<TraceLogMetadata | null>(
    null,
  );
  const [selectedIterationData, setSelectedIterationData] =
    useState<SingleIterationJsonData | null>(null);

  // Modal state
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [currentIterationQuery, setCurrentIterationQuery] = useState<{
    traceId: string;
    iteration: number;
  } | null>(null);

  // React-admin hooks
  const {
    data: traceMetadata = [],
    isLoading: loading,
    error,
    isFetching: refreshing,
  } = useLogMetadata(appId);

  const { data: modalIterationData, isLoading: modalLoading } =
    useSingleIterationJson(
      appId,
      currentIterationQuery?.traceId || null,
      currentIterationQuery?.iteration || null,
    );

  const { refreshMetadata } = useLogsRefresh();

  // Prefetch all iterations on mount - this enables showing error states
  // Pass the already-loaded metadata to avoid duplicate API calls
  const { data: allIterations = [] } = usePrefetchIterations(
    appId,
    traceMetadata,
  );

  // Effect to sync modal data with query result
  React.useEffect(() => {
    if (modalIterationData && showJsonModal) {
      setSelectedIterationData(modalIterationData);
    } else if (!showJsonModal) {
      setSelectedIterationData(null);
    }
  }, [modalIterationData, showJsonModal]);

  // Effect to sync legacy view data with query result
  React.useEffect(() => {
    if (modalIterationData && view === 'json' && !showJsonModal) {
      setSelectedIterationData(modalIterationData);
    }
  }, [modalIterationData, view, showJsonModal]);

  // Helper function to get iteration status
  const getIterationStatus = (traceId: string, iteration: number) => {
    const iterationId = `${appId}:${traceId}:${iteration}`;
    const iterationData = allIterations.find((item) => item.id === iterationId);

    if (!iterationData) {
      return {
        loading: false,
        error: null,
        hasError: false,
        hasRuntimeError: false,
      };
    }

    const hasRuntimeError = iterationHasErrors(iterationData.data);

    return {
      loading: false, // Data is already loaded from getList
      error: iterationData.error || null,
      hasError: !!iterationData.error,
      hasRuntimeError,
    };
  };

  // Helper function to check if a trace has any runtime errors
  const traceHasRuntimeErrors = (trace: TraceLogMetadata): boolean => {
    return trace.iterations.some((iteration) => {
      const status = getIterationStatus(trace.traceId, iteration.iteration);
      return status.hasRuntimeError;
    });
  };

  // Helper function to count runtime errors in a trace
  const countTraceRuntimeErrors = (trace: TraceLogMetadata): number => {
    return trace.iterations.reduce((count, iteration) => {
      const status = getIterationStatus(trace.traceId, iteration.iteration);
      return count + (status.hasRuntimeError ? 1 : 0);
    }, 0);
  };

  const handleRefresh = () => {
    refreshMetadata();
  };

  const handleViewTraceIterations = (trace: TraceLogMetadata) => {
    setSelectedTrace(trace);
    setView('iterations');
  };

  const handleViewIteration = async (traceId: string, iteration: number) => {
    // For the legacy view system, we can still trigger the query by setting the state
    // The data will be loaded by the useSingleIterationJson hook
    setCurrentIterationQuery({ traceId, iteration });
    // The selectedIterationData will be updated by the effect below
    setView('json');
  };

  const handleBackToTraces = () => {
    setView('traces');
    setSelectedTrace(null);
    setSelectedIterationData(null);
  };

  const handleBackToIterations = () => {
    setView('iterations');
    setSelectedIterationData(null);
  };

  // New handlers for modal-based UX
  const handleDirectJsonView = (
    trace: TraceLogMetadata,
    iteration: number = 1,
  ) => {
    setCurrentIterationQuery({ traceId: trace.traceId, iteration });
    setShowJsonModal(true);
  };

  const handleCloseModal = () => {
    setShowJsonModal(false);
    setCurrentIterationQuery(null);
  };

  // JSON viewer
  if (view === 'json' && selectedIterationData) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToIterations}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back to Iterations
                </Button>
                <div>
                  <CardTitle className="text-lg">
                    {selectedIterationData.iteration}
                    {getOrdinalSuffix(selectedIterationData.iteration)}{' '}
                    Iteration
                  </CardTitle>
                  <div className="text-sm text-muted-foreground font-mono">
                    {selectedIterationData.traceId} •{' '}
                    {selectedIterationData.totalFiles} JSON files
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Folder:</span>
                    <div className="font-mono text-xs break-all mt-1">
                      {selectedIterationData.folderName}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Timestamp:</span>
                    <div className="font-mono text-xs mt-1">
                      {selectedIterationData.timestamp}
                    </div>
                  </div>
                </div>
              </div>

              {/* JSON Files */}
              <div className="space-y-3">
                {Object.entries(selectedIterationData.jsonFiles)
                  .sort(([a], [b]) => {
                    const aNum = parseInt(a.split('.')[0] || '0', 10);
                    const bNum = parseInt(b.split('.')[0] || '0', 10);
                    return aNum - bNum;
                  })
                  .map(([fileName, content]) => (
                    <Card
                      key={fileName}
                      className="border-l-4 border-l-blue-500"
                    >
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="font-mono text-sm font-medium">
                            {fileName}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                JSON.stringify(content, null, 2),
                              );
                              alert('Copied to clipboard!');
                            }}
                          >
                            Copy JSON
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="py-3">
                        <pre className="bg-muted/50 rounded p-3 text-xs overflow-x-auto max-h-96 overflow-y-auto">
                          {JSON.stringify(content, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Iterations view
  if (view === 'iterations' && selectedTrace) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleBackToTraces}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to Traces
              </Button>
              <div>
                <CardTitle className="text-lg">Iterations</CardTitle>
                <div className="text-sm text-muted-foreground font-mono">
                  {selectedTrace.traceId} • {selectedTrace.totalIterations}{' '}
                  iterations
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {modalLoading && currentIterationQuery && (
            <Alert>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <div>Loading iteration data...</div>
            </Alert>
          )}

          <div className="space-y-3">
            {selectedTrace.iterations.map((iteration) => (
              <Card
                key={iteration.iteration}
                className="border-l-4 border-l-green-500"
              >
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium">
                        {iteration.ordinal} Iteration
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {iteration.jsonFileCount} JSON files • Timestamp:{' '}
                        {iteration.timestamp}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono break-all mt-1">
                        {iteration.folderName}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleViewIteration(
                          selectedTrace.traceId,
                          iteration.iteration,
                        )
                      }
                      disabled={modalLoading}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View JSON ({iteration.jsonFileCount})
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Main traces view
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <CardTitle className="text-lg">Application Logs</CardTitle>
          </div>
          {appName && (
            <div className="text-sm text-muted-foreground">
              Viewing logs for: {appName}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-9 w-20" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <CardTitle className="text-lg">Application Logs</CardTitle>
          </div>
          {appName && (
            <div className="text-sm text-muted-foreground">
              Viewing logs for: {appName}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Failed to load logs</div>
                <div className="text-sm mt-1">{errorMessage}</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
                />
                Retry
              </Button>
            </div>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              <CardTitle className="text-lg">Application Logs</CardTitle>
            </div>
            {appName && (
              <div className="text-sm text-muted-foreground mt-1">
                Viewing logs for: {appName}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {traceMetadata.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {traceMetadata.length} trace
                {traceMetadata.length !== 1 ? 's' : ''}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {traceMetadata.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">
              No trace logs available
            </h3>
            <p className="text-muted-foreground mb-4">
              No trace logs were found for this application. Logs will appear
              here once the application generates them.
            </p>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`}
              />
              Check Again
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {traceMetadata.map((trace: TraceLogMetadata) => {
              const hasErrors = traceHasRuntimeErrors(trace);
              const errorCount = countTraceRuntimeErrors(trace);

              return (
                <Card
                  key={trace.traceId}
                  className={`border-l-4 ${
                    hasErrors ? 'border-l-red-500' : 'border-l-blue-500'
                  }`}
                >
                  <CardHeader className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="text-sm font-medium font-mono break-all">
                            {trace.traceId}
                          </div>
                          {hasErrors && (
                            <Badge
                              variant="destructive"
                              className="text-xs flex-shrink-0"
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {errorCount} error{errorCount !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {trace.iterations.reduce(
                            (sum: number, iter: any) =>
                              sum + iter.jsonFileCount,
                            0,
                          )}{' '}
                          JSON files total
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {trace.totalIterations === 1
                          ? // Single iteration - direct JSON view
                            (() => {
                              const status = getIterationStatus(
                                trace.traceId,
                                1,
                              );
                              return (
                                <Button
                                  variant={
                                    status.hasRuntimeError || status.hasError
                                      ? 'destructive'
                                      : 'outline'
                                  }
                                  size="sm"
                                  onClick={() => handleDirectJsonView(trace, 1)}
                                  disabled={modalLoading}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View JSON (
                                  {trace.iterations[0]?.jsonFileCount || 0})
                                  {(status.hasRuntimeError ||
                                    status.hasError) && (
                                    <AlertTriangle className="h-3 w-3 ml-1" />
                                  )}
                                </Button>
                              );
                            })()
                          : // Multiple iterations - show ordinal buttons
                            trace.iterations
                              .sort(
                                (a: any, b: any) => a.iteration - b.iteration,
                              )
                              .slice(0, 3) // Show max 3 buttons to avoid overflow
                              .map((iteration: any) => {
                                const status = getIterationStatus(
                                  trace.traceId,
                                  iteration.iteration,
                                );
                                return (
                                  <Button
                                    key={iteration.iteration}
                                    variant={
                                      status.hasRuntimeError || status.hasError
                                        ? 'destructive'
                                        : 'outline'
                                    }
                                    size="sm"
                                    onClick={() =>
                                      handleDirectJsonView(
                                        trace,
                                        iteration.iteration,
                                      )
                                    }
                                    disabled={modalLoading}
                                    className="text-xs"
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    {getOrdinalSuffix(iteration.iteration)} (
                                    {iteration.jsonFileCount})
                                    {(status.hasRuntimeError ||
                                      status.hasError) && (
                                      <AlertTriangle className="h-3 w-3 ml-1" />
                                    )}
                                  </Button>
                                );
                              })}
                        {trace.totalIterations > 3 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewTraceIterations(trace)}
                            className="text-xs text-muted-foreground"
                          >
                            +{trace.totalIterations - 3} more
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* JSON Viewer Modal */}
      <JsonViewerModal
        isOpen={showJsonModal}
        onClose={handleCloseModal}
        data={selectedIterationData}
        loading={modalLoading}
      />
    </Card>
  );
}

// Helper function for ordinal suffixes
function getOrdinalSuffix(num: number): string {
  if (num >= 11 && num <= 13) {
    return 'th';
  }
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
}
