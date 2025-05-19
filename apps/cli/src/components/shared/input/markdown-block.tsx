import Markdown from 'ink-markdown';
import { Panel } from '../display/panel.js';

export type MarkdownBlockProps = {
  content: string;
  question?: string;
  showPrompt?: boolean;
};

export function MarkdownBlock({
  content,
  question,
  showPrompt = true,
}: MarkdownBlockProps) {
  if (!showPrompt) return null;

  if (question) {
    return (
      <Panel title={question} variant="default" boxProps={{ width: '100%' }}>
        <Markdown>{content}</Markdown>
      </Panel>
    );
  }

  return <Markdown>{content}</Markdown>;
}
