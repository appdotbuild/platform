import { isChatPage } from '~/utils/router-checker';

export function Footer() {
  if (isChatPage()) return null;

  return (
    <footer
      className="flex items-center justify-center py-6 px-40 bg-gray-100 border-t border-gray-200"
      style={{ viewTransitionName: 'footer' }}
    >
      <span className="text-gray-600">developed by databricks.com</span>
    </footer>
  );
}
