import { useCallback, useState } from 'react';

interface HistoryItem {
  prompt: string;
  question: string;
  status: 'error' | 'success';
  errorMessage?: string;
  retryMessage?: string;
  successMessage?: string;
}

interface ErrorItem {
  prompt: string;
  question: string;
  errorMessage: string;
  retryMessage: string;
}

interface SuccessItem {
  prompt: string;
  question: string;
  successMessage: string;
}

export function usePromptHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const addErrorItem = useCallback((item: ErrorItem) => {
    setHistory((prev) => [...prev, { ...item, status: 'error' }]);
  }, []);

  const addSuccessItem = useCallback((item: SuccessItem) => {
    setHistory((prev) => [...prev, { ...item, status: 'success' }]);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    history,
    addErrorItem,
    addSuccessItem,
    clearHistory,
  };
}
