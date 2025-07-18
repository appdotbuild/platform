import { Admin, EditGuesser, ListGuesser } from '@/components/admin';
import { dataProvider } from '@/lib/react-admin/data-provider';
import { Resource } from 'ra-core';
import { AppWindow } from 'lucide-react';
import { createBrowserRouter, RouterProvider, useLocation } from 'react-router';
import { StackHandler, StackProvider, StackTheme } from '@stackframe/react';
import { stackClientApp } from '@/stack';
import { authProvider } from '@/lib/react-admin/auth-provider';
import { lazy } from 'react';
import ShowGuesser from '@/components/admin/show-guesser';

function HandlerRoutes() {
  const location = useLocation();

  return (
    <StackHandler app={stackClientApp} location={location.pathname} fullPage />
  );
}

const AppList = lazy(() => import('@/components/apps-list'));
const AppShow = lazy(() => import('@/components/admin/show-guesser'));

export const App = () => (
  <Admin dataProvider={dataProvider}>
    <Resource
      name="posts"
      list={ListGuesser}
      edit={EditGuesser}
      show={ShowGuesser}
    />
  </Admin>
);
