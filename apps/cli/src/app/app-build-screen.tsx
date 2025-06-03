import { Box } from 'ink';
import { AppBuilder } from '../components/app-builder/app-builder.js';
import { WelcomeBanner } from '../components/welcome-banner.js';

export const AppBuildScreen = () => {
  return (
    <Box flexDirection="column" gap={1}>
      <WelcomeBanner />
      <AppBuilder
        initialPrompt="What would you like to build?"
        showTitle={true}
      />
    </Box>
  );
};
