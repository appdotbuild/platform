"use client";

import { DashboardHeader } from "@repo/design/components/dashboard/header";
import { UserButton } from "@stackframe/stack";

export default function Layout({ children }) {
  return (
    <>
      <DashboardHeader userMenu={<UserButton />} />
      {children}
    </>
  );
}
