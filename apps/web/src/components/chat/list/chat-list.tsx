import { AnalyticsEvents, type App } from '@appdotbuild/core';
import { useNavigate } from '@tanstack/react-router';
import { ChevronRight, LayoutGrid } from 'lucide-react';
import { useEffect, useRef } from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '~/components/shared/carousel/carousel';
import { sendEvent } from '~/external/segment';
import { useAppsList } from '~/hooks/useAppsList';
import { cn } from '~/lib/utils';

interface ChatItemCardProps {
  app: App;
}

function ChatItemCard({ app }: ChatItemCardProps) {
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

export function ChatList() {
  const hasLoadedOnceRef = useRef(false);
  const hasTrackedViewRef = useRef(false);

  const {
    apps,
    isLoadingApps,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    appsError,
  } = useAppsList();

  useEffect(() => {
    if (!isLoadingApps && !hasLoadedOnceRef.current) {
      hasLoadedOnceRef.current = true;
    }
  }, [isLoadingApps]);

  const hasLoadedOnce = hasLoadedOnceRef.current;

  useEffect(() => {
    if (apps.length > 0 && !hasTrackedViewRef.current) {
      sendEvent(AnalyticsEvents.APPS_LISTED);
      hasTrackedViewRef.current = true;
    }
  }, [apps.length]);

  useEffect(() => {
    if (apps.length > 0 && hasNextPage && !isFetchingNextPage) {
      const visibleItems = 3;
      const remainingItems = apps.length % visibleItems;

      if (remainingItems <= 1) {
        fetchNextPage();
      }
    }
  }, [apps.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderContent = () => {
    if (isLoadingApps && !hasLoadedOnce) {
      return (
        <div className="flex gap-2 md:gap-4">
          {[1, 2, 3].map((index) => (
            <div
              key={index}
              className={cn(
                'h-32 bg-background border border-input rounded-lg p-4',
                'basis-full sm:basis-1/2 lg:basis-1/3',
                index > 0 && 'hidden sm:block',
                index > 1 && 'hidden lg:block',
              )}
            >
              <div className="flex flex-col h-full justify-between animate-pulse">
                <div>
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
                <div className="flex justify-end">
                  <div className="h-5 w-5 bg-muted rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (appsError) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-destructive">
            Failed to load apps. Please try again.
          </div>
        </div>
      );
    }

    if (!apps || apps.length === 0) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-muted-foreground">
            No apps created yet. Start building!
          </div>
        </div>
      );
    }

    return (
      <div className="relative">
        <Carousel
          className="w-full"
          opts={{
            align: 'start',
            loop: false,
            slidesToScroll: 1,
          }}
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {apps.map((app) => (
              <CarouselItem
                key={app.id}
                className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3"
              >
                <div className="h-32">
                  <ChatItemCard app={app} />
                </div>
              </CarouselItem>
            ))}
            {isFetchingNextPage && (
              <CarouselItem className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
                <div className="h-32 flex items-center justify-center bg-background border border-input rounded-lg">
                  <div className="text-sm text-muted-foreground">
                    Loading...
                  </div>
                </div>
              </CarouselItem>
            )}
          </CarouselContent>
          <div className="hidden sm:block">
            <CarouselPrevious className="-left-12" />
            <CarouselNext className="-right-12" />
          </div>
        </Carousel>
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-4 py-3 bg-background border border-input rounded-lg">
          <LayoutGrid className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">My Apps</span>
        </div>

        {renderContent()}
      </div>
    </div>
  );
}

