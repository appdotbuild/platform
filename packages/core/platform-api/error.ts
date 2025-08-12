export const API_ERROR_CODE = {
  DAILY_APPS_LIMIT_REACHED: 'daily_apps_limit_reached',
  DAILY_MESSAGE_LIMIT_REACHED: 'daily_message_limit_reached',
} as const;

export class RateLimitError extends Error {
  status: number;
  retryAfter?: number;

  constructor(message: string, retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
    this.status = 429;
    this.retryAfter = retryAfter;
  }
}

export function isRateLimitError(error: Error): error is RateLimitError {
  return error instanceof RateLimitError;
}
