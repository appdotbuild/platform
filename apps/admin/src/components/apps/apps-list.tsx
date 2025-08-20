import { DataTable } from '@/components/admin/data-table';
import { List } from '@/components/admin/list';
import { IdCell } from '@/components/admin/id-cell';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@appdotbuild/design';
import { HashAvatar } from '@appdotbuild/design';
import { Badge } from '@appdotbuild/design';
import type { VariantProps } from 'class-variance-authority';
import { Button } from '@appdotbuild/design';
import { ExternalLink, FileText, Eye } from 'lucide-react';
import { format } from 'timeago.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@appdotbuild/design';
import ReactJson from 'react-json-view';
import { useTheme } from '@/components/admin/theme-provider';
import { ShowButton } from '@/components/admin/show-button';
import { useRecordContext, useListContext } from 'ra-core';
import {
  DeployStatus,
  DeployStatusType,
} from '@appdotbuild/core/agent-message';
import { TextInput, ToggleFilterButton, FilterBar } from '@/components/admin';
import { AppStatusFilter } from '@/components/apps/app-status-filter';

import { TemplateId } from '@appdotbuild/core/types/api';
import { stackClientApp } from '@/stack';

// Wrapper component that can access list context
function AppListContent() {
  const { isPending, perPage } = useListContext();

  return (
    <DataTable
      rowClick={() => {
        return false;
      }}
      rowClassName={(record) => {
        const deletedAt = record?.deletedAt;
        if (deletedAt) {
          return 'cursor-default opacity-60 bg-red-50/50 dark:bg-red-950/20';
        }
        return 'cursor-default';
      }}
      className="[&_td]:py-4 [&_th]:py-4"
      isLoading={isPending}
      skeletonRows={perPage}
    >
      <DataTable.Col source="ownerId" field={OwnerIdCell} />
      <DataTable.Col source="name" />
      <DataTable.Col
        label="Deployment"
        source="deployStatus"
        field={StatusCell}
      />
      <DataTable.Col
        label="Source"
        source="clientSource"
        field={ClientSourceCell}
      />
      <DataTable.Col
        label="Repository URL"
        source="repositoryUrl"
        field={RepositoryUrlCell}
      />
      <DataTable.Col
        label="Tech Stack"
        source="techStack"
        field={TechStackCell}
      />
      <DataTable.Col
        label="Created At"
        source="createdAt"
        field={CreatedAtCell}
      />
      <DataTable.Col
        label="Updated At"
        source="updatedAt"
        field={UpdatedAtCell}
      />
      <DataTable.Col
        label="Deleted At"
        source="deletedAt"
        field={DeletedAtCell}
      />
      <DataTable.Col
        label="Trace ID"
        source="traceId"
        field={(props) => <IdCell {...props} label="Trace ID" maxLength={20} />}
      />
      <DataTable.Col label="Raw JSON" field={RawJsonCell} />
      <DataTable.Col label="Actions" field={ActionsCell} />
    </DataTable>
  );
}

function MyAppsFilter() {
  const user = stackClientApp.useUser({ or: 'redirect' });

  return <ToggleFilterButton label="My Apps" value={{ ownerId: user.id }} />;
}

function AppStatusFilterWrapper() {
  return <AppStatusFilter />;
}

const appsFilters = [
  <FilterBar
    key="filter-bar"
    filterLabels={{
      q: 'Search',
      ownerId: 'My Apps',
      showDeleted: 'Show Deleted',
      appStatus: 'Status',
    }}
  >
    <div className="flex-1 min-w-0">
      <TextInput
        source="q"
        placeholder="Search apps by owner, name, or trace ID..."
        label="Search"
      />
    </div>
    <div className="flex items-end gap-3 flex-shrink-0 pb-1">
      <MyAppsFilter />
      <AppStatusFilterWrapper />
    </div>
  </FilterBar>,
];

export default function AppList() {
  return (
    <List filters={appsFilters} sort={{ field: 'createdAt', order: 'DESC' }}>
      <AppListContent />
    </List>
  );
}

