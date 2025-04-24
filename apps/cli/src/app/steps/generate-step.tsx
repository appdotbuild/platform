import { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { InfiniteFreeText } from '../../components/shared/free-text.js';
import { ProgressSteps } from '../../components/ui/progress-steps.js';
import { type AppGenerationResult } from '../../api/application.js';
import { useApplication, useGenerateApp } from '../use-application.js';
import { useCreateAppWizardStore } from '../store.js';
import { useSafeSearchParams } from '../../routes.js';

const buildSteps = [
  {
    message: '🏗️  Generating business model and use cases...',
    detail: '🎯 Analyzing requirements and creating domain models',
  },
  {
    message: '🗄️  Designing database schema...',
    detail: '📊 Creating tables, relations, and indexes',
  },
  {
    message: '⚡ Generating TypeScript code...',
    detail: '🔧 Creating type-safe implementations of your app logic',
  },
  {
    message: '🚀 Compiling TypeScript...',
    detail: '✨ Ensuring type safety and generating JavaScript',
  },
  {
    message: '🧪 Generating test suites...',
    detail: '🎯 Creating comprehensive tests for your app',
  },
  {
    message: '🛠️  Implementing handlers...',
    detail: '🔌 Creating route handlers and middleware',
  },
  {
    message: '✨ Finalizing code quality...',
    detail: '🎨 Running linters and formatters',
  },
];

export type GenerateStepProps = {
  onSuccess: (app: AppGenerationResult) => void;
};

export const GenerateStep = ({ onSuccess }: GenerateStepProps) => {
  const config = useCreateAppWizardStore((s) => s.config);
  const [{ appId }] = useSafeSearchParams('/app/create');

  const appMessageHistory = useCreateAppWizardStore((s) => s.appMessageHistory);

  const [currentStep, setCurrentStep] = useState(0);
  const {
    mutate: generateApp,
    error: generateAppError,
    data: generateAppData,
    status: generateAppStatus,
  } = useGenerateApp();
  const { data: app } = useApplication(appId, {
    refetchInterval: 5_000,
  });

  const isWaitingForSpecsApproval = !app?.isDeployed && !generateAppData;

  useEffect(() => {
    if (isWaitingForSpecsApproval || !app || !appId) {
      return;
    }

    // Handle successful deployment
    if (app?.isDeployed && generateAppData) {
      onSuccess(generateAppData);
      return;
    }

    let isActive = true;

    const updateStep = () => {
      if (!isActive) return;
      setCurrentStep((prev) => (prev + 1) % buildSteps.length);
    };

    // Progress through steps every 5 seconds
    const stepInterval = setInterval(updateStep, 5000);

    // Cleanup function
    return () => {
      isActive = false;
      if (stepInterval) {
        clearInterval(stepInterval);
      }
    };
  }, [app, appId, generateAppData, isWaitingForSpecsApproval, onSuccess]);

  if (!app) return <Text>App not found</Text>;

  if (isWaitingForSpecsApproval) {
    return (
      <Box flexDirection="column">
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="blue"
          padding={1}
          marginBottom={1}
        >
          <Box marginBottom={1}>
            <Text color="blue" bold>
              Generated App Specification
            </Text>
          </Box>
          <Text>{appMessageHistory['specs'].at(-1)}</Text>
        </Box>

        <Box marginBottom={1}>
          <Text>
            Would you like to proceed with deploying this app with these
            specifications?
          </Text>
        </Box>

        <Box marginTop={1} gap={1}>
          <InfiniteFreeText
            successMessage="App deployed successfully"
            status={generateAppStatus}
            errorMessage={generateAppError?.message}
            retryMessage="Please retry."
            loadingText="Deploying your app..."
            question="Type 'yes' to deploy or provide feedback to modify the specifications:"
            placeholder="e.g., yes or I want to add more features..."
            onSubmit={() => {
              generateApp({ ...config, appId: app.id });
            }}
          />
        </Box>
      </Box>
    );
  }

  if (!app.isDeployed) {
    return (
      <Box flexDirection="column">
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="blue"
          padding={1}
          marginBottom={1}
        >
          <Box marginBottom={1}>
            <Text dimColor>App ID: </Text>
            <Text color="yellow" bold>
              {app.id}
            </Text>
          </Box>
        </Box>

        <ProgressSteps
          steps={buildSteps}
          currentStep={currentStep}
          isDeployed={app.isDeployed}
        />

        <Box marginTop={1}>
          <Text dimColor italic>
            {app.isDeployed ? '🎉 Deployment completed successfully!' : ''}
          </Text>
        </Box>

        {app.readUrl && (
          <Box
            marginTop={1}
            flexDirection="column"
            borderStyle="round"
            borderColor="green"
            padding={1}
          >
            <Text color="green">
              🌐 Your app is available at:{' '}
              <Text bold underline>
                {app?.readUrl}
              </Text>
            </Text>
          </Box>
        )}

        <Box marginTop={2}>
          <Text dimColor italic>
            🔄 Please wait while we set up your app...
          </Text>
        </Box>
      </Box>
    );
  }

  return null;
};
