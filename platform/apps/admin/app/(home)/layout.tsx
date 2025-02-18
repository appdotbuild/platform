"use client";

import { DashboardLayout } from "@repo/design/components/dashboard/layout";
import { useSelectedLayoutSegments } from "next/navigation";
import { signOut } from "@repo/auth/react";
import { DashboardHeader } from "@repo/design/components/dashboard/header";

export default function Layout({ children }) {
  const segment = useSelectedLayoutSegments();

  return (
    <>
      <DashboardHeader signOut={signOut} />
      {children}
    </>
  );
}
