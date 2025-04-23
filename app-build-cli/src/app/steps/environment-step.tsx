import { Box } from 'ink';
import { Select } from '../../components/shared/select.js';
import { steps } from './steps.js';

type EnvironmentStepProps = {
  onSubmit: (environment: string) => void;
};

export const EnvironmentStep = ({ onSubmit }: EnvironmentStepProps) => {
  return (
    <Box flexDirection="column">
      <Box marginY={1}>
        <Select
          question={steps.environment.question}
          options={steps.environment.options}
          onSubmit={(value) => onSubmit(value)}
        />
      </Box>
    </Box>
  );
};
