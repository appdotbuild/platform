import type { TemplateId } from '@appdotbuild/core';
import { StackHandler, useUser } from '@stackframe/react';
import {
  createLazyRoute,
  useLocation,
  useNavigate,
} from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useChat } from '~/hooks/useChat';
import { stackClientApp } from '~/lib/auth';

export const AuthPageRoute = createLazyRoute('/handler/$')({
  component: AuthPage,
});

export function AuthPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const user = useUser();
  const { createNewApp } = useChat();
  const hasNavigated = useRef(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (user && !hasNavigated.current) {
      hasNavigated.current = true;

      // check if already started a new app
      const pendingMessage = localStorage.getItem('pendingMessage');
      const pendingTemplateId =
        localStorage.getItem('pendingTemplateId') || 'trpc_agent';

      if (pendingMessage) {
        // remove the pending message
        localStorage.removeItem('pendingMessage');
        localStorage.removeItem('pendingTemplateId');
        setIsProcessing(true);

        // redirect to the app creation flow
        setTimeout(() => {
          createNewApp({
            firstInput: pendingMessage,
            templateId: pendingTemplateId as TemplateId,
          });
        }, 100);
      } else if (!pathname.includes('cli-auth-confirm')) {
        requestAnimationFrame(() => {
          navigate({ to: '/' });
        });
      }
    }
  }, [user, navigate, createNewApp, pathname]);

  if (isProcessing) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-foreground">Setting up your app...</div>
      </div>
    );
  }

  return <StackHandler fullPage app={stackClientApp} location={pathname} />;
}
