import type { Meta, StoryObj } from '@storybook/react';
import { SourceBox, SourceBoxList } from './source-box';

const meta: Meta<typeof SourceBox> = {
  title: 'UI/Chat/SourceBox',
  component: SourceBox,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SourceBox>;

export const Default: Story = {
  args: {
    title: 'Introduction to React',
    url: 'https://react.dev/learn',
    abstract:
      'Learn how to build user interfaces with React, the popular JavaScript library.',
    score: 0.95,
  },
};

export const LongAbstract: Story = {
  args: {
    title: 'Advanced TypeScript Patterns',
    url: 'https://www.typescriptlang.org/docs/handbook/advanced-types.html',
    abstract:
      "Deep dive into advanced TypeScript patterns including conditional types, mapped types, template literal types, and more. This comprehensive guide covers everything you need to know about leveraging TypeScript's type system to its fullest potential.",
    score: 0.87,
  },
};

export const LowScore: Story = {
  args: {
    title: 'Getting Started with Next.js',
    url: 'https://nextjs.org/docs',
    abstract:
      'A quick introduction to building web applications with Next.js, the React framework for production.',
    score: 0.45,
  },
};

const sources = [
  {
    title: 'Introduction to React',
    url: 'https://react.dev/learn',
    abstract:
      'Learn how to build user interfaces with React, the popular JavaScript library.',
    score: 0.95,
  },
  {
    title:
      'Advanced TypeScript Patterns And very long title that goes really too long',
    url: 'https://www.typescriptlang.org/docs/handbook/advanced-types.html',
    abstract:
      'Deep dive into advanced TypeScript patterns including conditional types, mapped types, template literal types, and more.',
    score: 0.87,
  },
  {
    title: 'Getting Started with Next.js',
    url: 'https://nextjs.org/docs',
    abstract:
      'A quick introduction to building web applications with Next.js, the React framework for production.',
    score: 0.45,
  },
];

const shortSource = {
  title: 'Short',
  url: 'https://nextjs.org/docs',
  abstract: 'short',
  score: 0.45,
};
export const SourceBoxListStory: StoryObj<typeof SourceBoxList> = {
  render: () => (
    <SourceBoxList className="h-40 my-8 max-w-4xl pr-12" sources={sources} />
  ),
};

export const SourceBoxListStoryPlusOne: StoryObj<typeof SourceBoxList> = {
  render: () => (
    <SourceBoxList
      className="h-40 my-8 max-w-4xl pr-12"
      sources={[...sources, shortSource]}
    />
  ),
};

export const SourceBoxListStoryWithMore: StoryObj<typeof SourceBoxList> = {
  render: () => (
    <SourceBoxList
      className="h-40 my-8 max-w-4xl pr-12"
      sources={[...sources, ...sources]}
    />
  ),
};
