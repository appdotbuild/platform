/**
 * Custom errors that are shown to the user
 */
export class UserError extends Error {}

/**
 * Error thrown when the user is not authorized to perform the action
 */
export class UnauthorizedError extends UserError {}

/**
 * Exporting shared types
 */
export * from './agent-message';
export * from './types/api';
export * from './types/admin-api';
export * from './types/utils';
export * from './types/analytics';
export * from './types/agent-snapshots';
export * from './platform-api/error';
export * from './platform-api/user';
