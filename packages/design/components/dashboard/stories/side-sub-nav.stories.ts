import type { Meta, StoryObj } from '@storybook/react';
import { SideSubNav } from '../side-sub-nav';
import { Home, Settings, User } from 'lucide-react';

const meta: Meta<typeof SideSubNav> = {
  title: 'UI/Dashboard/SideNav',
  component: SideSubNav,
  tags: ['autodocs'],
  argTypes: {
    pages: { control: 'object' },
    activePage: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof SideSubNav>;

export const Default: Story = {
  args: {
    pages: [
      { title: 'Dashboard', to: '/dashboard', icon: Home },
      { title: 'Profile', to: 'profile', icon: User },
      { title: 'Settings', to: 'settings', icon: Settings },
    ],
    activePage: '/dashboard',
  },
};

export const WithActiveProfile: Story = {
  args: {
    ...Default.args,
    activePage: 'profile',
  },
};

export const SinglePage: Story = {
  args: {
    pages: [{ title: 'Dashboard', to: '/dashboard', icon: Home }],
    activePage: '/dashboard',
  },
};
