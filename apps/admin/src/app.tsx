import { Admin } from '@/components/admin';
import { dataProvider } from '@/lib/react-admin/data-provider';
import { Resource } from 'ra-core';
import { createBrowserRouter, RouterProvider, useLocation } from 'react-router';
import { StackHandler, StackProvider, StackTheme } from '@stackframe/react';
import { stackClientApp } from '@/stack';
import { authProvider } from '@/lib/react-admin/auth-provider';
import { lazy } from 'react';
import { AppWindow, Users } from 'lucide-react';

function HandlerRoutes() {
  const location = useLocation();

  return (
    <StackHandler app={stackClientApp} location={location.pathname} fullPage />
  );
}

const UserList = lazy(() => import('@/components/users-list'));
const AppList = lazy(() => import('@/components/apps-list'));
const Guesser = lazy(() => import('@/components/admin/show-guesser'));

export const App = () => {
  const router = createBrowserRouter([
    {
      path: '/handler/*',
      element: <HandlerRoutes />,
    },
    {
      path: '*',
      element: (
        <Admin dataProvider={dataProvider} authProvider={authProvider}>
          <Resource
            icon={AppWindow}
            name="apps"
            list={AppList}
            show={Guesser}
          />
          <Resource icon={Users} name="users" list={UserList} />
        </Admin>
      ),
    },
  ]);
  return (
    <StackProvider app={stackClientApp}>
      <StackTheme>
        <RouterProvider router={router} />
      </StackTheme>
    </StackProvider>
  );
};
