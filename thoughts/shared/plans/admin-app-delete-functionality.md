# Admin App Delete Functionality Implementation Plan

## Overview

Implement delete functionality in the Admin interface that allows privileged users to delete any app, regardless of ownership. This involves creating a new admin-specific delete endpoint and updating the frontend data provider to use it.

## Current State Analysis

**Existing Delete Implementation:**
- User delete endpoint: `DELETE /apps/:id` - restricted to app owner only (`apps/backend/src/apps/delete-app.ts:48`)
- Admin UI has delete buttons but uses user endpoint (`apps/admin/src/lib/react-admin/data-provider.ts:504`)
- Comprehensive external resource cleanup exists (Koyeb, Neon, ECR, GitHub, Databricks)
- Sophisticated soft delete with proper logging and error handling

**Authentication Pattern:**
- Admin routes use: `{ onRequest: [app.authenticate, requirePrivilegedUser] }`
- Privileged users: `platform_admin`, `staff` roles + Neon employees + Databricks employees

**Admin Frontend:**
- React Admin framework with existing DeleteButton and BulkDeleteButton components
- Data provider expects delete endpoint to work for any app admin can see
- Proper undoable mutations and toast notifications already implemented

### Key Discoveries:
- Delete logic in `deleteApp` function is well-designed and can be reused
- Only ownership check needs to be removed for admin version
- Admin already has proper authentication middleware pattern
- Frontend delete UI components already exist and work

## Desired End State

After implementation, admin users will be able to:
1. Delete any app from the admin interface using existing UI buttons
2. Perform bulk delete operations on multiple apps
3. Receive proper success/error feedback through existing toast system
4. Have all external resources properly cleaned up (same as user delete)

### Verification:
- Admin can delete apps they don't own
- All external resource cleanup still works correctly
- Bulk delete operations work for multiple apps
- Error handling and logging work properly
- Non-admin users cannot access the admin delete endpoint

## What We're NOT Doing

- Modifying the existing user delete endpoint or its business logic
- Changing the external resource cleanup logic (Koyeb, Neon, ECR, GitHub, Databricks)
- Adding new admin UI components (existing DeleteButton/BulkDeleteButton work)
- Modifying authentication/authorization logic for admin access
- Adding restore functionality (exists but not needed for this task)

## Implementation Approach

Create an admin-specific delete endpoint that reuses existing delete logic but removes the ownership restriction. Update the frontend data provider to use the admin endpoint when available.

## Phase 1: Backend Admin Delete Endpoint

### Overview
Create a new admin delete endpoint that allows privileged users to delete any app.

### Changes Required:

#### 1. Admin Apps Module
**File**: `apps/backend/src/apps/admin/apps.ts`
**Changes**: Add new `deleteAppForAdmin` function

```typescript
export async function deleteAppForAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { id } = request.params as { id: string };

  if (!validate(id)) {
    return reply.status(400).send({ error: 'Invalid app ID' });
  }

  try {
    const app = await db
      .select({
        id: apps.id,
        name: apps.name,
        ownerId: apps.ownerId,
        // ... all other fields same as user delete
      })
      .from(apps)
      .where(eq(apps.id, id)); // Remove ownership check

    if (!app || app.length === 0) {
      return reply.status(404).send({
        error: 'App not found',
      });
    }

    // Use existing delete logic from deleteApp function
    // Extract shared logic to avoid duplication
  } catch (error) {
    // Same error handling as user delete
  }
}
```

#### 2. Shared Delete Logic
**File**: `apps/backend/src/apps/delete-app-shared.ts`
**Changes**: Extract reusable delete logic from existing deleteApp function

```typescript
export async function executeAppDeletion(
  appId: string,
  ownerId: string,
  appData: AppData,
): Promise<void> {
  // Move all deletion logic here from deleteApp function
  // This allows both user and admin endpoints to use same logic
}
```

#### 3. Route Registration
**File**: `apps/backend/src/index.ts`
**Changes**: Add admin delete route

```typescript
app.delete(
  '/admin/apps/:id',
  { onRequest: [app.authenticate, requirePrivilegedUser] },
  deleteAppForAdmin,
);
```

#### 4. Export New Function
**File**: `apps/backend/src/apps/index.ts`
**Changes**: Export the new admin delete function

