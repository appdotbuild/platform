"use client";

import { useCallback, useState } from "react";
import { CustomColumnDev, DataTable } from "@repo/design/components/table/data-table";
import { columnText } from "@repo/design/components/table/utils/default-columns";
import { getAllChatbots } from "../actions";
import ChatbotsTableRowMenu from "./chatbots-table-row-menu";
import { Chatbot } from "@repo/core/types/api";
import { toast } from "@repo/design/hooks/use-toast";
import { TooltipContent, TooltipTrigger } from "@repo/design/shadcn/tooltip";
import { Tooltip } from "@repo/design/shadcn/tooltip";
import { TooltipProvider } from "@repo/design/shadcn/tooltip";
import { HashAvatar } from "@repo/design/components/avatar/hash-avatar";
import { Badge } from "@repo/design/shadcn/badge";
import { format } from "timeago.js";

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
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const columns: CustomColumnDev<Chatbot, any>[] = [
    {
      accessorKey: "ownerId",
      size: 20,
      ...columnText({ id: "ownerId", title: "Owner" }),
      cell: ({ row }) => (
        <div className="flex justify-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HashAvatar hash={row.getValue("ownerId")} />
              </TooltipTrigger>
              <TooltipContent>
                <p>{row.getValue("ownerId")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
    },
    {
      accessorKey: "name",
      size: 200,
      ...columnText({ id: "name", title: "Name" }),
    },

    {
      accessorKey: "flyAppId",
      size: 20,
      ...columnText({ id: "flyAppId", title: "Status" }),
      cell: ({ row }) => {
        const flyAppId = row.getValue("flyAppId") as string;
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
      accessorKey: "createdAt",
      size: 50,
      ...columnText({ id: "createdAt", title: "Created" }),
      cell: ({ row }) => {
        const date = row.getValue("createdAt");
        return <span>{format(date as string)}</span>;
      },
    },
    {
      accessorKey: "updatedAt",
      size: 50,
      ...columnText({ id: "updatedAt", title: "Updated" }),
      cell: ({ row }) => {
        const date = row.getValue("updatedAt");
        return <span>{format(date as string)}</span>;
      },
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
