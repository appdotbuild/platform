import { StackClientApp } from '@stackframe/react';
import { useNavigate } from 'react-router';

export const stackClientApp = new StackClientApp({
  projectId: import.meta.env.VITE_STACK_PROJECT_ID,
  publishableClientKey: import.meta.env.VITE_STACK_PUBLISHABLE_CLIENT_KEY,
  tokenStore: 'cookie',
  urls: {
    afterSignOut: '/handler/sign-in',
    afterSignIn: '/apps',
  },
  redirectMethod: {
    useNavigate,
  },
});
