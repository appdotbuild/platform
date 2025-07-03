import type { App } from '@appdotbuild/core';
import { useState } from 'react';
import { appsService } from '../external/api/services';

export function useAppCreation() {
  const [isCreating, setIsCreating] = useState(false);

  const createApp = async (
    _initialMessage: string,
    appName: string,
  ): Promise<App> => {
    setIsCreating(true);

    try {
      const app = await appsService.createApp({ appName });
      return app;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to create app');
    } finally {
      setIsCreating(false);
    }
  };

  return {
    createApp,
    isCreating,
  };
}
