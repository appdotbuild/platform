import React from 'react';
import { DataTable, DataTableProps } from './data-table';
import { ColumnDef } from '@tanstack/react-table';
import type { Meta, StoryObj } from '@storybook/react';

// Define a sample data type
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

// Sample data
function generateSampleUsers(count: number): User[] {
  return Array(count)
    .fill(null)
    .map((_, index) => ({
      id: `${index + 1}`,
      name: `User ${index + 1}`,
      email: `user${index + 1}@example.com`,
      role: index % 3 === 0 ? 'Admin' : index % 3 === 1 ? 'User' : 'Editor',
    }));
}

// Sample columns
const columns: DataTableProps<User, any>['columns'] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'role',
    header: 'Role',
  },
];

export default {
  title: 'UI/Custom/DataTable',
  component: DataTable,
  argTypes: {
    textSearchColumn: {
      control: 'select',
      options: ['name', 'email', 'role'],
    },
  },
} as Meta;

type Story = StoryObj<typeof DataTable>;
export const Default: Story = {
  args: {
    columns: columns as any,
    data: generateSampleUsers(10),
    textSearchColumn: 'name',
  },
};

export const EmptyTable: Story = {
  args: {
    columns: columns as any,
    data: [],
    textSearchColumn: 'name',
  },
};

export const LargeDataset: Story = {
  args: {
    columns: columns as any,
    data: generateSampleUsers(100),
    textSearchColumn: 'name',
  },
};
