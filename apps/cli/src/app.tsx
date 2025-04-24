import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRouter } from './routes.js';
import { authenticate } from './auth/auth.js';
import { useAuth } from './auth/use-auth.js';
import { Box, Text } from 'ink';
import { Banner } from './components/ui/Banner.js';

const queryClient = new QueryClient();

// refresh the app every 100ms
const useKeepAlive = () =>
  useEffect(() => {
    setInterval(() => {}, 100);
  }, []);

export const App = () => {
  useKeepAlive();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthWrapper>
        <AppRouter />
      </AuthWrapper>
    </QueryClientProvider>
  );
};

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { data, error, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !data?.isLoggedIn) {
      console.log('Authenticating...');
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

  return (
    <Box flexDirection="column" gap={1}>
      <Banner />
      {content}
    </Box>
  );
}
