import { AnalyticsBrowser } from '@segment/analytics-next';

const writeKey = import.meta.env.VITE_SEGMENT_WRITE_KEY;

const createNoopAnalytics = () => ({
  identify: () => {},
  page: () => {},
  track: () => {},
});

export const analytics = writeKey
  ? AnalyticsBrowser.load({ writeKey })
  : createNoopAnalytics();
