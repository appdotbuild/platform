import { AccountSettings } from '@stackframe/react';
import { createLazyRoute } from '@tanstack/react-router';

export const AccountSettingsRoute = createLazyRoute(
  '/handler/account-settings',
)({
  component: AccountSettingsPage,
});

export function AccountSettingsPage() {
  return <AccountSettings fullPage={false} />;
}
