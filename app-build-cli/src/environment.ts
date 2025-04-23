export const BACKEND_PRODUCTION_API_HOST =
  'https://platform-muddy-meadow-938.fly.dev';
export const BACKEND_MOCKED_API_HOST = 'http://127.0.0.1:4444';
export const AUTH_HOST = 'http://localhost:3001';

export function getBackendHost() {
  if (process.env.NODE_ENV === 'production') {
    return BACKEND_PRODUCTION_API_HOST;
  } else if (process.env.USE_MOCKED_AGENT === 'true') {
    return BACKEND_MOCKED_API_HOST;
  } else {
    return BACKEND_PRODUCTION_API_HOST;
  }
}

export function getAuthHost() {
  if (process.env.NODE_ENV === 'production') {
    return AUTH_HOST;
  } else {
    return AUTH_HOST;
  }
}
