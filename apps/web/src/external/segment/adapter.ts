import { AnalyticsBrowser } from '@segment/analytics-next';

export const analytics = AnalyticsBrowser.load({
  writeKey: import.meta.env.VITE_SEGMENT_WRITE_KEY,
});
