import { StackHandler, useUser } from '@stackframe/react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { stackClientApp } from '~/lib/auth';

export function AuthPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const user = useUser();
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (user && !hasNavigated.current) {
      hasNavigated.current = true;
      requestAnimationFrame(() => {
        navigate({ to: '/' });
      });
    }
  }, [user, navigate]);

  return <StackHandler fullPage app={stackClientApp} location={pathname} />;
}
