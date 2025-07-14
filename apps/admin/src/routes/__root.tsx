import { createRootRoute, Outlet, redirect } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { stackClientApp } from '../lib/auth';
import ProvidersClient from '../components/providers-client';
import { StackProvider, StackTheme } from '@stackframe/react';

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    // Skip auth check for auth routes
    if (location.pathname.startsWith('/auth/')) {
      return;
    }

    // try {
    //   const user = await stackClientApp.getUser();
    //   if (!user) {
    //     throw redirect({
    //       to: '/auth/handler',
    //       search: {
    //         redirect: location.href,
    //       },
    //     });
    //   }
    // } catch (error) {
    //   // If there's an error getting user, redirect to auth
    //   throw redirect({
    //     to: '/auth/handler',
    //     search: {
    //       redirect: location.href,
    //     },
    //   });
    // }
  },
  component: () => (
    <StackProvider app={stackClientApp}>
      <StackTheme>
        <ProvidersClient>
          <Outlet />
          <TanStackRouterDevtools />
        </ProvidersClient>
      </StackTheme>
    </StackProvider>
  ),
});
