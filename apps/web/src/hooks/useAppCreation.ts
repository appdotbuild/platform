import type { App } from '@appdotbuild/core';
import { useState } from 'react';

export function useAppCreation() {
  const [isCreating, setIsCreating] = useState(false);

  const createApp = async (
    _initialMessage: string,
    appName: string,
  ): Promise<App> => {
    setIsCreating(true);

    try {
      // mocked
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const newApp: App = {
        id: `${crypto.randomUUID()}`,
        name: appName,
        traceId: `trace-${crypto.randomUUID()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerId: 'user-123',
        receivedSuccess: false,
        recompileInProgress: false,
        clientSource: 'web',
      };

      return newApp;
    } catch (_) {
      throw new Error('Failed to create app');
    } finally {
      setIsCreating(false);
    }
  };

  return {
    createApp,
    isCreating,
  };
}
