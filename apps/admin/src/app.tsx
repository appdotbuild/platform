import { Admin } from '@/components/admin';
import { dataProvider } from '@/lib/react-admin/data-provider';
import { Resource } from 'ra-core';
import { AppWindow } from 'lucide-react';
import { createBrowserRouter, RouterProvider, useLocation } from 'react-router';
import { StackHandler, StackProvider, StackTheme } from '@stackframe/react';
import { stackClientApp } from '@/stack';
import { authProvider } from '@/lib/react-admin/auth-provider';
import { lazy } from 'react';

function HandlerRoutes() {
  const location = useLocation();

  return (
    <StackHandler app={stackClientApp} location={location.pathname} fullPage />
  );
}

const AppList = lazy(() => import('@/components/apps-list'));
const AppShow = lazy(() => import('@/components/admin/show-guesser'));

export function App() {
  const router = createBrowserRouter([
    {
      path: '*',
      element: (
        <Admin dataProvider={dataProvider} authProvider={authProvider}>
          <Resource
            name="apps"
            icon={AppWindow}
            // @ts-expect-error - types are wrong
            list={AppList}
            // @ts-expect-error - types are wrong
            edit={AppShow}
          />
        </Admin>
      ),
    },
    {
      path: '/handler/*',
      element: <HandlerRoutes />,
    },
  ]);

  return (
    <StackProvider app={stackClientApp}>
      <StackTheme>
        <RouterProvider router={router} />
      </StackTheme>
    </StackProvider>
  );
}
