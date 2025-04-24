import { Box, Text } from 'ink';

type ProgressBarProps = {
  progress: number; // 0 to 1
  width?: number;
};

export const ProgressBar = ({ progress, width = 30 }: ProgressBarProps) => {
  const filledWidth = Math.round(progress * width);
  const emptyWidth = width - filledWidth;

  return (
    <Box>
      <Text color="blue">
        {'━'.repeat(filledWidth)}
        <Text color="gray">{'━'.repeat(emptyWidth)}</Text>
      </Text>
    </Box>
  );
};
