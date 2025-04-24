import { Box, Text } from 'ink';

type SelectOptionProps = {
  label: string;
  isSelected: boolean;
  isHighlighted: boolean;
};

export const SelectOption = ({
  label,
  isSelected,
  isHighlighted,
}: SelectOptionProps) => {
  return (
    <Box>
      <Text color={isHighlighted ? 'blue' : 'white'}>
        {isSelected ? '● ' : '○ '}
        <Text bold={isHighlighted}>{label}</Text>
      </Text>
    </Box>
  );
};
