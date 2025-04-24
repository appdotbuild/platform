import { Box, Text } from 'ink';
import { ConfirmInput as InkConfirm } from '@inkjs/ui';

export type ConfirmPromptProps = {
  question: string;
  onSubmit: (value: boolean) => void;
};

function ConfirmPrompt({ question, onSubmit }: ConfirmPromptProps) {
  return (
    <Box
      flexDirection="column"
      padding={1}
      borderStyle="round"
      borderColor="blue"
    >
      <Box marginBottom={1}>
        <Text bold>{question}</Text>
      </Box>
      <InkConfirm
        onConfirm={() => onSubmit(true)}
        onCancel={() => onSubmit(false)}
      />
    </Box>
  );
}

export default ConfirmPrompt;
