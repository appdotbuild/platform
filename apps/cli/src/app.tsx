import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRouter } from './routes';
import { authenticate } from './auth/auth';
import { useAuth } from './auth/use-auth';
import { Box, Text } from 'ink';
import { Banner } from './components/ui/Banner';
import { DebugPanel } from './debug/debugger-panel';
import { useDebugStore } from './hooks/use-debug';

const queryClient = new QueryClient();

// refresh the app every 100ms
const useKeepAlive = () =>
  useEffect(() => {
    setInterval(() => {}, 100);
  }, []);

export const App = () => {
  useKeepAlive();

  const isDebugPanelVisible = useDebugStore((state) => state.isVisible);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthWrapper>
        <Box display="flex" gap={1} width="100%">
          <Box flexGrow={1} flexDirection="column" gap={1}>
            <AppRouter />
          </Box>
          <Box
            display={isDebugPanelVisible ? 'flex' : 'none'}
            flexShrink={0}
            flexBasis="40%"
          >
            <DebugPanel />
          </Box>
        </Box>
      </AuthWrapper>
    </QueryClientProvider>
  );
};

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { data, error, isLoading } = useAuth();
  const isAuthenticated = !isLoading && !!data?.isLoggedIn;

  useEffect(() => {
    if (!isAuthenticated) {
      void authenticate();
    }
  }, [data, isLoading]);

  let content = null;

  if (error) {
    content = <Text color="red">Error: {error.message}</Text>;
  } else if (!data?.isLoggedIn) {
    content = null;
  } else {
    content = children;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Banner title="Welcome to AppDotBuild CLI">
        Create, deploy, and manage your applications with ease
      </Banner>
      {content}
    </Box>
  );
}
