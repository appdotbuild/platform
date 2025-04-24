import { useState } from 'react';
import { Box, Text } from 'ink';
import { FreeText } from './shared/free-text.js';
import { MultiSelect } from './shared/multi-select.js';
import { Select } from './shared/select.js';
import { type SelectItem } from './shared/types.js';

type AppIdea = {
  description: string;
  features: SelectItem<string>[];
  hasDatabase: boolean;
};

export const AppIdeaPrompt = () => {
  const [step, setStep] = useState(0);
  const [appIdea, setAppIdea] = useState<Partial<AppIdea>>({});

  const featureOptions: SelectItem<string>[] = [
    { label: 'User Authentication', value: 'auth' },
    { label: 'API Integration', value: 'api' },
    { label: 'Real-time Updates', value: 'realtime' },
    { label: 'File Upload', value: 'files' },
    { label: 'Search Functionality', value: 'search' },
    { label: 'Analytics Dashboard', value: 'analytics' },
  ];

  if (step === 0) {
    return (
      <FreeText
        question="What's your app idea? Describe it briefly:"
        placeholder="e.g., A task management app for teams"
        onSubmit={(description) => {
          setAppIdea((prev) => ({ ...prev, description }));
          setStep(1);
        }}
      />
    );
  }

  if (step === 1) {
    return (
      <MultiSelect
        question="Which features would you like to include?"
        options={featureOptions}
        onSubmit={(features) => {
          setAppIdea((prev) => ({ ...prev, features }));
          setStep(2);
        }}
      />
    );
  }

  if (step === 2) {
    return (
      <Select
        question="Would you like to include a database?"
        options={[
          { label: 'Yes', value: 'true' },
          { label: 'No', value: 'false' },
        ]}
        onSubmit={(hasDatabase) => {
          setAppIdea((prev) => ({
            ...prev,
            hasDatabase: hasDatabase === 'true',
          }));
          setStep(3);
        }}
      />
    );
  }

  return (
    <Box
      flexDirection="column"
      padding={1}
      borderStyle="round"
      borderColor="green"
    >
      <Box flexDirection="column">
        <Box>
          <Text>Application Description: </Text>
          <Text color="green">{appIdea.description}</Text>
        </Box>
        <Box flexDirection="column" marginTop={1}>
          <Text>Selected Features:</Text>
          {appIdea.features?.map((feature) => (
            <Box key={feature.value} marginLeft={1}>
              <Text color="green">• {feature.label}</Text>
            </Box>
          ))}
        </Box>
        <Box marginTop={1}>
          <Text>Database: </Text>
          <Text color={appIdea.hasDatabase ? 'green' : 'red'}>
            {appIdea.hasDatabase ? 'Yes' : 'No'}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
