"use client";

import { useCallback, useState } from "react";
import { CustomColumnDev, DataTable } from "@repo/design/components/table/data-table";
import {
  columnMultiselect,
  columnText,
  getIdsFromMultiselect,
  SelectionDeleteButton,
} from "@repo/design/components/table/utils/default-columns";
import { removeChatbotsAction } from "../actions";
import ChatbotsTableRowMenu from "./chatbots-table-row-menu";

type Chatbot = {
  id: string;
  name: string;
  telegramBotToken?: string | null;
  flyAppId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
};

interface ChatbotsTableProps {
  initialData: Chatbot[];
}

export default function ChatbotsTable({ initialData }: ChatbotsTableProps) {
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = useCallback(async ({ ids }: { ids: string[] }) => {
    const result = await removeChatbotsAction(ids);
    if (result.success) {
      setData((prev) => prev.filter((item) => !ids.includes(item.id)));
    }
    return result;
  }, []);

  const columns: CustomColumnDev<Chatbot, any>[] = [
    {
      id: "select",
      ...columnMultiselect({}),
      multiselectToolbar: ({ table }) => (
        <div className="flex gap-2">
          <SelectionDeleteButton 
            table={table} 
            deleteAction={({ ids }) => handleDelete({ ids: ids.map(String) })}
            optimisticAction={(ids) => setData(prev => prev.filter(item => !ids.includes(Number(item.id))))}
          />
        </div>
      ),
    },
    {
      accessorKey: "name",
      size: 200,
      ...columnText({ id: "name", title: "Name" }),
    },
    {
      accessorKey: "telegramBotToken",
      size: 200,
      ...columnText({ id: "telegramBotToken", title: "Telegram Token" }),
    },
    {
      accessorKey: "flyAppId",
      size: 200,
      ...columnText({ id: "flyAppId", title: "Fly App" }),
    },
    {
      size: 50,
      id: "actions",
      cell: ({ row }) => <ChatbotsTableRowMenu row={row} onDelete={handleDelete} />,
    },
  ];

  return (
    <DataTable 
      data={data} 
      columns={columns} 
      loading={isLoading} 
      textSearchColumn="name" 
    />
  );
} 