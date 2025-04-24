import { Box } from 'ink';
import { InfiniteFreeText } from '../../components/shared/free-text.js';
import { useGenerateAppSpecs } from '../use-application.js';
import { useCreateAppWizardStore } from '../store.js';
import { type AppGenerationResult } from '../../api/application.js';

type GenerateSpecsStepProps = {
  onSuccess: (result: AppGenerationResult, prompt: string) => void;
};

export const GenerateSpecsStep = ({ onSuccess }: GenerateSpecsStepProps) => {
  const config = useCreateAppWizardStore((s) => s.config);

  const {
    status: generateAppStatus,
    mutate: generateApp,
    error: generateAppError,
  } = useGenerateAppSpecs({
    onSuccess: (result, params) => {
      onSuccess(result, params.prompt);
    },
  });

  return (
    <Box marginY={1}>
      <InfiniteFreeText
        successMessage="App specifications generated successfully"
        status={generateAppStatus}
        errorMessage={generateAppError?.message}
        retryMessage="Please retry with a different prompt."
        loadingText="Generating your application specifications..."
        question="What kind of app would you like to create?"
        placeholder="e.g., I want a note taking app..."
        onSubmit={(value) => {
          generateApp({ ...config, prompt: value });
        }}
      />
    </Box>
  );
};
