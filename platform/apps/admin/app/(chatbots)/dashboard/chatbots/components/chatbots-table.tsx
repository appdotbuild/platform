"use client";

import { useCallback, useState } from "react";
import { CustomColumnDev, DataTable } from "@repo/design/components/table/data-table";
import {
  columnText,
} from "@repo/design/components/table/utils/default-columns";
import { getAllChatbots } from "../actions";
import ChatbotsTableRowMenu from "./chatbots-table-row-menu";
import { Chatbot } from "@repo/core/types/api";
import { toast } from "@repo/design/hooks/use-toast";

interface ChatbotsTableProps {
  initialData: Chatbot[];
  initialTotalCount;
}

export default function ChatbotsTable({ initialData, initialTotalCount }: ChatbotsTableProps) {
  const [data, setData] = useState(initialData);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (page: number, pageSize: number) => {
    setLoading(true);
    try {
      const result = await getAllChatbots({ page, pageSize });
      setData(result.data);
      setTotalCount(result.pagination.total);
    } catch (error) {
      toast({ 
        title: "Failed to fetch chatbots", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const columns: CustomColumnDev<Chatbot, any>[] = [
    {
      accessorKey: "name",
      size: 200,
      ...columnText({ id: "name", title: "Name" }),
    },
    {
      accessorKey: "flyAppId",
      size: 200,
      ...columnText({ id: "flyAppId", title: "Fly App" }),
    },
    { 
      accessorKey: "createdAt",
      ...columnText({ id: "createdAt", title: "Created Date" }),
    },
    {
      size: 50,
      id: "actions",
      cell: ({ row }) => <ChatbotsTableRowMenu row={row} />,
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