import { Checkbox } from "@appdotbuild/design/shadcn/checkbox";
import { DataTableColumnHeader } from "../data-table-column-header";
import { cellConfig } from "./default-cells";
import { DataTableFacetedFilter } from "../data-table-faceted-filter";
import { Button } from "@appdotbuild/design/shadcn/button";
import { toast } from "@appdotbuild/design/hooks/use-toast";
import { ColumnDefToolbar } from "../data-table-toolbar";
import { cn } from "@appdotbuild/design/lib/utils";
import { EasyTooltip } from "@appdotbuild/design/components/tooltip/tooltip";
import type { ColumnDef, Table } from "@tanstack/react-table";

// Some convenient default columns configs for tanstack table

export function getIdsFromMultiselect(table: Table<any>) {
  return Object.entries(table.getState().rowSelection)
    .filter(([, value]) => value)
    .map(([key]) => {
      try {
        return table.getRow(key)?.original?.id;
      } catch (e) {
        return null;
      }
    })
    .filter((id) => id !== null);
}

export function SelectionDeleteButton({
  table,
  deleteAction,
  optimisticAction,
}: {
  table: Table<any>;
  deleteAction: ({ ids }: { ids: number[] }) => Promise<any>;
  optimisticAction?: (ids: number[], resp: any) => void;
}) {
  async function handleDelete(table: Table<any>, deleteAction: any) {
    const ids = getIdsFromMultiselect(table);
    const resp = await deleteAction({ ids });

    if (
      resp.serverError ||
      resp.validationErrors ||
      resp.bindArgsValidationErrors ||
      !(resp.data as any).success
    ) {
      toast({ title: "Failed to delete elements", variant: "destructive" });
    } else {
      await optimisticAction?.(ids, resp);
      toast({ title: `Deleted ${ids.length} elements` });
      table.resetRowSelection();
    }
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      className="ml-auto hidden h-8 lg:flex"
      onClick={() => handleDelete(table, deleteAction)}
    >
      Delete
    </Button>
  );
}

/**
 * Column for id field supporting multiple selection.
 * If passed an action it will add a delete button to the toolbar for the selected rows.
 * eg:
 * const { executeAsync: deleteAction } = useAction(onDelete);
 * columnMultiselect({ deleteAction })
 */
export function columnMultiselect({
  deleteAction,
}: {
  deleteAction?: any;
}): Partial<ColumnDefToolbar<any, any>> {
  const res: Partial<ColumnDefToolbar<any, any>> = {
    size: 30,
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate") ||
          false
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),

    enableSorting: false,
    enableHiding: false,
  };

  if (deleteAction) {
    res.multiselectToolbar = ({ table }) => (
      <SelectionDeleteButton table={table} deleteAction={deleteAction} />
    );
  }

  return res;
}

export function columnText({
  id,
  title,
  fieldConfig,
}: {
  id: string;
  title: string;
  fieldConfig?: cellConfig[];
}) {
  return {
    ...(fieldConfig
      ? {
          facetedToolbar: ({ table }) => (
            <DataTableFacetedFilter
              column={table.getColumn(id)}
              title={title}
              options={fieldConfig}
            />
          ),
        }
      : {}),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={title} />
    ),
    cell: ({ row }) => <span className="hyphens-auto">{row.getValue(id)}</span>,
    enableSorting: true,
    enableHiding: true,
  };
}

export function columnIcon({
  id,
  title,
  fieldConfig,
}: {
  id: string;
  title: string;
  fieldConfig: cellConfig[];
}) {
  return {
    size: 100,
    title: title,
    facetedToolbar: ({ table }) => (
      <DataTableFacetedFilter
        column={table.getColumn(id)}
        title={title}
        options={fieldConfig}
      />
    ),

    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={title} />
    ),
    cell: ({ row }) => {
      const config = fieldConfig.find(
        (status) => status.value.toString() == row.getValue(id).toString(),
      );

      return (
        <div className={cn("flex w-[100px] items-center", config?.className)}>
          {config?.icon && <config.icon className="mr-2 h-4 w-4 opacity-50" />}
          <span>{config?.label || row.getValue(id)}</span>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  };
}

export function addTooltip({
  tooltip,
  columnConfig,
}: {
  tooltip: string | ((args: any) => React.ReactNode);
  columnConfig: any;
}): any {
  if (typeof tooltip === "function") {
    return {
      ...columnConfig,
      cell: (args) => (
        <EasyTooltip tooltip={tooltip(args)} duration={0}>
          {columnConfig.cell(args)}
        </EasyTooltip>
      ),
    };
  } else {
    return {
      ...columnConfig,
      cell: (args) => (
        <EasyTooltip tooltip={tooltip} duration={0}>
          {columnConfig.cell(args)}
        </EasyTooltip>
      ),
    };
  }
}
