import { Box, Text } from 'ink';
import { useState } from 'react';
import { tokenStorage } from '../auth/auth-storage.js';
import { InputSelector } from '../components/input-selector.js';
import { useSafeNavigate } from '../routes.js';

export function AppLogoutScreen() {
  const { goBack } = useSafeNavigate();

  const [logoutPhase, setLogoutPhase] = useState<
    'confirmation' | 'processing' | 'completed'
  >('confirmation');

  const handleLogout = async () => {
    setLogoutPhase('processing');

    // brief delay for visual messaging feedback
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      tokenStorage.clearTokens();
      setLogoutPhase('completed');
      process.exit(0);
    } catch (error) {
      console.error('Error during logout:', error);
      process.exit(1);
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold>🔒 Logout</Text>
      </Box>
      {logoutPhase === 'confirmation' && (
        <InputSelector
          type="select"
          question="Are you sure you want to log out of app.build?"
          options={[
            { label: 'Yes, log out', value: 'yes' },
            { label: 'No, go back', value: 'no' },
          ]}
          onSubmit={(value: string) => {
            if (value === 'yes') {
              void handleLogout();
            }
            if (value === 'no') {
              goBack();
            }
          }}
        />
      )}
      {logoutPhase === 'processing' && (
        <InputSelector type="markdown" content="Logging out..." mode="chat" />
      )}
      {logoutPhase === 'completed' && (
        <InputSelector
          type="markdown"
          content="You have been logged out. Goodbye!"
          mode="chat"
        />
      )}
    </Box>
  );
}
