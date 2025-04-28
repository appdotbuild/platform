'use client';

import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@appdotbuild/design/shadcn/table';

import { DataTablePagination } from '@appdotbuild/design/components/table/data-table-pagination';
import {
  ColumnDefToolbar,
  DataTableToolbar,
} from '@appdotbuild/design/components/table/data-table-toolbar';
import { Skeleton } from '@appdotbuild/design/shadcn/skeleton';

/**
 * A column definition that allows for additional properties.
 * It uses a declarative style to define some properties instead of relying on composability for ease of use.
 */
export type CustomColumnDev<T, V> = ColumnDefToolbar<T, V> & {
  /**
   * If false, the column will be hidden by default.
   */
  defaultVisible?: boolean;

  /**
   * The title of the column.
   */
  title?: string;
};

export interface DataTableProps<TData, TValue> {
  columns: CustomColumnDev<TData, TValue>[];
  data: TData[];
  textSearchColumn: string;
  loading: boolean;
  /**
   * When sets, server side pagination is enabled.
   */
  totalCount?: number;
  onPaginationChange?: (page: number, pageSize: number) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  textSearchColumn,
  loading,
  totalCount,
  onPaginationChange,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({});
  const defaultVisibility = Object.fromEntries(
    columns
      .filter((c) => c.defaultVisible === false)
      .map((c: any) => [c.accessorKey, false]),
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(defaultVisibility);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [{ pageIndex, pageSize }, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const pageCount = React.useMemo(() => {
    if (!totalCount) return Math.ceil(data.length / pageSize);
    return Math.ceil(totalCount / pageSize);
  }, [data, totalCount, pageSize]);

  // Loading Skeleton:
  const tableData = React.useMemo(
    () => (loading ? Array(pageSize).fill({}) : data),
    [loading, data, pageSize],
  );
  const tableColumns = React.useMemo(
    () =>
      loading
        ? columns.map((column) => ({
            ...column,
            cell: ({ row }) => (
              <Skeleton className="h-[14px] w-[60%] rounded-sm" />
            ),
          }))
        : columns,
    [loading, columns],
  );

  React.useEffect(() => {
    if (onPaginationChange) {
      onPaginationChange(pageIndex + 1, pageSize);
    }
  }, [onPaginationChange, pageIndex, pageSize]);

  const table = useReactTable({
    data: tableData,
    columns: tableColumns,
    pageCount,
    rowCount: totalCount,
    enableSorting: false,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination: {
        pageIndex,
        pageSize,
      },
    },
    enableRowSelection: true,
    manualPagination: Boolean(onPaginationChange),
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  return (
    <div className="space-y-4">
      <DataTableToolbar
        textSearchColumn={textSearchColumn}
        table={table}
        columns={columns}
      />
      <div className="rounded-md border">
        <Table className="bg-background">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      width={cell.column.columnDef.size}
                      className=""
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} totalCount={totalCount} />
    </div>
  );
}
