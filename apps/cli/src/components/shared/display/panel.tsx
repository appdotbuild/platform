import { Box, Text, type BoxProps } from 'ink';

const variantColors = {
  info: {
    borderColor: '#1d4ed8',
  },
  default: {
    borderColor: '#3a3a3a',
  },
  error: {
    borderColor: '#b91c1c',
  },
  success: {
    borderColor: '#16a34a',
  },
};

type PanelProps = {
  children: React.ReactNode;
  title?: React.ReactNode;
  variant?: keyof typeof variantColors;
  boxProps?: BoxProps;
};

export function Panel({
  children,
  title,
  variant = 'default',
  boxProps,
}: PanelProps) {
  const { borderColor } = variantColors[variant];

  return (
    <Box
      borderStyle="round"
      borderColor={borderColor}
      flexDirection="column"
      padding={1}
      {...boxProps}
    >
      {title && (
        <Box marginBottom={1}>
          <Text bold>{title}</Text>
        </Box>
      )}
      {children}
    </Box>
  );
}
