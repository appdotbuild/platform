import { useLocation } from '@tanstack/react-router';

export function isHomePage(): boolean {
  const { pathname } = useLocation();
  return pathname === '/';
}

export function isChatPage(): boolean {
  const { pathname } = useLocation();
  return pathname.startsWith('/chat/');
}
