import {
  Users,
  Settings,
  LayoutGrid,
  MessageSquare,
  MessageSquareCode,
  FileText,
  BookOpen,
} from "@repo/design/base/icons";
import type { MenuGroup } from "@repo/design/components/providers/config-provider";

export const sidebarMenu: MenuGroup[] = [
  {
    groupLabel: "",
    menus: [
      {
        href: "/dashboard/chatbots",
        label: "Chatbots",
        icon: MessageSquare,
        submenus: [],
      },
    ],
  },
];

export const headerMenu = [
  {
    href: "/user/profile",
    label: "Profile",
    icon: Users,
  },
  {
    href: "/user/settings",
    label: "Settings",
    icon: Settings,
  },
];
