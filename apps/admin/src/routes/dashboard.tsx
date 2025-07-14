import { createFileRoute, Outlet } from '@tanstack/react-router';
import { UserButton } from '@stackframe/react';
import { DashboardLayout } from '@appdotbuild/design/components/dashboard/layout';
import { useUser } from '@stackframe/react';

function DashboardLayoutComponent() {
  const user = useUser();

  return (
    <DashboardLayout
      userMenu={<UserButton />}
      signOut={async () => user?.signOut()}
    >
      <Outlet />
    </DashboardLayout>
  );
}

export const Route = createFileRoute('/dashboard')({
  component: DashboardLayoutComponent,
});
