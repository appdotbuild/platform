import { Text } from 'ink';
import { Panel } from '../shared/display/panel';

export const TerminalLoading = () => {
  return (
    <Panel title="Previous Messages" variant="default">
      <Text dimColor>Loading history...</Text>
    </Panel>
  );
};
