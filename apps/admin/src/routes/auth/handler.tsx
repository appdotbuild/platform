import { createFileRoute } from '@tanstack/react-router';
import { StackHandler } from '@stackframe/react';
import { stackClientApp } from '../../lib/auth';
import { useLocation } from '@tanstack/react-router';

function AuthHandler() {
  const location = useLocation();
  return (
    <StackHandler fullPage app={stackClientApp} location={location.pathname} />
  );
}

export const Route = createFileRoute('/auth/handler')({
  component: AuthHandler,
});
