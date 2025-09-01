# Floating Staff Mode Toggle Implementation Plan

## Overview

Add a floating staff mode toggle to the web app that allows staff users to switch between staff and non-staff views for testing and debugging purposes. This will replace the existing `useIsStaff` hook with a new `useStaffMode` hook that manages both staff status detection and current viewing mode.

## Current State Analysis

**Existing Implementation:**
- Staff detection: `apps/web/src/hooks/use-is-staff.ts:3-6` checks `user?.clientReadOnlyMetadata?.role === 'staff'`
- Current usage: `apps/web/src/pages/home/authenticated-home.tsx:58-63` conditionally shows `DeploymentTargetSelector` for staff
- UI patterns: Switch component available at `packages/design/components/ui/switch.tsx`
- State management: Zustand pattern used in `apps/cli/src/store/flags-store.ts:20-26`

**Key Discoveries:**
- Staff role stored in Stack Auth's `clientReadOnlyMetadata.role` field
- Only one current usage of `useIsStaff` hook in authenticated home page
- Existing floating UI patterns use `fixed` positioning with `z-50`
- Theme toggle pattern in admin app shows dropdown approach with persistent state

## Desired End State

**After implementation:**
- Staff users see a floating toggle switch in bottom-right corner of web app
- Toggle allows switching between staff mode (original behavior) and non-staff mode (hidden staff features)
- `useIsStaff` hook is completely replaced by `useStaffMode` hook
- State resets on page refresh, defaulting to actual staff status
- Only visible to actual staff users

**Verification:**
- Staff user can toggle between modes and see DeploymentTargetSelector show/hide accordingly
- Non-staff users don't see the toggle at all
- State resets properly on page refresh
- No references to `useIsStaff` remain in codebase

## What We're NOT Doing

- Not adding persistence across browser sessions (resets on refresh)
- Not adding visual indicators beyond the toggle itself
- Not implementing in admin app (web app only)
- Not changing actual authentication or permissions (view-only toggle)

## Implementation Approach

Replace the boolean staff check with a stateful mode system using Zustand for state management, following existing patterns in the codebase for feature flags and UI component patterns for floating elements.

## Phase 1: Create Staff Mode State Management

### Overview
Create the core state management system and `useStaffMode` hook to replace `useIsStaff`.

### Changes Required:

#### 1. Staff Mode Store
**File**: `apps/web/src/stores/staff-mode-store.ts`
**Changes**: Create new Zustand store for staff mode state

```typescript
import { create } from 'zustand';

interface StaffModeState {
  isStaffModeEnabled: boolean;
  setStaffModeEnabled: (enabled: boolean) => void;
}

export const useStaffModeStore = create<StaffModeState>((set) => ({
  isStaffModeEnabled: false,
  setStaffModeEnabled: (enabled) => set({ isStaffModeEnabled: enabled }),
}));
```

#### 2. Staff Mode Hook
**File**: `apps/web/src/hooks/use-staff-mode.ts`
**Changes**: Create new hook that combines staff detection with mode toggle

```typescript
import { useUser } from '@stackframe/react';
import { useEffect } from 'react';
import { useStaffModeStore } from '~/stores/staff-mode-store';

export function useStaffMode() {
  const user = useUser();
  const { isStaffModeEnabled, setStaffModeEnabled } = useStaffModeStore();
  
  const isActualStaff = user?.clientReadOnlyMetadata?.role === 'staff';
  
  // Initialize staff mode based on actual staff status on mount
  useEffect(() => {
    setStaffModeEnabled(isActualStaff);
  }, [isActualStaff, setStaffModeEnabled]);
  
  const toggleStaffMode = () => {
    setStaffModeEnabled(!isStaffModeEnabled);
  };
  
  return {
    isStaffMode: isStaffModeEnabled,
    isActualStaff,
    toggleStaffMode,
  };
}
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `bun types:check`
- [x] Linting passes: `bun lint`
- [x] Store exports correctly and hook returns expected interface

#### Manual Verification:
- [ ] Hook initializes with correct default state for staff/non-staff users
- [ ] Toggle function properly updates state
- [ ] State resets on page refresh

---

## Phase 2: Create Floating Toggle Component

### Overview
Build the floating toggle UI component that only appears for actual staff users.

### Changes Required:

#### 1. Floating Staff Mode Toggle Component
**File**: `apps/web/src/components/shared/floating-staff-mode-toggle.tsx`
**Changes**: Create floating toggle component with Switch

```typescript
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
```

### Success Criteria:

#### Automated Verification:
- [x] Component renders without errors
- [x] TypeScript compilation passes: `bun types:check`
- [x] Linting passes: `bun lint`

#### Manual Verification:
- [ ] Toggle appears in bottom-right corner for staff users
- [ ] Toggle is hidden for non-staff users
- [ ] Switch component responds to clicks properly
- [ ] Component has proper z-index and doesn't interfere with other UI

---

## Phase 3: Replace useIsStaff Usage

### Overview
Update existing components to use the new `useStaffMode` hook instead of `useIsStaff`.

### Changes Required:

#### 1. Update Authenticated Home Page
**File**: `apps/web/src/pages/home/authenticated-home.tsx`
**Changes**: Replace `useIsStaff` import and usage with `useStaffMode`

```typescript
// Replace line 15:
import { useStaffMode } from '~/hooks/use-staff-mode';

