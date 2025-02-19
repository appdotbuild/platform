"use client";

import { DashboardHeader } from "@repo/design/components/dashboard/header";
import { UserButton } from "@stackframe/stack";
import { useSelectedLayoutSegments } from "next/navigation";

export default function Layout({ children }) {
  const segment = useSelectedLayoutSegments();

  return (
    <>
      <DashboardHeader userMenu={<UserButton />} />
      {children}
    </>
  );
}
