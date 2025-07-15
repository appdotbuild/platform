import type { AnalyticsEvents } from '@appdotbuild/core';
import type { CurrentUser } from '@stackframe/react';
import { analytics } from './adapter';

export function sendIdentify(user: CurrentUser) {
  analytics.identify(user.id, {
    email: user.primaryEmail,
    name: user.displayName,
  });
}

export function sendPageView(pathname: string) {
  analytics.page(pathname);
}

export function sendEvent(eventName: AnalyticsEvents) {
  if (!eventName) return;
  analytics.track(eventName);
}
