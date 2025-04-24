import { Box, Text } from 'ink';
import { EnvironmentStep } from './steps/environment-step.js';
import { GenerateSpecsStep } from './steps/generate-specs-step.js';
import { GenerateStep } from './steps/generate-step.js';
import { SuccessStep } from './steps/success-step.js';
import { steps } from './steps/steps.js';
import { WizardHistory } from '../components/ui/wizard-history.js';
import { useCreateAppWizardStore } from './store.js';
import type { AppGenerationResult } from '../api/application.js';
import { useSafeNavigate, useSafeSearchParams } from '../routes.js';

export const CreateAppScreen = () => {
  return (
    <Box flexDirection="column">
      <WizardHistory />
      <StepContent />
    </Box>
  );
};

function StepContent() {
  const { setConfig, addToHistory, addMessageToAppHistory } =
    useCreateAppWizardStore();

  const { safeNavigate } = useSafeNavigate();
  const [{ step, appId }] = useSafeSearchParams('/app/create');

  const handleEnvironmentSubmit = (environment: string) => {
    setConfig({
      useStaging: environment === 'staging',
    });
    addToHistory(
      steps.environment.question,
      steps.environment.options.find((opt) => opt.value === environment)
        ?.label || environment
    );
    safeNavigate({
      path: '/app/create',
      searchParams: { step: steps.environment.nextStep },
    });
  };

  const handleGenerateAppSpecsSuccess = (
    appSpecs: AppGenerationResult,
    prompt: string
  ) => {
    setConfig({ prompt });
    addToHistory('What kind of app would you like to create?', prompt);
    addMessageToAppHistory('specs', appSpecs.message);
    safeNavigate({
      path: '/app/create',
      searchParams: {
        step: steps.generateAppSpecs.nextStep,
        appId: appSpecs.appId,
      },
    });
  };

  const handleGenerateAppSuccess = (app: AppGenerationResult) => {
    addMessageToAppHistory('generation', app.message);
    safeNavigate({
      path: '/app/create',
      searchParams: {
        step: steps.generateApp.nextStep,
        appId: app.appId,
      },
    });
  };

  switch (step) {
    case 'environment':
      return <EnvironmentStep onSubmit={handleEnvironmentSubmit} />;
    case 'generateAppSpecs':
      return <GenerateSpecsStep onSuccess={handleGenerateAppSpecsSuccess} />;
    case 'generateApp':
      return <GenerateStep onSuccess={handleGenerateAppSuccess} />;
    case 'successGeneration':
      if (!appId) {
        return <Text>No app ID found</Text>;
      }
      return <SuccessStep appId={appId} />;
    default:
      return null;
  }
}
