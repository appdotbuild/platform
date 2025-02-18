"use client";

import { DashboardLayout } from "@repo/design/components/dashboard/layout";
import { useSelectedLayoutSegments } from "next/navigation";
import { signOut } from "@repo/auth/react";

export default function Layout({ children }) {
  const segment = useSelectedLayoutSegments();

  return <DashboardLayout signOut={signOut}>{children}</DashboardLayout>;
}
