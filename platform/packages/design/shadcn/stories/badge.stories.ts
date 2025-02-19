import { Meta, StoryObj } from "@storybook/react";
import { Badge } from "../badge";

const meta: Meta<typeof Badge> = {
  title: "UI/Shadcn/Badge",
  component: Badge,
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "primary",
        "secondary",
        "success",
        "warning",
        "danger",
      ],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: {
    children: "Default Badge",
  },
};

export const Destructive: Story = {
  args: {
    children: "Primary Badge",
    variant: "destructive",
  },
};
