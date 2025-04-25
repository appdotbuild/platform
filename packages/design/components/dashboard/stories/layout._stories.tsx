import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { DashboardLayoutSubNav } from '../layout';
import { ConfigProvider } from '../../providers/config-provider';
import { Home } from '@appdotbuild/design/base/icons';

const mockConfig = {
  sidebarMenu: [
    {
      menus: [
        {
          href: '/',
          label: 'Home',
          icon: Home,
          active: true,
        },
      ],
    },
  ],
};

const meta: Meta<typeof DashboardLayoutSubNav> = {
  title: 'UI/Dashboard/Layout',
  component: DashboardLayoutSubNav,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [
    (Story) => (
      <ConfigProvider value={mockConfig}>
        <Story />
      </ConfigProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DashboardLayoutSubNav>;

export const Default: Story = {
  args: {
    title: 'Dashboard',
    signOut: async () => {},
  },
};

export const MobileView: Story = {
  args: {
    title: 'Dashboard',
    signOut: async () => {},
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

export const TabletView: Story = {
  args: {
    title: 'Dashboard',
    signOut: async () => {},
  },
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
  },
};

export const DesktopView: Story = {
  args: {
    title: 'Dashboard',
    signOut: async () => {},
  },
  parameters: {
    viewport: {
      defaultViewport: 'desktop',
    },
  },
};
