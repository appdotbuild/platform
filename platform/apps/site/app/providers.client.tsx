"use client";
import type * as React from "react";
import { Toaster } from "@repo/design/shadcn/toaster";
import { SWRConfig } from "swr";
import { ConfigProvider } from "@repo/design/components/providers/config-provider";
import { sidebarMenu } from "../settings/menu";

export default function ProvidersClient({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      value={{
        sidebarMenu,
      }}
    >
      <SWRConfig
        value={{
          fetcher: (resource, init) => {
            return fetch(resource, init).then((res) => res.json());
          },
        }}
      >
        {children}
      </SWRConfig>
      <Toaster />
    </ConfigProvider>
  );
}
