import type { App } from '@appdotbuild/core';
import { useNavigate } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';

export function ChatItem({ app, index }: { app: App; index: () => number }) {
  const navigate = useNavigate({ from: '/' });

  const handleAppClick = () => {
    navigate({
      to: `/chat/${app.id}`,
      viewTransition: true,
    });
  };

  return (
    <li
      className={index() > 0 ? 'border-t border-gray-200' : ''}
      onClick={handleAppClick}
      onKeyDown={handleAppClick}
    >
      <div className="block px-6 py-4 hover:bg-gray-50 transition-colors duration-150">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-medium text-gray-900">
              {app.appName || app.name}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Created {new Date(app.createdAt).toLocaleDateString()}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
      </div>
    </li>
  );
}
