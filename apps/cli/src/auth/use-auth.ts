import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from './auth-store.js';
import { stackClientApp } from './auth.js';
import { tokenStorage } from './auth-storage.js';

const authKeys = {
  user: (accessToken: string | undefined) => ['user', accessToken],
};

export function useAuth() {
  const accessToken =
    useAuthStore((state) => state.accessToken) || tokenStorage.getAccessToken();
  const refreshToken =
    useAuthStore((state) => state.refreshToken) ||
    tokenStorage.getRefreshToken();

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: authKeys.user(accessToken?.value),
    queryFn: async () => {
      const user = await stackClientApp.getUser({
        tokenStore: {
          refreshToken: refreshToken?.value ?? '',
          accessToken: accessToken?.value ?? '',
        },
      });

      return { user, isLoggedIn: Boolean(user) };
    },
    enabled: Boolean(accessToken?.value) && Boolean(refreshToken?.value),
  });
}
