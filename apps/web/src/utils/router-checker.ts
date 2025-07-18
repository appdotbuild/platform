export function isHomePage(pathname: string): boolean {
  return pathname === '/';
}

export function isAppPage(pathname: string): boolean {
  return pathname.startsWith('/apps/');
}
