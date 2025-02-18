"use client";

import { DashboardLayoutSubNav } from "@repo/design/components/dashboard/layout";
import { SideSubNav } from "@repo/design/components/dashboard/side-sub-nav";
import { useSelectedLayoutSegments } from "next/navigation";
import { User, Settings } from "@repo/design/base/icons";
import { signOut } from "@repo/auth/react";

export default function Layout({ children }) {
  const segment = useSelectedLayoutSegments();
  const activePage = segment[segment.length - 1];

  const pages = [
    { title: "Profile", to: "profile", icon: User },
    //{ title: "Account", to: "account", icon: Settings },
  ];
  const title = pages.find((p) => p.to === activePage)?.title || "Dashboard";

  return (
    <DashboardLayoutSubNav title="User Settings" signOut={signOut}>
      <SideSubNav pages={pages} activePage={activePage} />
      {children}
    </DashboardLayoutSubNav>
  );
}
