import React from "react";
import { DashboardHeader } from "./header";

import { Sidebar } from "./sidebar/sidebar";
import { useSidebar } from "@repo/design/hooks/use-sidebar";
import { useStore } from "@repo/design/hooks/use-store";
import { cn } from "@repo/design/lib/utils";

export default function AdminPanelLayout({
  children,
  signOut,
}: {
  children: React.ReactNode;
  signOut: () => Promise<void>;
}) {
  const sidebar = useStore(useSidebar, (x) => x);
  if (!sidebar) return null;
  const { getOpenState, settings } = sidebar;
  return (
    <>
      <Sidebar signOut={signOut} />
      <div
        className={cn(
          !settings.disabled && (!getOpenState() ? "lg:ml-[90px]" : "lg:ml-72"),
        )}
      >
        {children}
      </div>
      <footer
        className={cn(
          "transition-[margin-left] ease-in-out duration-300",
          !settings.disabled && (!getOpenState() ? "lg:ml-[90px]" : "lg:ml-72"),
        )}
      ></footer>
    </>
  );
}

export interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  userMenu: React.ReactNode;
  signOut: () => Promise<void>;
}

export function DashboardLayoutSubNav({
  children,
  title,
  userMenu,
  signOut,
}: DashboardLayoutProps) {
  return (
    <AdminPanelLayout signOut={signOut}>
      <div className="flex min-h-screen w-full flex-col">
        <DashboardHeader userMenu={userMenu} />
        <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
          <div className="grid w-full max-w-6xl gap-2">
            <h1 className="text-3xl font-semibold">{title}</h1>
          </div>
          <div className="grid w-full max-w-6xl items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
            {children}
          </div>
        </main>
      </div>
    </AdminPanelLayout>
  );
}

export function DashboardLayout({
  children,
  userMenu,
  signOut,
}: {
  children: React.ReactNode;
  userMenu: React.ReactNode;
  signOut: () => Promise<void>;
}) {
  return (
    <div>
      <DashboardHeader userMenu={userMenu} />
      <AdminPanelLayout signOut={signOut}>
        <div className="flex min-h-screen w-full flex-col">
          <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
            <div className="w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </AdminPanelLayout>
    </div>
  );
}
