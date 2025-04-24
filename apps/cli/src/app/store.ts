import { create } from 'zustand';
import type { AppConfig } from './steps/steps.js';
import type { StateCreator } from 'zustand';

type HistoryEntry = {
  question: string;
  answer: string;
};

type GenerationStage = 'specs' | 'generation' | 'iteration';

interface WizardState {
  config: AppConfig;
  history: HistoryEntry[];
  appMessageHistory: Record<GenerationStage, string[]>;

  // Actions
  setConfig: (config: Partial<AppConfig>) => void;
  addToHistory: (question: string, answer: string) => void;
  addMessageToAppHistory: (stage: GenerationStage, message: string) => void;
}

export const useCreateAppWizardStore = create<WizardState>((set) => ({
  config: {
    useStaging: false,
    prompt: '',
  },
  history: [],
  appMessageHistory: {
    specs: [],
    generation: [],
    iteration: [],
  },

  addMessageToAppHistory: (stage: GenerationStage, message: string) =>
    set((state) => ({
      appMessageHistory: {
        ...state.appMessageHistory,
        [stage]: [...state.appMessageHistory[stage], message],
      },
    })),

  setConfig: (configUpdate: Partial<AppConfig>) =>
    set((state) => ({
      config: { ...state.config, ...configUpdate },
    })),

  addToHistory: (question: string, answer: string) =>
    set((state) => {
      const newHistory = state.history.filter((h) => h.question !== question);

      return {
        history: [...newHistory, { question, answer }],
      };
    }),
}));
