"use client";

import { Row } from "@tanstack/react-table";
import { Pencil, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@repo/design/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/design/shadcn/dropdown-menu";

interface ChatbotsTableRowMenuProps {
  row: Row<any>;
  onDelete: ({ ids }: { ids: string[] }) => Promise<{ success: boolean }>;
}

export default function ChatbotsTableRowMenu({ row, onDelete }: ChatbotsTableRowMenuProps) {
  const handleDelete = async () => {
    const id = row.original.id;
    await onDelete({ ids: [id] });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => {
            // TODO: Implement edit functionality
            console.log("Edit chatbot:", row.original.id);
          }}
        >
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 