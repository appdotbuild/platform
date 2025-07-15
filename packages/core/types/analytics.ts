export const AnalyticsEventType = {
  IDENTIFY: 'identify',
  TRACK: 'track',
} as const;

export type AnalyticsEventType =
  (typeof AnalyticsEventType)[keyof typeof AnalyticsEventType];

export type AnalyticsEvents =
  (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

export type AnalyticsEventBody = {
  eventType: AnalyticsEventType;
  eventName?: AnalyticsEvents;
};

export const AnalyticsEvents = {
  PAGE_VIEW_HOME: 'home',
  PAGE_VIEW_CHAT: 'chat',
  APPS_LISTED: 'apps_listed',
  APP_SELECTED: 'app_selected',
  NEW_APP_SELECTED: 'new_app_selected',
  MESSAGE_SENT: 'message_sent',

  DAILY_LIMIT_REACHED: 'daily_limit_reached',
} as const;
