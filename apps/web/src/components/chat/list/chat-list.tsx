import type { App } from '@appdotbuild/core';
import { LayoutGrid } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '~/components/shared/accordion/accordion';
import { useAppsList } from '~/hooks/useAppsList';
import { ChatItem } from './chat-item';

export function ChatList() {
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    apps,
    isLoadingApps,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAppsList();

  useEffect(() => {
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
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    if (!isLoadingApps && !hasLoadedOnce) {
      setHasLoadedOnce(true);
    }
  }, [isLoadingApps, hasLoadedOnce]);

  const renderContent = () => {
    if (isLoadingApps) {
      return (
        <div key="loading" className="animate-fade-in">
          <div className="p-4 text-muted-foreground text-center">
            Loading your apps...
          </div>
        </div>
      );
    }

    if (!apps || apps.length === 0) {
      return (
        <div key="empty" className="animate-slide-fade-in">
          <div className="p-4 text-muted-foreground text-center">
            You have no apps yet. Start building your first app!
          </div>
        </div>
      );
    }

    return (
      <div key="apps" className={hasLoadedOnce ? 'animate-slide-fade-in' : ''}>
        <AppsList apps={apps} />
        {isFetchingNextPage && (
          <div className="p-4 text-muted-foreground text-center">
            Loading more apps...
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Accordion
        type="single"
        collapsible
        value={isOpen ? 'apps' : undefined}
        onValueChange={(value) => setIsOpen(value === 'apps')}
      >
        <AccordionItem value="apps" className="border-0">
          <AccordionTrigger className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-foreground bg-background border border-input rounded-lg hover:bg-muted/50 hover:no-underline transition-colors">
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
                {renderContent()}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function AppsList({ apps }: { apps: App[] }) {
  return (
    <ul>
      {apps.map((app) => (
        <ChatItem key={app.id} app={app} index={() => apps.indexOf(app)} />
      ))}
    </ul>
  );
}
