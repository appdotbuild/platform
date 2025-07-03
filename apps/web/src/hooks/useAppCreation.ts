import { appStateStore } from '~/stores/app-state-store';
import { appsService } from '../external/api/services';

// create new apps
export function useAppCreation() {
  const createApp = async (
    appName: string,
    initialMessage: string,
  ): Promise<string> => {
    try {
      const app = await appsService.createApp({
        appName,
        userMessage: initialMessage,
      });

      // mark app as just created to avoid fetching history
      appStateStore.markAsJustCreated(app.id);
      return app.id;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to create app');
    }
  };

  return {
    createApp,
  };
}