```typescript
export { deleteAppForAdmin } from './admin/apps';
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `bun types:check`
- [x] Linting passes: `bun lint`
- [ ] Backend starts without errors: `bun dev`
- [ ] New endpoint returns 404 for non-existent apps
- [ ] New endpoint returns 403 for non-privileged users

#### Manual Verification:
- [ ] Admin can delete any app via `DELETE /admin/apps/:id`
- [ ] External resource cleanup works correctly
- [ ] Logging shows proper admin context
- [ ] Error handling works for various failure scenarios

---

## Phase 2: Frontend Data Provider Update

### Overview
Update the React Admin data provider to use the admin delete endpoint for app deletions.

### Changes Required:

#### 1. Admin-Specific Delete Logic
**File**: `apps/admin/src/lib/react-admin/data-provider.ts`
**Changes**: Update apps resource delete methods to use admin endpoint

```typescript
apps: {
  // ... existing methods

  delete: async (params: DeleteParams): Promise<DeleteResult<AppRecord>> => {
    // Use admin endpoint instead of user endpoint
    const response = await apiClient.delete<App>(`/admin/apps/${params.id}`);
    return {
      data: convertAppToRecord(response.data),
    };
  },

  deleteMany: async (params: DeleteManyParams): Promise<DeleteManyResult> => {
    // Use admin endpoint for bulk delete
    await Promise.all(
      params.ids.map((id) => apiClient.delete(`/admin/apps/${id}`)),
    );

    return {
      data: params.ids,
    };
  },

  // ... rest of methods
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation passes: `bun types:check`
- [ ] Linting passes: `bun lint`
- [ ] Admin frontend builds successfully: `bun dev`
- [ ] No console errors during delete operations

#### Manual Verification:
- [ ] Single app delete works from admin interface
- [ ] Bulk delete works for multiple selected apps
- [ ] Success toast notifications appear
- [ ] Failed deletes show error messages
- [ ] App list refreshes after successful delete
- [ ] Undoable delete functionality works correctly

---

## Phase 3: Integration Testing & Cleanup

### Overview
Test the complete end-to-end functionality and ensure proper error handling.

### Changes Required:

#### 1. Refactor Original Delete Function
**File**: `apps/backend/src/apps/delete-app.ts`
**Changes**: Update to use shared delete logic

```typescript
export async function deleteApp(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // Keep ownership check for user endpoint
  const app = await db
    .select({...})
    .from(apps)
    .where(and(eq(apps.id, id), eq(apps.ownerId, user.id))); // Keep this check

  // Use shared executeAppDeletion function
  await executeAppDeletion(id, user.id, appData);
}
```

### Success Criteria:

#### Automated Verification:
- [ ] All backend tests pass: `bun test`
- [ ] All frontend tests pass: `cd apps/admin && bun test`
- [ ] Integration tests pass with admin delete scenarios
- [ ] No TypeScript or linting errors

#### Manual Verification:
- [ ] Admin delete works for apps owned by different users
- [ ] User delete still works and only allows own apps
- [ ] Non-admin users get 403 when trying admin endpoint
- [ ] All external resources are properly cleaned up
- [ ] Logging includes proper context for admin vs user deletes
- [ ] Error scenarios are handled gracefully
- [ ] UI feedback is appropriate for success and failure cases

---

## Testing Strategy

### Unit Tests:
- Test admin delete endpoint with various app states
- Test ownership validation bypass for admin endpoint
- Test error handling for invalid app IDs
- Test authentication failures

### Integration Tests:
- End-to-end delete flow from admin UI
- External resource cleanup verification
- Bulk delete operations
- Error scenarios and recovery

### Manual Testing Steps:
1. Login as admin user in admin interface
2. Navigate to apps list and select an app owned by another user
3. Click delete button and verify deletion succeeds
4. Check that external resources are cleaned up properly
5. Test bulk delete with multiple apps from different owners
6. Verify error handling for apps that don't exist
7. Test that non-admin users cannot access the admin endpoint

## Performance Considerations

The admin delete functionality reuses all existing delete logic, so there are no additional performance implications. The external resource cleanup is already optimized with proper error handling and async operations where appropriate.

## Migration Notes

No data migration required - this is purely additive functionality that adds a new endpoint and updates frontend behavior.

## References

- Original user delete implementation: `apps/backend/src/apps/delete-app.ts`
- Admin authentication pattern: `apps/backend/src/middleware/neon-employee-auth.ts`
- React Admin data provider: `apps/admin/src/lib/react-admin/data-provider.ts`
- Admin delete components: `apps/admin/src/components/admin/delete-button.tsx`