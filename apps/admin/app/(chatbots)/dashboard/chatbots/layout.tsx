"use client";

import { UserButton } from "@repo/auth/stack";
import { DashboardLayout } from "@repo/design/components/dashboard/layout";
import { useUser } from "@repo/auth/stack";

export default function Layout({ children }) {
  const user = useUser();

  return (
    <DashboardLayout userMenu={<UserButton />} signOut={() => user.signOut()}>
      {children}
    </DashboardLayout>
  );
}
