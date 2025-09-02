import { Box, Text } from 'ink';
import { useEffect } from 'react';
import { Banner } from './components/ui/Banner';

function WebLinkButton() {
  return (
    <Box>
      <Text dimColor>Please use </Text>
      <Text underline color="blueBright">
        https://app.build
      </Text>
      <Text dimColor> instead.</Text>
    </Box>
  );
}
function DeprecationBanner() {
  return (
    <Banner key="banner" title="⚠️  DEPRECATION NOTICE" borderColor="red">
      <Box flexDirection="column">
        <Text color="red" bold>
          This CLI has been{' '}
          <Text color="red" bold inverse>
            DEPRECATED
          </Text>{' '}
          and is no longer supported.
        </Text>
        <WebLinkButton />
      </Box>
    </Banner>
  );
}

// refresh the app every 100ms
const useKeepAlive = () =>
  useEffect(() => {
    setInterval(() => {}, 100);
  }, []);

export const App = () => {
  useKeepAlive();

  return <DeprecationBanner />;
};
