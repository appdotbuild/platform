import type { MutationStatus } from '@tanstack/react-query';
import { useInput } from 'ink';
import { useCallback, useEffect, useState } from 'react';
import type { InputHistoryEntry } from './use-terminal-input-history';

interface UseTerminalInputProps {
  history?: InputHistoryEntry[];
  status: MutationStatus;
  onSubmit: (value: string) => void;
  onSubmitSuccess?: (value: string) => void;
  onSubmitError?: (value: string) => void;
  onAbort?: () => void;
}

interface UseTerminalInputReturn {
  currentInput: string;
  submittedValue: string;
  isNavigatingHistory: boolean;
  handleInput: (input: string) => void;
  handleBackspace: () => void;
  handleSubmit: () => void;
  navigateHistoryUp: () => void;
  navigateHistoryDown: () => void;
}

export function useTerminalInput({
  history = [],
  status,
  onSubmit,
  onSubmitSuccess,
  onSubmitError,
  onAbort,
}: UseTerminalInputProps): UseTerminalInputReturn {
  const [currentInput, setCurrentInput] = useState<string>('');
  const [submittedValue, setSubmittedValue] = useState<string>('');
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [draftInput, setDraftInput] = useState<string>('');
  const isNavigatingHistory = historyIndex !== null;

  const handleInput = useCallback((input: string) => {
    // ignore special characters
    if (input === '\n' || input === '\r') return;
    setCurrentInput((prev) => prev + input);
  }, []);

  // remove last character when backspace is pressed
  const handleBackspace = useCallback(() => {
    setCurrentInput((prev) => {
      if (!prev) return '';
      const chars = Array.from(prev);
      chars.pop();
      return chars.join('');
    });
  }, []);

  const handleClearLine = useCallback(() => {
    setCurrentInput('');
  }, []);

  const handleSubmit = useCallback(() => {
    // don't submit empty input
    if (currentInput.trim()) {
      setSubmittedValue(currentInput);
      onSubmit(currentInput);
    }
  }, [currentInput, onSubmit]);

  const handleAbort = useCallback(() => {
    if (onAbort) {
      onAbort();
    }
  }, [onAbort]);

  const navigateHistoryUp = useCallback(() => {
    if (history.length === 0) return;

    // if not navigating, start from the last entry
    if (historyIndex === null) {
      setDraftInput(currentInput);
      const lastHistoryItem = history[history.length - 1];
      if (lastHistoryItem) {
        setHistoryIndex(history.length - 1);
        setCurrentInput(lastHistoryItem.input);
      }
    } else if (historyIndex > 0) {
      const prevHistoryItem = history[historyIndex - 1];
      if (prevHistoryItem) {
        setHistoryIndex(historyIndex - 1);
        setCurrentInput(prevHistoryItem.input);
      }
    }
  }, [history, historyIndex, currentInput]);

  const navigateHistoryDown = useCallback(() => {
    if (historyIndex === null) return;

    // if navigating, restore the draft input
    if (historyIndex < history.length - 1) {
      const nextHistoryItem = history[historyIndex + 1];
      if (nextHistoryItem) {
        setHistoryIndex(historyIndex + 1);
        setCurrentInput(nextHistoryItem.input);
      }
    } else {
      setHistoryIndex(null);
      setCurrentInput(draftInput);
    }
  }, [history, historyIndex, draftInput]);

  // keyboard input handlers
  useInput((input, key) => {
    if (key.escape && status === 'pending') {
      handleAbort();
      return;
    }

    if (status === 'pending') return;

    // submit when enter is pressed
    if (key.return) {
      handleSubmit();
      return;
    }

    if (input && !key.ctrl && !key.meta) {
      handleInput(input);
      return;
    }

    if (key.backspace || key.delete) {
      handleBackspace();
      return;
    }

    // standard action
    if (key.ctrl && input === 'u') {
      handleClearLine();
      return;
    }

    if (key.upArrow) {
      navigateHistoryUp();
      return;
    }

    if (key.downArrow) {
      navigateHistoryDown();
      return;
    }
  });

  // side effect handlers
  useEffect(() => {
    if (!submittedValue) return;

    if (status === 'success') {
      onSubmitSuccess?.(submittedValue);
      setSubmittedValue('');
      setCurrentInput('');
      setHistoryIndex(null);
      setDraftInput('');
    }
    if (status === 'error') {
      onSubmitError?.(submittedValue);
      setSubmittedValue('');
    }
  }, [status, submittedValue, onSubmitSuccess, onSubmitError]);

  return {
    currentInput,
    submittedValue,
    isNavigatingHistory,
    handleInput,
    handleBackspace,
    handleSubmit,
    navigateHistoryUp,
    navigateHistoryDown,
  };
}
