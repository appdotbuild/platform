'use client';

import Markdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

import 'katex/dist/katex.min.css';

export default function EasyMarkdown({ children }: { children: string }) {
  const markdownOpts = {
    remarkPlugins: [remarkGfm, remarkMath],
    rehypePlugins: [rehypeKatex],
  };
  return (
    <Markdown className="prose max-w-full" {...markdownOpts}>
      {children}
    </Markdown>
  );
}
