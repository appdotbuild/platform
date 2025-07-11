export function isHomePage(pathname: string): boolean {
  return pathname === '/';
}

export function isChatPage(pathname: string): boolean {
  return pathname.startsWith('/chat/');
}
