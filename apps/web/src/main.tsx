import { StackProvider, StackTheme } from '@stackframe/react';
import { createRoot } from 'react-dom/client';
import { stackClientApp } from '~/lib/auth.ts';
import './index.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { queryClient } from './lib/queryClient.ts';
import { router } from './router.tsx';

createRoot(document.getElementById('root')!).render(
  <StackProvider app={stackClientApp}>
    <StackTheme>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StackTheme>
  </StackProvider>,
);
