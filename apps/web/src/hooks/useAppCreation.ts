import type { AppTemplate } from '@appdotbuild/core';
import { useQueryClient } from '@tanstack/react-query';
import { appStateStore } from '~/stores/app-state-store';
import { appsService } from '../external/api/services';
import { APPS_QUERY_KEY } from './queryKeys';

// create new apps
export function useAppCreation() {
  const queryClient = useQueryClient();

  const createApp = async (
    appName: string,
    initialMessage: string,
    template?: AppTemplate,
  ): Promise<string> => {
    try {
      const app = await appsService.createApp({
        appName,
        userMessage: initialMessage,
        template,
      });

      // mark app as just created to avoid fetching history
      appStateStore.markAsJustCreated(app.id);

      // invalidate apps list cache to show the new app
      await queryClient.invalidateQueries({ queryKey: APPS_QUERY_KEY });

      return app.id;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to create app');
    }
  };

  return {
    createApp,
  };
}
