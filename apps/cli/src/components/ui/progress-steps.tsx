import { Box, Text } from 'ink';

type Step = {
  message: string;
  detail: string;
};

type ProgressStepsProps = {
  steps: Step[];
  currentStep: number;
  isDeployed: boolean;
};

export const ProgressSteps = ({
  steps,
  currentStep,
  isDeployed,
}: ProgressStepsProps) => {
  return (
    <Box flexDirection="column" marginY={1}>
      {steps.map((step, index) => (
        <Box key={index} marginY={1}>
          <Box width={2}>
            {index === currentStep && !isDeployed ? (
              <Text color="yellow">⟐</Text>
            ) : index < currentStep || isDeployed ? (
              <Text color="green">✓</Text>
            ) : (
              <Text color="gray">○</Text>
            )}
          </Box>
          <Box marginLeft={1} flexDirection="column">
            <Text
              color={
                index === currentStep && !isDeployed
                  ? 'yellow'
                  : index < currentStep || isDeployed
                  ? 'green'
                  : 'gray'
              }
              bold={index === currentStep && !isDeployed}
            >
              {step.message}
            </Text>
            {index === currentStep && !isDeployed && (
              <Box marginLeft={2} marginTop={1}>
                <Text color="gray" italic>
                  {step.detail}
                </Text>
              </Box>
            )}
          </Box>
        </Box>
      ))}
    </Box>
  );
};
