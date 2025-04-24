export const steps = {
  environment: {
    label: 'Environment Selection',
    question: 'Choose where your app will run:',
    options: [
      {
        label: '🚀 Production - For live deployment',
        value: 'production' as const,
      },
      { label: '🔧 Staging - For testing', value: 'staging' as const },
    ],
    nextStep: 'generateAppSpecs' as const,
  },
  generateAppSpecs: {
    label: "Let's Create Your App",
    question: 'Generating the specs for your app...',
    nextStep: 'generateApp' as const,
  },
  generateApp: {
    label: 'Building Your App',
    question: 'Generating your application...',
    nextStep: 'successGeneration' as const,
  },
  successGeneration: {
    label: 'Deployment Complete',
    question: 'App created successfully!',
    nextStep: 'successGeneration' as const,
  },
};

export type AppConfig = {
  useStaging: boolean;
  prompt: string;
};

export type StepType = keyof typeof steps;
