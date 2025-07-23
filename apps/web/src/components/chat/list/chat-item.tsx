import type { App } from '@appdotbuild/core';
import { useNavigate } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import { AnalyticsEvents, sendEvent } from '~/external/segment';

interface ChatItemProps {
  app: App;
}

export function ChatItem({ app }: ChatItemProps) {
  const navigate = useNavigate({ from: '/' });

  const handleAppClick = () => {
    sendEvent(AnalyticsEvents.APP_SELECTED);
    navigate({
      to: `/apps/${app.id}`,
      viewTransition: true,
      replace: true,
    });
  };

  return (
    <div
      className="h-full bg-background border border-input rounded-lg p-4 hover:bg-muted/50 transition-colors duration-150 cursor-pointer"
      onClick={handleAppClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleAppClick();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex flex-col h-full justify-between">
        <div>
          <h3 className="text-base font-medium text-foreground line-clamp-2">
            {app.appName || app.name}
          </h3>
          <p className="text-sm text-muted-foreground mt-2">
            Created {new Date(app.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center justify-end mt-4">
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
