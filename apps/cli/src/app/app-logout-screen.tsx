import { Box, Text } from 'ink';
import { useState } from 'react';
import { BuildingBlock } from '../components/shared/building-block.js';
import { useSafeNavigate } from '../routes.js';
import { tokenStorage } from '../auth/auth-storage.js';

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
        <BuildingBlock
          type="select"
          question="Are you sure you want to log out of app.build?"
          options={[
            { label: 'Yes, log out', value: 'yes' },
            { label: 'No, go back', value: 'no' },
          ]}
          onSubmit={(value) => {
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
        <BuildingBlock type="markdown" content="Logging out..." />
      )}
      {logoutPhase === 'completed' && (
        <BuildingBlock
          type="markdown"
          content="You have been logged out. Goodbye!"
        />
      )}
    </Box>
  );
}
