import { MultiSelect as InkMultiSelect } from '@inkjs/ui';
import { Box, Text } from 'ink';
import { Panel } from '../display/panel.js';
import type { SelectItem } from './types.js';

export type MultiSelectProps = {
  question: string;
  options: SelectItem<string>[];
  onSubmit: (selectedOptions: SelectItem<string>[]) => void;
  showPrompt?: boolean;
};

export const MultiSelect = ({
  question,
  options,
  onSubmit,
  showPrompt = true,
}: MultiSelectProps) => {
  if (!showPrompt) return null;

  return (
    <Panel
      title={question}
      variant="info" // 'info' para manter a cor azul que era usada antes
      boxProps={{ width: '100%' }}
    >
      <Box flexDirection="column" gap={1}>
        <Text>
          Use ↑↓ to navigate, <Text bold>SPACE to select</Text>, ENTER to
          confirm:
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
    </Panel>
  );
};
