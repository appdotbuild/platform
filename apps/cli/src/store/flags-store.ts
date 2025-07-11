import { TemplateId } from '@appdotbuild/core';
import { create } from 'zustand';

export const templateMap = {
  python: 'nicegui_agent',
  'trpc-react': 'trpc_agent',
} satisfies Record<string, TemplateId>;

export type TemplateMap = typeof templateMap;

interface FlagsStore {
  databricksMode: boolean;
  setDatabricksMode: (mode: boolean) => void;

  templateId: TemplateId;
  setTemplateId: (templateId: keyof TemplateMap) => void;
}

export const useFlagsStore = create<FlagsStore>((set) => ({
  databricksMode: false,
  setDatabricksMode: (mode) => set({ databricksMode: mode }),

  templateId: 'trpc_agent',
  setTemplateId: (templateId) => set({ templateId: templateMap[templateId] }),
}));
