import type { App } from '@appdotbuild/core';
import { useNavigate } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import { StackBadge } from '~/components/chat/stack/stack-badge';
import { AnalyticsEvents, sendEvent } from '~/external/segment';
import { DeleteAppButton } from './delete-app-button';

interface ApplicationItemProps {
  app: App;
}

export function ApplicationItem({ app }: ApplicationItemProps) {
  const navigate = useNavigate({ from: '/' });

  const handleApplicationItemClick = () => {
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
      onClick={handleApplicationItemClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleApplicationItemClick();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex flex-col h-full justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="flex justify-between gap-2 w-full">
              <h3 className="text-base font-medium text-foreground line-clamp-2 flex-1">
                {app.appName || app.name}
              </h3>
              <DeleteAppButton
                appId={app.id}
                appName={app.appName || app.name}
                techStack={app.techStack}
                createdDate={new Date(app.createdAt).toLocaleDateString()}
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Created {new Date(app.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center justify-between mt-4">
          <StackBadge
            templateId={app.techStack}
            variant="outline"
            className="flex-shrink-0"
          />
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
