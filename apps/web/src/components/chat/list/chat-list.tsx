import { AnalyticsEvents } from '@appdotbuild/core';
import { LayoutGrid } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '~/components/shared/accordion/accordion';
import { sendEvent } from '~/external/segment';
import { useAppsList } from '~/hooks/useAppsList';
import { ChatListContent } from './chat-list-content';

export function ChatList() {
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    apps,
    isLoadingApps,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    appsError,
  } = useAppsList();

  useEffect(() => {
    if (!isOpen) return;

    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

      if (isNearBottom && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, isOpen]);

  const hasLoadedOnceRef = useRef(false);

  if (!isLoadingApps && !hasLoadedOnceRef.current) {
    hasLoadedOnceRef.current = true;
  }

  const hasLoadedOnce = hasLoadedOnceRef.current;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Accordion
        type="single"
        collapsible
        value={isOpen ? 'apps' : ''}
        onValueChange={(value) => {
          if (value) sendEvent(AnalyticsEvents.APPS_LISTED);
          setIsOpen(value === 'apps');
        }}
      >
        <AccordionItem value="apps" className="border-0">
          <AccordionTrigger className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-foreground bg-background border border-input rounded-lg hover:bg-muted/50 hover:no-underline transition-colors cursor-pointer">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              <span>My Apps</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="p-0 pb-0 pt-2">
            <div className="rounded-lg bg-background shadow-sm overflow-hidden border border-input">
              <div
                ref={scrollRef}
                className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-track-muted scrollbar-thumb-muted-foreground/30"
              >
                <ChatListContent
                  apps={apps}
                  isLoadingApps={isLoadingApps}
                  hasLoadedOnce={hasLoadedOnce}
                  isFetchingNextPage={isFetchingNextPage}
                  error={appsError}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