// Replace line 20:
const { isStaffMode } = useStaffMode();

// Replace line 58:
{isStaffMode && (
  <DeploymentTargetSelector
    ref={deploymentSelectorRef}
    onChange={setDeploymentTarget}
  />
)}
```

#### 2. Remove Old Hook
**File**: `apps/web/src/hooks/use-is-staff.ts`
**Changes**: Delete this file entirely

### Success Criteria:

#### Automated Verification:
- [x] No references to `useIsStaff` remain in codebase: `grep -r "useIsStaff" apps/web/src/`
- [x] TypeScript compilation passes: `bun types:check`
- [x] Linting passes: `bun lint`
- [ ] Build completes successfully: `bun build`

#### Manual Verification:
- [ ] DeploymentTargetSelector shows/hides based on staff mode toggle
- [ ] No console errors or runtime issues
- [ ] Existing functionality works unchanged when in staff mode

---

## Phase 4: Integration & Layout Integration

### Overview
Integrate the floating toggle into the main app layout and ensure proper positioning.

### Changes Required:

#### 1. Add Toggle to Main Layout
**File**: `apps/web/src/components/shared/layout.tsx` (or main layout file)
**Changes**: Add FloatingStaffModeToggle to layout

```typescript
import { FloatingStaffModeToggle } from '~/components/shared/floating-staff-mode-toggle';

// Add to layout JSX:
<FloatingStaffModeToggle />
```

### Success Criteria:

#### Automated Verification:
- [ ] Application starts without errors: `bun dev`
- [x] TypeScript compilation passes: `bun types:check`
- [x] Linting passes: `bun lint`
- [ ] Build completes successfully: `bun build`

#### Manual Verification:
- [ ] Toggle appears on all pages for staff users
- [ ] Toggle maintains position when scrolling
- [ ] Toggle doesn't interfere with other floating elements
- [ ] State persists when navigating between pages
- [ ] State resets properly on page refresh

---

## Testing Strategy


### Manual Testing Steps:
1. **As Staff User**:
   - Load app and verify toggle appears in bottom-right
   - Verify DeploymentTargetSelector is initially visible
   - Click toggle to disable staff mode
   - Verify DeploymentTargetSelector disappears
   - Navigate to different pages, verify toggle persists
   - Refresh page, verify state resets to staff mode enabled

2. **As Non-Staff User**:
   - Load app and verify toggle does not appear
   - Verify DeploymentTargetSelector is never visible
   - Navigate around app, verify no toggle anywhere

3. **Edge Cases**:
   - Test rapid toggle clicking
   - Test with different screen sizes for positioning
   - Test with browser zoom levels

## Performance Considerations

- Zustand store is lightweight and won't impact performance
- Component conditional rendering avoids unnecessary DOM nodes for non-staff users
- useEffect dependency array properly optimized to prevent unnecessary re-initializations

## References

- Current staff detection: `apps/web/src/hooks/use-is-staff.ts:3-6`
- Usage example: `apps/web/src/pages/home/authenticated-home.tsx:58-63`
- Switch component: `packages/design/components/ui/switch.tsx`
- State management pattern: `apps/cli/src/store/flags-store.ts:20-26`
- Floating UI pattern: Fixed positioning with `z-50` class