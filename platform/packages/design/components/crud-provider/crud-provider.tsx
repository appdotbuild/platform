"use client";

import { toast } from "@repo/design/hooks/use-toast";
import { createContext, useContext, useState } from "react";

export type WithId = {
  id: number;
};

export interface ContextType<T extends WithId> {
  data: T[];
  refresh: () => Promise<void>;
  isLoading: boolean;
  patch: (data: Partial<T>[]) => Promise<void>;
  remove: (ids: number[]) => Promise<void>;
  replace: (data: T[]) => Promise<void>;
  add: (data: T[]) => Promise<void>;
}

export function createCRUDProvider<T extends WithId>({
  refreshAction,
}: {
  refreshAction: (any) => Promise<{ data?: T[] }>;
}) {
  const CustomContext = createContext<ContextType<T> | undefined>(undefined);

  function useIndexes() {
    const context = useContext(CustomContext);
    if (context === undefined) {
      throw new Error("useIndexes must be used within an IndexesProvider");
    }
    return context;
  }

  function CRUDProvider({
    children,
    initialData,
  }: {
    children: React.ReactNode;
    initialData: T[];
  }) {
    const [data, setData] = useState<T[]>(initialData);
    const [isLoading, setIsLoading] = useState(false);

    async function refresh() {
      setIsLoading(true);
      try {
        const { data: freshData } = await refreshAction({});
        setData(freshData);
      } catch (error) {
        toast({ title: "Failed to refresh", variant: "destructive" });
        console.error("Failed to refresh:", { base: error });
      } finally {
        setIsLoading(false);
      }
    }

    async function patch(data: Partial<T>[]) {
      const ids = data.map((d) => d.id);
      setData((prev) =>
        prev.map((i) => (ids.includes(i.id) ? Object.assign(i, data) : i)),
      );
    }

    async function replace(data: T[]) {
      const ids = data.map((d) => d.id);
      setData((prev) => prev.filter((i) => !ids.includes(i.id)).concat(data));
    }

    async function remove(ids: number[]) {
      setData((prev) => prev.filter((i) => !ids.includes(i.id)));
    }

    async function add(data: T[]) {
      setData((prev) => [...prev, ...data]);
    }

    const value = {
      data,
      isLoading,
      refresh,
      patch,
      remove,
      replace,
      add,
    };

    return (
      <CustomContext.Provider value={value}>{children}</CustomContext.Provider>
    );
  }

  return {
    CRUDProvider,
    CustomContext,
    useIndexes,
  };
}
