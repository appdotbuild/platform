import { useState } from 'react';
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
  AlertTriangle,
} from 'lucide-react';
import { JsonViewerModal } from './json-viewer-modal';
import {
  useLogMetadata,
  useLogsRefresh,
  usePrefetchIterations,
} from './logs-hooks';
import type { TraceLogMetadata, SingleIterationJsonData } from './logs-types';
import { StatusCard } from '@/components/shared/status-card';
import { countRuntimeErrors } from '@/components/apps/logs-utils';
import { VariantProps } from 'class-variance-authority';

type LogsSectionProps = {
  appId: string;
  appName?: string;
};

export function LogsSection({ appId, appName }: LogsSectionProps) {
  const [selectedIterationData, setSelectedIterationData] =
    useState<SingleIterationJsonData | null>(null);

  const {
    data: traceMetadata = [],
    isLoading: loading,
    error,
    isFetching: refreshing,
  } = useLogMetadata(appId);
  const { refreshMetadata } = useLogsRefresh();
  const { data: allIterations = [], isLoading: loadingIterations } =
    usePrefetchIterations(appId, traceMetadata);

  const handleViewIteration = (folderName: string) => {
    setSelectedIterationData(
      allIterations.find((i) => i.folderName === folderName) || null,
    );
  };

  const handleRefresh = () => {
    refreshMetadata();
  };

  const handleCloseModal = () => {
    setSelectedIterationData(null);
  };

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
              const data = allIterations.find(
                (i) => i.folderName === trace.traceId,
              );
              const errorCount = data ? countRuntimeErrors(data) : 0;
              const hasErrors = errorCount > 0;
              let status: VariantProps<typeof StatusCard>['variant'] =
                'neutral';
              if (data) {
                status = hasErrors ? 'error' : 'info';
              }

              return (
                <StatusCard
                  key={trace.traceId}
                  variant={status}
                  action={
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant={hasErrors ? 'destructive' : 'outline'}
                        size="sm"
                        onClick={() => handleViewIteration(trace.traceId)}
                        disabled={loadingIterations}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View JSON
                        {hasErrors && (
                          <AlertTriangle className="h-3 w-3 ml-1" />
                        )}
                      </Button>
                    </div>
                  }
                >
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
                      {trace.iterations[0]?.jsonFileCount || 0} JSON files
                    </div>
                  </div>
                </StatusCard>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* JSON Viewer Modal */}
      <JsonViewerModal
        isOpen={!!selectedIterationData}
        onClose={handleCloseModal}
        data={selectedIterationData}
      />
    </Card>
  );
}
