import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { useCallback, useEffect, useRef, useState } from 'react';
import { APP_USER_HISTORY_DIR } from '../constants';

export interface InputHistoryEntry {
  timestamp: number;
  input: string;
}

interface HistoryConfig {
  maxEntries?: number;
  filePath?: string;
  sensitivePatterns?: RegExp[];
}

const DEFAULT_CONFIG: Required<HistoryConfig> = {
  maxEntries: 10000,
  filePath: APP_USER_HISTORY_DIR,
  sensitivePatterns: [
    /password\s*=\s*['"][^'"]+['"]/i,
    /token\s*=\s*['"][^'"]+['"]/i,
    /secret\s*=\s*['"][^'"]+['"]/i,
    /key\s*=\s*['"][^'"]+['"]/i,
    /credential\s*=\s*['"][^'"]+['"]/i,
  ],
};

export function useInputHistory(config: HistoryConfig = {}) {
  const [historyItems, setHistoryItems] = useState<InputHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const configRef = useRef({ ...DEFAULT_CONFIG, ...config });

  const loadHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { filePath } = configRef.current;
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const loadedItems = JSON.parse(fileContent) as InputHistoryEntry[];

      setHistoryItems(loadedItems);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        setHistoryItems([]);
      } else {
        setError(err as Error);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveHistory = useCallback(async (newItems: InputHistoryEntry[]) => {
    try {
      const { filePath, maxEntries } = configRef.current;
      const trimmedItems = newItems.slice(-maxEntries);

      await fs.mkdir(join(filePath, '..'), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(trimmedItems, null, 2));

      setHistoryItems(trimmedItems);
    } catch (err) {
      setError(err as Error);
    }
  }, []);

  const isSensitiveInput = useCallback((input: string) => {
    const { sensitivePatterns } = configRef.current;
    return sensitivePatterns.some((pattern) => pattern.test(input));
  }, []);

  const addInputHistory = useCallback(
    async (input: string) => {
      if (!input.trim() || isSensitiveInput(input)) return;

      // if last entry is the same, do not add
      const trimmedInput = input.trim();
      const lastItem = historyItems[historyItems.length - 1];
      if (lastItem?.input === trimmedInput) return;

      const newItem: InputHistoryEntry = {
        timestamp: Date.now(),
        input: trimmedInput,
      };

      const updatedItems = [...historyItems, newItem];
      await saveHistory(updatedItems);
    },
    [historyItems, isSensitiveInput, saveHistory],
  );

  const clearHistory = useCallback(async () => {
    await saveHistory([]);
  }, [saveHistory]);

  const getRecentInputs = useCallback(
    (limit = 10) => {
      return historyItems.slice(-limit);
    },
    [historyItems],
  );

  const findSimilarInputs = useCallback(
    (query: string) => {
      const normalizedQuery = query.toLowerCase();
      return historyItems.filter((item) =>
        item.input.toLowerCase().includes(normalizedQuery),
      );
    },
    [historyItems],
  );

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return {
    historyItems,
    isLoading,
    error,
    addInputHistory,
    clearHistory,
    getRecentInputs,
    findSimilarInputs,
    reloadHistory: loadHistory,
  };
}
