import './index.css';
import { StackProvider, StackTheme } from '@stackframe/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { createRoot } from 'react-dom/client';
import { stackClientApp } from '~/lib/auth.ts';
import { queryClient } from './lib/queryClient.ts';
import { router } from './router.tsx';
import { LayoutProvider } from './hooks/useLayout.tsx';

// Apply page-background class to body
document.body.className =
  'page-background flex min-h-screen min-w-[340px] flex-col font-sans antialiased';

createRoot(document.getElementById('root')!).render(
  <StackProvider app={stackClientApp}>
    <StackTheme>
      <QueryClientProvider client={queryClient}>
        <LayoutProvider>
          <RouterProvider router={router} />
        </LayoutProvider>
      </QueryClientProvider>
    </StackTheme>
  </StackProvider>,
);
