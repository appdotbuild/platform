import { Text } from 'ink';

export function PanelTitle({
  question,
  prompt,
}: {
  question: string;
  prompt: string;
}) {
  return (
    <Text>
      <Text>{question}</Text> <Text dimColor>{prompt}</Text>
    </Text>
  );
}
