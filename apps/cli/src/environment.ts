const BACKEND_PRODUCTION_API_HOST =
  'https://platform-docker-build-appbuild-dev-2f6dd401.koyeb.app';
const BACKEND_LOCAL_API_HOST = 'http://127.0.0.1:4444';

const AUTH_HOST_PRODUCTION = 'https://app.build';
const AUTH_HOST_DEV = 'http://localhost:3001';

export function getBackendHost() {
  if (process.env.NODE_ENV === 'production') {
    return BACKEND_PRODUCTION_API_HOST;
  } else {
    return BACKEND_LOCAL_API_HOST;
  }
}

export function getAuthHost() {
  if (process.env.NODE_ENV === 'production') {
    return AUTH_HOST_PRODUCTION;
  } else {
    return AUTH_HOST_DEV;
  }
}
