import { Meta, StoryObj } from "@storybook/react";
import { EasyTooltip } from "./tooltip";
import { Button } from "@repo/design/shadcn/button";

const meta: Meta<typeof EasyTooltip> = {
  title: "UI/Custom/Tooltip",
  component: EasyTooltip,
  tags: ["autodocs"],
  argTypes: {
    tooltip: {
      control: "text",
      description: "The tooltip content to display",
    },
    duration: {
      control: "number",
      description: "Delay duration in milliseconds before showing tooltip",
    },
  },
};

export default meta;
type Story = StoryObj<typeof EasyTooltip>;

export const Default: Story = {
  args: {
    children: "Hover me",
    tooltip: "This is a tooltip",
  },
};

export const WithDelay: Story = {
  args: {
    children: "Hover with delay",
    tooltip: "This tooltip has a delay",
    duration: 500,
  },
};

export const WithLongContent: Story = {
  args: {
    children: "Hover for long content",
    tooltip:
      "This is a longer tooltip that demonstrates how the component handles multiple lines of text content",
  },
};

export const NoTooltip: Story = {
  args: {
    children: "No tooltip appears",
    tooltip: undefined,
  },
};
