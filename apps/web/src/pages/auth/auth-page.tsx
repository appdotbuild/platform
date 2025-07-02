import { StackHandler, useUser } from '@stackframe/react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useChat } from '~/hooks/useChat';
import { stackClientApp } from '~/lib/auth';

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

      if (pendingMessage) {
        // remove the pending message
        localStorage.removeItem('pendingMessage');
        setIsProcessing(true);

        // redirect to the app creation flow
        setTimeout(() => {
          createNewApp(pendingMessage);
        }, 100);
      } else {
        requestAnimationFrame(() => {
          navigate({ to: '/' });
        });
      }
    }
  }, [user, navigate, createNewApp]);

  if (isProcessing) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Setting up your app...</div>
      </div>
    );
  }

  return <StackHandler fullPage app={stackClientApp} location={pathname} />;
}
