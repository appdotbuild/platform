import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/apps')({
  component: () => <Outlet />,
});
