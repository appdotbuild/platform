import { Box, Text } from 'ink';
import { type SelectItem } from './types.js';
import { MultiSelect as InkMultiSelect } from '@inkjs/ui';

export type MultiSelectProps = {
  question: string;
  options: SelectItem<string>[];
  onSubmit: (selectedOptions: SelectItem<string>[]) => void;
};

export const MultiSelect = ({
  question,
  options,
  onSubmit,
}: MultiSelectProps) => {
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
      <Text>
        Use ↑↓ to navigate, <Text bold>SPACE to select</Text>, ENTER to confirm:
      </Text>
      <Box flexDirection="column">
        <InkMultiSelect
          options={options}
          onSubmit={(value) => {
            const selectedOptions = options.filter((o) => {
              return value.includes(o.value);
            });
            onSubmit(selectedOptions);
          }}
        />
      </Box>
    </Box>
  );
};
