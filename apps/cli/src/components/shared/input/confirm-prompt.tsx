import { ConfirmInput as InkConfirm } from '@inkjs/ui';
import { Box } from 'ink';
import { Panel } from '../display/panel.js';

export type ConfirmPromptProps = {
  question: string;
  onSubmit: (value: boolean) => void;
  showPrompt?: boolean;
};

export function ConfirmPrompt({
  question,
  onSubmit,
  showPrompt = true,
}: ConfirmPromptProps) {
  if (!showPrompt) return null;

  return (
    <Panel title={question} variant="info" boxProps={{ width: '100%' }}>
      <InkConfirm
        onConfirm={() => onSubmit(true)}
        onCancel={() => onSubmit(false)}
      />
    </Panel>
  );
}
