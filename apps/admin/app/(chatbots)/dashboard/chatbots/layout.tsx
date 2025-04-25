"use client";

import { UserButton } from "@appdotbuild/auth/stack";
import { DashboardLayout } from "@appdotbuild/design/components/dashboard/layout";
import { useUser } from "@appdotbuild/auth/stack";

export default function Layout({ children }) {
  const user = useUser();

  return (
    <DashboardLayout userMenu={<UserButton />} signOut={() => user.signOut()}>
      {children}
    </DashboardLayout>
  );
}
