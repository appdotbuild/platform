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
import { Button } from '@appdotbuild/design';
import { FileText, Info } from 'lucide-react';
import { InPlaceEditor } from '@/components/admin';
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
import { useRecordContext, useListContext, useCreatePath } from 'ra-core';
import { TextInput, FilterBar } from '@/components/admin';
import { Link } from 'react-router';

// Wrapper component that can access list context
function UserListContent() {
  const { isPending, perPage } = useListContext();

  return (
    <DataTable
      rowClick={false}
      rowClassName={() => {
        return 'cursor-default';
      }}
      className="[&_td]:py-4 [&_th]:py-4"
      isLoading={isPending}
      skeletonRows={perPage}
    >
      <DataTable.Col label="User" source="id" field={UserAvatarCell} />
      <DataTable.Col
        label="User ID"
        source="id"
        field={(props) => <IdCell {...props} label="User ID" />}
      />
      <DataTable.Col
        label="Apps"
        source="appsCount"
        field={UserAppsCountCell}
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
      <DataTable.Col label="Raw JSON" field={RawJsonCell} />
      <DataTable.Col
        disableSort
        label={
          <div className="flex items-center gap-1">
            <span>Message Limit</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Daily message limit per user (default: 10)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        }
        source="dailyMessageLimit"
        field={MessageLimitCell}
      />
    </DataTable>
  );
}

const usersFilters = [
  <FilterBar
    key="filter-bar"
    filterLabels={{
      q: 'Search',
    }}
  >
    <div className="flex-1 min-w-0">
      <TextInput
        source="q"
        placeholder="Search users by name, email, or ID..."
        label="Search"
      />
    </div>
  </FilterBar>,
];

export default function UserList() {
  return (
    <List filters={usersFilters} sort={{ field: 'createdAt', order: 'DESC' }}>
      <UserListContent />
    </List>
  );
}

function UserAvatarCell({ source }: { source: string }) {
  const record = useRecordContext();
  if (!record) return null;

  const userId = record[source];
  const userName = record.name as string | null;
  const userEmail = record.email as string;

  return (
    <div className="flex items-center gap-3">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <HashAvatar hash={userId} />
          </TooltipTrigger>
          <TooltipContent>
            <p>{userId}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <div className="flex flex-col">
        <span className="font-medium text-sm">
          {userName || 'Anonymous User'}
        </span>
        <span className="text-xs text-gray-500 truncate max-w-[200px]">
          {userEmail}
        </span>
      </div>
    </div>
  );
}

function UserAppsCountCell() {
  const record = useRecordContext();
  const createPath = useCreatePath();

  if (!record) return null;

  const userId = record.id as string;
  const appsCount = record.appsCount as number;
  const appsPath = createPath({ resource: 'apps', type: 'list' });
  const linkTo = {
    pathname: appsPath,
    search: `filter=${JSON.stringify({ ownerId: userId })}`,
  };

  return (
    <div className="flex items-center gap-2">
      <Link to={linkTo} onClick={(e) => e.stopPropagation()}>
        <Badge
          variant="secondary"
          className="hover:bg-secondary/80 transition-colors"
        >
          {appsCount} apps
        </Badge>
      </Link>
    </div>
  );
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

function MessageLimitCell() {
  const record = useRecordContext();
  if (!record) return null;

  const dailyMessageLimit = record.dailyMessageLimit as number;
  const DEFAULT_MESSAGE_LIMIT = 10;
  const isCustomLimit = dailyMessageLimit !== DEFAULT_MESSAGE_LIMIT;

  return (
    <div className="flex items-center justify-center">
      <div
        className={`px-2 py-1 rounded-md text-xs font-medium ${
          isCustomLimit
            ? 'border-2 border-primary/60 bg-primary/5 text-primary font-semibold hover:bg-primary/10 hover:border-primary/80'
            : 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/90'
        }`}
      >
        <InPlaceEditor
          source="dailyMessageLimit"
          inputType="number"
          className="text-inherit font-inherit"
        />
      </div>
    </div>
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
          <DialogTitle>Raw User JSON Data</DialogTitle>
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
