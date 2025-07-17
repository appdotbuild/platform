import { StackClientApp } from '@stackframe/react';
import { router } from '~/router';

export const stackClientApp = new StackClientApp({
  projectId: import.meta.env.VITE_STACK_PROJECT_ID,
  publishableClientKey: import.meta.env.VITE_STACK_PUBLISHABLE_CLIENT_KEY,
  tokenStore: 'cookie',
  urls: {
    afterSignOut: '/',
    afterSignIn: '/chat/new',
    accountSettings: '/handler/account-settings',
  },
  redirectMethod: {
    navigate: (to: string) => {
      router.navigate({ to: to, replace: true });
    },
    useNavigate: () => (to: string) => {
      router.navigate({ to: to, replace: true });
    },
  },
});
