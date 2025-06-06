import Markdown from 'ink-markdown';
import { Panel } from '../display/panel.js';
import chalk from 'chalk';

export type MarkdownBlockProps = {
  content: string;
  question?: string;
  showPrompt?: boolean;
  mode: 'history' | 'chat';
};

export function MarkdownBlock({
  content,
  question,
  showPrompt = true,
  mode = 'chat',
}: MarkdownBlockProps) {
  if (!showPrompt) return null;

  if (question) {
    return (
      <Panel title={question} variant="default" boxProps={{ width: '100%' }}>
        <Markdown>{content}</Markdown>
      </Panel>
    );
  }

  if (mode === 'history') {
    return (
      <Markdown
        paragraph={chalk.gray}
        link={chalk.gray}
        blockquote={chalk.gray}
        codespan={chalk.gray}
        strong={chalk.gray}
        href={chalk.gray}
        code={chalk.gray}
        heading={chalk.gray}
        list={chalk.gray}
      >
        {content}
      </Markdown>
    );
  }

  return <Markdown>{content}</Markdown>;
}
