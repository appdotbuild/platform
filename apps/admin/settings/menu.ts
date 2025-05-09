import {
  Users,
  Settings,
  LayoutGrid,
  MessageSquare,
  MessageSquareCode,
  FileText,
  BookOpen,
} from '@appdotbuild/design/base/icons';
import type { MenuGroup } from '@appdotbuild/design/components/providers/config-provider';

export const sidebarMenu: MenuGroup[] = [
  {
    groupLabel: '',
    menus: [
      {
        href: '/dashboard/apps',
        label: 'Apps',
        icon: MessageSquare,
        submenus: [],
      },
    ],
  },
];

export const headerMenu = [
  {
    href: '/user/profile',
    label: 'Profile',
    icon: Users,
  },
  {
    href: '/user/settings',
    label: 'Settings',
    icon: Settings,
  },
];
