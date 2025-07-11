import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { queryClient } from '~/lib/queryClient';
import { Layout } from './components/layout/layout';
import { stackClientApp } from './lib/auth';

const rootRoute = createRootRoute({
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
});

const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/handler/$',
}).lazy(() => import('./pages/auth/auth-page').then((d) => d.AuthPageRoute));

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
}).lazy(() => import('./pages/home-page').then((d) => d.HomePageRoute));

const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/chat/$chatId',
  beforeLoad: async () => {
    const user = await stackClientApp.getUser();
    if (!user) redirect({ to: '/handler/sign-in', throw: true });
  },
}).lazy(() => import('./pages/chat-page').then((d) => d.ChatPageRoute));

const routeTree = rootRoute.addChildren([authRoute, homeRoute, chatRoute]);

export const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
  defaultViewTransition: true,
});
