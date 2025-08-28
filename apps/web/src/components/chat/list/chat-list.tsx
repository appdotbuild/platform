import { AnalyticsEvents } from '@appdotbuild/core';
import { LayoutGrid } from 'lucide-react';
import { useEffect, useRef } from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '~/components/shared/carousel';
import { sendEvent } from '~/external/segment';
import { useAppsList } from '~/hooks/useAppsList';
import { cn } from '@design/lib';
import { ApplicationItem } from './chat-item';

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
        <div className="flex gap-3 md:gap-6">
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
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-2 w-full">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                  <div className="size-6 bg-muted rounded"></div>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="h-4 bg-muted rounded w-20"></div>
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
          <CarouselContent className="-ml-3 md:-ml-6">
            {apps.map((app) => (
              <CarouselItem
                key={app.id}
                className="pl-3 md:pl-6 basis-full sm:basis-1/2 lg:basis-1/3"
              >
                <div className="h-32">
                  <ApplicationItem app={app} />
                </div>
              </CarouselItem>
            ))}
            {isFetchingNextPage && (
              <CarouselItem className="pl-3 md:pl-6 basis-full sm:basis-1/2 lg:basis-1/3">
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
      <div className="space-y-6">
        <div
          data-testid="my-apps-header"
          className="flex items-center gap-2 px-4 py-3 bg-background border border-input rounded-lg"
        >
          <LayoutGrid className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">My Apps</span>
        </div>

        {renderContent()}
      </div>
    </div>
  );
}
