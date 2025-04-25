'use client';

import { createContext, useContext, type ReactNode } from 'react';

export interface MenuItem {
  href: string;
  label: string;
  icon: any; // Using any here since icons are dynamic imports
  active?: boolean;
  submenus?: MenuItem[];
}

export interface MenuGroup {
  groupLabel?: string;
  menus: MenuItem[];
}

interface ConfigContextType {
  sidebarMenu?: MenuGroup[];
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function ConfigProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: ConfigContextType;
}) {
  return (
    <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}
