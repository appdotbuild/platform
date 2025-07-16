import { Admin, ShowGuesser } from '@/components/admin';
import { AppList } from '@/components/apps-list';
import { dataProvider } from '@/lib/react-admin/data-provider';
import { Resource } from 'ra-core';
import { AppWindow } from 'lucide-react';
import { createBrowserRouter, RouterProvider, useLocation } from 'react-router';
import { StackHandler, StackProvider, StackTheme } from '@stackframe/react';
import { stackClientApp } from '@/stack';
import { authProvider } from '@/lib/react-admin/auth-provider';

function HandlerRoutes() {
  const location = useLocation();

  return (
    <StackHandler app={stackClientApp} location={location.pathname} fullPage />
  );
}

export function App() {
  const router = createBrowserRouter([
    {
      path: '/dashboard/*',
      element: (
        <Admin
          dataProvider={dataProvider}
          authProvider={authProvider}
          basename="/dashboard"
        >
          <Resource
            name="apps"
            icon={AppWindow}
            list={AppList}
            show={ShowGuesser}
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
