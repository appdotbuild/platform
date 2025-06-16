import { useMutation } from '@tanstack/react-query';
import { sendEvent } from '../api/application';
import type { AnalyticsEvents, AnalyticsEventType } from '@appdotbuild/core';
import { useAnalyticsStore } from '../store/analytics-store';

export const useAnalytics = () => {
  const { mutate } = useMutation({
    mutationFn: async ({
      eventType,
      eventName,
    }: {
      eventType: AnalyticsEventType;
      eventName?: AnalyticsEvents;
    }) => {
      const isAnalyticsEnabled = useAnalyticsStore.getState().analyticsEnabled;
      if (!isAnalyticsEnabled) return;

      if (!eventType) throw new Error('Event type and name are required');
      if (eventType === 'track' && !eventName)
        throw new Error('Event name is required for tracking');

      return await sendEvent({
        eventType,
        eventName,
      });
    },
  });

  return {
    trackEvent: mutate,
  };
};
