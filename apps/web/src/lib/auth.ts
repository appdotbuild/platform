import { StackClientApp } from '@stackframe/react';
import { router } from '~/router';

export const stackClientApp = new StackClientApp({
  projectId: import.meta.env.VITE_STACK_PROJECT_ID,
  publishableClientKey: import.meta.env.VITE_STACK_PUBLISHABLE_CLIENT_KEY,
  tokenStore: 'cookie',
  urls: {
    afterSignOut: '/',
    afterSignIn: '/chat/new',
  },
  redirectMethod: {
    navigate: (to: string) => {
      // small delay to avoid redirect and state mismatch
      setTimeout(() => {
        router.navigate({ to: to, replace: true });
      }, 2000);
    },
    useNavigate: () => (to: string) => {
      setTimeout(() => {
        router.navigate({ to: to, replace: true });
      }, 2000);
    },
  },
});
