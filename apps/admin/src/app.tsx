import { Admin, ShowGuesser } from '@/components/admin';
import { AppList } from '@/components/apps-list';
import { dataProvider } from '@/lib/api/data-provider';
import { CustomRoutes, Resource } from 'ra-core';
import { AppWindow } from 'lucide-react';
import {
  createBrowserRouter,
  Route,
  RouterProvider,
  useLocation,
} from 'react-router';
import { StackHandler, StackProvider, StackTheme } from '@stackframe/react';
import { stackClientApp } from './stack';

function HandlerRoutes() {
  const location = useLocation();

  return (
    <StackHandler app={stackClientApp} location={location.pathname} fullPage />
  );
}

export function App() {
  const router = createBrowserRouter([
    {
      path: '*',
      element: (
        <StackProvider app={stackClientApp}>
          <StackTheme>
            <Admin dataProvider={dataProvider}>
              <Resource
                name="apps"
                icon={AppWindow}
                list={AppList}
                show={ShowGuesser}
              />
              <CustomRoutes>
                <Route path="/handler/*" element={<HandlerRoutes />} />
              </CustomRoutes>
            </Admin>
          </StackTheme>
        </StackProvider>
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
}
