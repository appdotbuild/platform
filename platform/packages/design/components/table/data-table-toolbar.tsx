"use client";

import { Cross2Icon } from "@radix-ui/react-icons";
import { ColumnDef, Table } from "@tanstack/react-table";

import { Button } from "@repo/design/shadcn/button";
import { Input } from "@repo/design/shadcn/input";
import { DataTableViewOptions } from "./data-table-view-options";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export type ColumnDefToolbar<TData, TValue> = ColumnDef<TData, TValue> & {
  facetedToolbar?: ({ table }: DataTableToolbarProps<TData>) => React.ReactNode;
  multiselectToolbar?: ({ table }: DataTableToolbarProps<TData>) => React.ReactNode;
  accessorKey?: string;
};

export function DataTableToolbar<TData>({
  table,
  columns,
  textSearchColumn,
}: DataTableToolbarProps<TData> & { columns: ColumnDefToolbar<TData, any>[]; textSearchColumn: string }) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const isSelected = Object.values(table.getState().rowSelection).length > 0;

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Search..."
          value={(table.getColumn(textSearchColumn)?.getFilterValue() as string) ?? ""}
          onChange={(event) => table.getColumn(textSearchColumn)?.setFilterValue(event.target.value)}
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {columns.map((column) => {
          if (column.facetedToolbar) {
            return <div key={"tb-" + (column.id || column.accessorKey)}>{column.facetedToolbar({ table })}</div>;
          }
          return null;
        })}
        {isFiltered && (
          <Button variant="ghost" onClick={() => table.resetColumnFilters()} className="h-8 px-2 lg:px-3">
            Reset
            <Cross2Icon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex items-center space-x-2">
        {isSelected &&
          columns.map((column) => {
            if (column.multiselectToolbar) {
              return <div key={"tb-" + (column.id || column.accessorKey)}>{column.multiselectToolbar({ table })}</div>;
            }
            return null;
          })}
        <DataTableViewOptions table={table} />
      </div>
    </div>
  );
}
