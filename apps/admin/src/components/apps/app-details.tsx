import { RecordField } from '@/components/admin/record-field';
import { IdCell } from '@/components/admin/id-cell';
import { Show } from '@/components/admin/show';
import { Card, CardHeader, CardTitle, CardContent } from '@appdotbuild/design';
import { Badge } from '@appdotbuild/design';
import { Separator } from '@appdotbuild/design';
import { Button } from '@appdotbuild/design';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@appdotbuild/design';
import { useRecordContext } from 'ra-core';
import { ExternalLink, Github, Database } from 'lucide-react';
import {
  createAppLink,
  createRepositoryLink,
  createKoyebServiceLink,
  createNeonProjectLink,
  createGrafanaLink,
} from './apps-utils';

export default function AppShow() {
  return (
    <Show>
      <TooltipProvider>
        <AppDetailsView />
      </TooltipProvider>
    </Show>
  );
}

function AppDetailsView() {
  const record = useRecordContext();

  if (!record) {
    return null;
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'deployed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      {/* App Overview Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <CardTitle className="text-lg sm:text-xl flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="break-all">
                  {record.name || record.appName}
                </span>
                {record.deployStatus && (
                  <Badge variant={getStatusBadgeVariant(record.deployStatus)}>
                    {record.deployStatus}
                  </Badge>
                )}
              </CardTitle>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                <span className="break-all">ID: {record.id}</span>
                <span className="hidden sm:inline">•</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help">
                      Created: {new Date(record.createdAt).toLocaleDateString()}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{new Date(record.createdAt).toLocaleString()}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              {createAppLink(record.appUrl) && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="w-full sm:w-auto"
                >
                  <a
                    href={createAppLink(record.appUrl)!}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View App
                  </a>
                </Button>
              )}
              {createRepositoryLink(record.repositoryUrl) && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="w-full sm:w-auto"
                >
                  <a
                    href={createRepositoryLink(record.repositoryUrl)!}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Github className="h-4 w-4 mr-2" />
                    Repository
                  </a>
                </Button>
              )}
              {createGrafanaLink(record.traceId, record.updatedAt) && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="w-full sm:w-auto"
                >
                  <a
                    href={createGrafanaLink(record.traceId, record.updatedAt)!}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Grafana Logs
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
        {/* General Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">General Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-4">
            <div className="space-y-2 sm:space-y-3">
              <div>
                <RecordField source="name" label="App Name" variant="inline" />
              </div>
              <Separator />
              <div>
                <div className="flex min-w-50 opacity-75 text-xs">Owner ID</div>
                <div className="flex-1">
                  <IdCell source="ownerId" label="Owner ID" />
                </div>
              </div>
              <Separator />
              <div>
                <div className="flex min-w-50 opacity-75 text-xs">Trace ID</div>
                <div className="flex-1">
                  <IdCell source="traceId" label="Trace ID" />
                </div>
              </div>
              <Separator />
              <div>
                <RecordField
                  source="clientSource"
                  label="Client Source"
                  variant="inline"
                />
              </div>
              <Separator />
              <div>
                <RecordField
                  source="techStack"
                  label="Tech Stack"
                  variant="inline"
                />
              </div>
              <Separator />
              <div>
                <RecordField
                  source="createdAt"
                  label="Created At"
                  variant="inline"
                />
              </div>
              <Separator />
              <div>
                <RecordField
                  source="updatedAt"
                  label="Updated At"
                  variant="inline"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Development & Deployment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="h-5 w-5" />
              Development & Deployment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-4">
            <div className="space-y-2 sm:space-y-3">
              <div>
                <RecordField
                  source="deployStatus"
                  label="Deploy Status"
                  variant="inline"
                />
              </div>
              <Separator />
              <div>
                <RecordField
                  source="githubUsername"
                  label="GitHub Username"
                  variant="inline"
                />
              </div>
              <Separator />
              <div>
                <RecordField
                  source="appName"
                  label="App Name (Internal)"
                  variant="inline"
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <RecordField
                  source="repositoryUrl"
                  label="Repository URL"
                  variant="inline"
                />
                {createRepositoryLink(record.repositoryUrl) && (
                  <Button variant="ghost" size="sm" asChild>
                    <a
                      href={createRepositoryLink(record.repositoryUrl)!}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <RecordField source="appUrl" label="App URL" variant="inline" />
                {createAppLink(record.appUrl) && (
                  <Button variant="ghost" size="sm" asChild>
                    <a
                      href={createAppLink(record.appUrl)!}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <RecordField
                  source="koyebServiceId"
                  label="Koyeb Service ID"
                  variant="inline"
                />
                {createKoyebServiceLink(record.koyebServiceId) && (
                  <Button variant="ghost" size="sm" asChild>
                    <a
                      href={createKoyebServiceLink(record.koyebServiceId)!}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <RecordField
                  source="neonProjectId"
                  label="Neon Project ID"
                  variant="inline"
                />
                {createNeonProjectLink(record.neonProjectId) && (
                  <Button variant="ghost" size="sm" asChild>
                    <a
                      href={createNeonProjectLink(record.neonProjectId)!}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
