"use client";
import type * as React from "react";
import { Toaster } from "@repo/design/shadcn/toaster";
import { SWRConfig } from "swr";
import { ConfigProvider } from "@repo/design/components/providers/config-provider";
import { sidebarMenu, headerMenu } from "../settings/menu";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      value={{
        sidebarMenu,
        headerMenu,
      }}
    >
      <SWRConfig
        value={{
          fetcher: (resource, init) => {
            // FIX: for SWR not working with SDK AI https://github.com/vercel/ai/issues/3214
            if (resource.startsWith("/chat/ui/api")) {
              return [];
            }
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