function OwnerIdCell({ source }: { source: string }) {
  const record = useRecordContext();
  if (!record) return null;

  const ownerId = record[source];

  return (
    <div className="flex justify-center">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <HashAvatar hash={ownerId} />
          </TooltipTrigger>
          <TooltipContent>
            <p>{ownerId}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

function StatusCell({ source }: { source: string }) {
  const record = useRecordContext();
  if (!record) return null;

  const deployStatus = record[source] as DeployStatusType;
  const appUrl = record.appUrl as string;
  const deletedAt = record.deletedAt as string | null;

  // Show deleted status if app is deleted
  if (deletedAt) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="destructive">Deleted</Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>App deleted on {new Date(deletedAt).toLocaleDateString()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  switch (deployStatus) {
    case DeployStatus.DEPLOYED:
      return (
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="default">Deployed</Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Deployed</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {appUrl && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={appUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Open deployed app</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      );
    case DeployStatus.DEPLOYING:
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="secondary">Deploying</Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Deployment in progress</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    case DeployStatus.FAILED:
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="destructive">Failed</Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Deployment failed</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    case DeployStatus.STOPPING:
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="secondary">Stopping</Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Deployment is stopping</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    case DeployStatus.PENDING:
    default:
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline">Pending</Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Deployment pending</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
  }
}

function CreatedAtCell({ source }: { source: string }) {
  const record = useRecordContext();
  if (!record) return null;

  const date = record[source] as string;
  return <span>{format(date)}</span>;
}

function UpdatedAtCell({ source }: { source: string }) {
  const record = useRecordContext();
  if (!record) return null;

  const date = record[source] as string;
  return <span>{format(date)}</span>;
}

function DeletedAtCell({ source }: { source: string }) {
  const record = useRecordContext();
  if (!record) return null;

  const date = record[source] as string | null;
  if (!date) return <span>-</span>;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <span className="text-destructive">{format(date)}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Deleted on {new Date(date).toLocaleString()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ClientSourceCell({ source }: { source: string }) {
  const record = useRecordContext();
  if (!record) return null;

  const clientSource = record[source] as string;

  if (!clientSource) return <span>-</span>;

  const isCLI = clientSource.toLowerCase() === 'cli';
  const isWEB = clientSource.toLowerCase() === 'web';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge
            variant={isCLI ? 'secondary' : isWEB ? 'default' : 'outline'}
            className="capitalize"
          >
            {clientSource.toLowerCase()}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Client: {clientSource}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function RepositoryUrlCell({ source }: { source: string }) {
  const record = useRecordContext();
  if (!record) return null;

  const repositoryUrl = record[source] as string;

  if (!repositoryUrl) return <span>-</span>;

  const truncatedUrl =
    repositoryUrl.length > 25
      ? `${repositoryUrl.substring(0, 25)}...`
      : repositoryUrl;

  return (
    <a
      href={repositoryUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="underline cursor-pointer"
    >
      {truncatedUrl}
    </a>
  );
}

function RawJsonCell() {
  const record = useRecordContext();
  const { theme } = useTheme();
  if (!record) return null;

  // Determine if we're in dark mode
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <Dialog>
      <DialogTrigger
        asChild
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <FileText className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="min-w-[90vw] max-h-[90vh] w-full">
        <DialogHeader>
          <DialogTitle>Raw JSON Data</DialogTitle>
        </DialogHeader>
        <div
          className={`rounded-md p-4 overflow-auto max-h-[70vh] border ${
            isDark ? 'bg-gray-900' : 'bg-white'
          }`}
        >
          <ReactJson
            src={record}
            theme={isDark ? 'monokai' : 'rjv-default'}
            style={{ backgroundColor: 'transparent' }}
            displayDataTypes={false}
            displayObjectSize={true}
            enableClipboard={true}
            name={null}
            collapsed={2}
            collapseStringsAfterLength={80}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TechStackCell({ source }: { source: string }) {
  const record = useRecordContext();
  if (!record) return null;

  const techStack = record[source] as TemplateId;

  if (!techStack) return <span>-</span>;

  const techStackMap: Record<
    TemplateId,
    { label: string; variant: VariantProps<typeof Badge>['variant'] }
  > = {
    trpc_agent: {
      label: 'tRPC',
      variant: 'default',
    },
    nicegui_agent: {
      label: 'NiceGUI',
      variant: 'secondary',
    },
    laravel_agent: {
      label: 'Laravel',
      variant: 'outline',
    },
  };

  const techStackVariant = techStackMap[techStack].variant;
  const techStackLabel = techStackMap[techStack].label;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge variant={techStackVariant}>{techStackLabel}</Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Tech Stack: {techStackLabel}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ActionsCell() {
  return <ShowButton />;
}
