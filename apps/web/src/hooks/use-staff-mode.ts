import { useUser } from '@stackframe/react';
import { useEffect, useRef } from 'react';
import { useStaffModeStore } from '~/stores/staff-mode-store';
import { isStaffUser } from '@appdotbuild/core';

export function useStaffMode() {
  const user = useUser();
  const { isStaffModeEnabled, setStaffModeEnabled } = useStaffModeStore();
  const initializedRef = useRef<string | null>(null);

  const isActualStaff = isStaffUser(user);

  // Only initialize staff mode when user changes, not on every mount
  useEffect(() => {
    const userId = user?.id || null;

    // Only reset if this is a different user or first time
    if (initializedRef.current !== userId) {
      setStaffModeEnabled(isActualStaff);
      initializedRef.current = userId;
    }
  }, [user?.id, isActualStaff, setStaffModeEnabled]);

  const toggleStaffMode = () => {
    setStaffModeEnabled(!isStaffModeEnabled);
  };

  return {
    isStaffMode: isStaffModeEnabled,
    isActualStaff,
    toggleStaffMode,
  };
}
