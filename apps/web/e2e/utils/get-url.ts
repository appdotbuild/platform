export function getUrl(path = '/') {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5173';

  const url = new URL(path, baseUrl);

  return url.toString();
}
