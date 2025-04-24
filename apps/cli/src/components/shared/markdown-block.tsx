import Markdown from 'ink-markdown';

export type MarkdownBlockProps = {
  content: string;
};

export function MarkdownBlock({ content }: MarkdownBlockProps) {
  return <Markdown>{content}</Markdown>;
}
