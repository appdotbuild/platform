import { useCallback, useState } from 'react';
import { CustomColumnDev, DataTable } from '@/components/ui/data-table';
import { columnText } from '@/components/ui/data-table/utils/default-columns';
import { getAllApps } from '../lib/api/apps';
import AppsTableRowMenu from './apps-table-row-menu';
import { App } from '@appdotbuild/core/types/api';
import { toast } from '@/hooks/use-toast';
import { TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tooltip } from '@/components/ui/tooltip';
import { TooltipProvider } from '@/components/ui/tooltip';
import { HashAvatar } from '@/components/ui/avatar/hash-avatar';
import { Badge } from '@/components/ui/badge';
import { format } from 'timeago.js';

interface AppsTableProps {
  initialData: App[];
  initialTotalCount: number;
}

export default function AppsTable({
  initialData,
  initialTotalCount,
}: AppsTableProps) {
  const [data, setData] = useState(initialData);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (page: number, pageSize: number) => {
    setLoading(true);
    try {
      const result = await getAllApps({ page, pageSize });
      setData(result.data);
      setTotalCount(result.pagination.total);
    } catch (error) {
      toast({
        title: 'Failed to fetch apps',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const columns: CustomColumnDev<App, any>[] = [
    {
      accessorKey: 'ownerId',
      size: 20,
      ...columnText({ id: 'ownerId', title: 'Owner' }),
      cell: ({ row }) => (
        <div className="flex justify-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HashAvatar hash={row.getValue('ownerId')} />
              </TooltipTrigger>
              <TooltipContent>
                <p>{row.getValue('ownerId')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
    },
    {
      accessorKey: 'name',
      size: 200,
      ...columnText({ id: 'name', title: 'Name' }),
    },

    {
      accessorKey: 'flyAppId',
      size: 20,
      ...columnText({ id: 'flyAppId', title: 'Status' }),
      cell: ({ row }) => {
        const flyAppId = row.getValue('flyAppId') as string;
        return flyAppId ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="default">Deployed</Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Fly App ID: {flyAppId}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Badge variant="secondary">Not Deployed</Badge>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      size: 50,
      ...columnText({ id: 'createdAt', title: 'Created' }),
      cell: ({ row }) => {
        const date = row.getValue('createdAt');
        return <span>{format(date as string)}</span>;
      },
    },
    {
      accessorKey: 'updatedAt',
      size: 50,
      ...columnText({ id: 'updatedAt', title: 'Updated' }),
      cell: ({ row }) => {
        const date = row.getValue('updatedAt');
        return <span>{format(date as string)}</span>;
      },
    },
    {
      accessorKey: 'traceId',
      size: 50,
      ...columnText({ id: 'traceId', title: 'Trace ID' }),
      cell: ({ row }) => {
        const traceId: string | undefined = row.getValue('traceId');
        return <span>{traceId}</span>;
      },
    },
    {
      size: 50,
      id: 'actions',
      cell: ({ row }) => <AppsTableRowMenu row={row} />,
    },
  ];

  return (
    <DataTable
      data={data}
      columns={columns}
      loading={loading}
      textSearchColumn=""
      totalCount={totalCount}
      onPaginationChange={fetchData}
    />
  );
}
