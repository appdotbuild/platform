import { useUser } from '@stackframe/react';

export function useIsStaff() {
  const user = useUser();
  return user?.clientReadOnlyMetadata?.role === 'staff';
}
