import { DataTable } from '@/components/admin/data-table';
import { List } from '@/components/admin/list';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@appdotbuild/design';
import { HashAvatar } from '@appdotbuild/design';
import { Badge } from '@appdotbuild/design';
import { Button } from '@appdotbuild/design';
import { Copy, ExternalLink, FileText } from 'lucide-react';
import { toast } from 'sonner';
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
import { stackClientApp } from '@/stack';

// Wrapper component that can access list context
function AppListContent() {
  const { isPending, perPage } = useListContext();

  return (
    <DataTable
      rowClick={() => {
        return false;
      }}
      rowClassName={() => {
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
        label="Created At"
        source="createdAt"
        field={CreatedAtCell}
      />
      <DataTable.Col
        label="Updated At"
        source="updatedAt"
        field={UpdatedAtCell}
      />
      <DataTable.Col label="Trace ID" source="traceId" field={TraceIdCell} />
      <DataTable.Col label="Raw JSON" field={RawJsonCell} />
      <DataTable.Col label="Actions" field={ActionsCell} />
    </DataTable>
  );
}

function MyAppsFilter() {
  const user = stackClientApp.useUser({ or: 'redirect' });

  return <ToggleFilterButton label="My Apps" value={{ ownerId: user.id }} />;
}

const appsFilters = [
  <FilterBar
    key="filter-bar"
    filterLabels={{
      q: 'Search',
      ownerId: 'My Apps',
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

function TraceIdCell({ source }: { source: string }) {
  const record = useRecordContext();
  if (!record) return null;

  const traceId = record[source] as string | undefined;

  if (!traceId) return <span>-</span>;

  const truncatedTraceId =
    traceId.length > 12 ? `${traceId.substring(0, 12)}...` : traceId;

  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await navigator.clipboard.writeText(traceId);
      toast.success('Trace ID copied to clipboard');
    } catch (err) {
      console.error('Failed to copy trace ID:', err);
      toast.error('Failed to copy trace ID');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-help">{truncatedTraceId}</span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{traceId}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-6 w-6 p-0"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Copy trace ID</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
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

function ActionsCell() {
  return <ShowButton />;
}
