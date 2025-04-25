import type { Meta, StoryObj } from '@storybook/react';
import EasyMarkdown from './markdown';

const meta: Meta<typeof EasyMarkdown> = {
  title: 'UI/Chat/Markdown',
  component: EasyMarkdown,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof EasyMarkdown>;

export const Default: Story = {
  args: {
    children: 'Hello, how can I help you today?',
  },
};

export const WithFormatting: Story = {
  args: {
    children: 'Hello, **how can** I help you today?',
  },
};

export const WithComplexMarkdown: Story = {
  args: {
    children: `# Heading 1
## Heading 2

This is a paragraph with **bold** and *italic* text.


double new lines

[link](https://www.google.com)

- List item 1
- List item 2
  - Nested item
  
> This is a blockquote

This is code:

\`\`\`typescript
const hello = "world";
console.log(hello);
\`\`\`

| Column 1 | Column 2 |
|----------|----------|
| Cell 1   | Cell 2   |
`,
  },
};

export const WithMarkdownText: Story = {
  args: {
    children: `
Marco is dedicated to innovation in the tech space, particularly in areas that combine hardware and software.
Markdown for **Marco D'Alia**, also known as **madarco**, is a seasoned software developer and entrepreneur with over 20 years of programming experience. He is the founder of two startups and has a strong passion for improving people's lives through software solutions. 

### Key Highlights:
- **Experience**: More than 10 years in professional software development and design.
- **Notable Projects**:
  - Scaled a social app to 1.5 million users.
  - Designed and managed Italy's first directory for accountants and lawyers.
  - Developed the first Arduino-powered 3D-printed racing game, **3DRacers**.

### Online Presence:
- **Website**: [madarco.net](https://madarco.net)
- **GitHub**: [3DRacers GitHub](http://github.com/3DRacers)
- **StackOverflow**: [madarco on StackOverflow](http://stackoverflow.com/cv/madarco)

Marco is dedicated to innovation in the tech space, particularly in areas that combine hardware and software.
    `,
  },
};
