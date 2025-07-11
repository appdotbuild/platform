import { useLocation } from '@tanstack/react-router';
import { isChatPage } from '~/utils/router-checker';

export function Footer() {
  const { pathname } = useLocation();
  return (
    <footer
      className={`flex items-center justify-center py-6 px-40 bg-muted border-t border-border ${
        isChatPage(pathname) ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ viewTransitionName: 'footer' }}
    >
      <span className="text-muted-foreground">developed by databricks.com</span>
    </footer>
  );
}
