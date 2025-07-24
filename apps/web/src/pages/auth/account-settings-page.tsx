import { AccountSettings } from '@stackframe/react';
import { createLazyRoute } from '@tanstack/react-router';

export const AccountSettingsRoute = createLazyRoute(
  '/handler/account-settings',
)({
  component: AccountSettingsPage,
});

export function AccountSettingsPage() {
  return (
    <div className="mt-24">
      <AccountSettings fullPage={false} />
    </div>
  );
}
