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
import { AuthPage } from './pages/auth/auth-page';
import { ChatPage } from './pages/chat-page';
import { HomePage } from './pages/home-page';

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
  component: AuthPage,
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/chat/$chatId',
  component: ChatPage,
  beforeLoad: async () => {
    const user = await stackClientApp.getUser();
    if (!user) redirect({ to: '/handler/sign-in', throw: true });
  },
});

const routeTree = rootRoute.addChildren([authRoute, homeRoute, chatRoute]);

export const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
  defaultViewTransition: true,
});
