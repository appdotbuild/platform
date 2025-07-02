import { useLocation } from '@tanstack/react-router';
import { isChatPage } from '~/utils/router-checker';

export function Footer() {
  const { pathname } = useLocation();
  return (
    <footer
      className={`flex items-center justify-center py-6 px-40 bg-gray-100 border-t border-gray-200 ${
        isChatPage(pathname) ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ viewTransitionName: 'footer' }}
    >
      <span className="text-gray-600">developed by databricks.com</span>
    </footer>
  );
}
