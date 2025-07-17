import { AnalyticsEvents, type App } from '@appdotbuild/core';
import { useNavigate } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import { sendEvent } from '~/external/segment';

interface ChatItemProps {
  app: App;
  index: () => number;
}

export function ChatItem({ app, index }: ChatItemProps) {
  const navigate = useNavigate({ from: '/' });

  const handleAppClick = () => {
    sendEvent(AnalyticsEvents.APP_SELECTED);
    navigate({
      to: `/chat/${app.id}`,
      viewTransition: true,
      replace: true,
    });
  };

  return (
    <li
      className={index() > 0 ? 'border-t border-border' : ''}
      onClick={handleAppClick}
      onKeyDown={handleAppClick}
    >
      <div className="block px-6 py-4 hover:bg-muted/50 transition-colors duration-150 cursor-pointer">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-medium text-foreground">
              {app.appName || app.name}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Created {new Date(app.createdAt).toLocaleDateString()}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>
    </li>
  );
}
