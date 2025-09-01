import { Switch } from '@appdotbuild/design';
import { useStaffMode } from '~/hooks/use-staff-mode';

export function FloatingStaffModeToggle() {
  const { isStaffMode, isActualStaff, toggleStaffMode } = useStaffMode();

  // Only show for actual staff users
  if (!isActualStaff) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-background border rounded-lg p-3 shadow-lg">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Staff Mode</span>
        <Switch
          checked={isStaffMode}
          onCheckedChange={toggleStaffMode}
          aria-label="Toggle staff mode"
        />
      </div>
    </div>
  );
}
