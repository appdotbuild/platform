import type * as React from 'react';
import { Toaster } from '@appdotbuild/design/shadcn/toaster';
import { ConfigProvider } from '@appdotbuild/design/components/providers/config-provider';
import { sidebarMenu } from '../settings/menu';

export default function ProvidersClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConfigProvider
      value={{
        sidebarMenu,
      }}
    >
      {children}
      <Toaster />
    </ConfigProvider>
  );
}
