import { useParams } from '@tanstack/react-router';
import { Info } from 'lucide-react';
import { useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '~/components/shared/accordion/accordion';
import { useApp } from '~/hooks/useApp';

export function ChatInfo() {
  const { chatId } = useParams({ from: '/chat/$chatId' });
  const { app, isLoading } = useApp(chatId);
  const [isOpen, setIsOpen] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const handleValueChange = (value: string) => {
    const newIsOpen = value === 'info';
    setIsOpen(newIsOpen);
    if (newIsOpen && !hasLoadedOnce) {
      setHasLoadedOnce(true);
    }
  };

  if (isLoading && isOpen) {
    return (
      <div className="w-full max-w-4xl mx-auto mb-2">
        <Accordion
          type="single"
          collapsible
          value={isOpen ? 'info' : undefined}
          onValueChange={handleValueChange}
        >
          <AccordionItem value="info" className="border-0">
            <AccordionTrigger className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-foreground bg-background border border-input rounded-lg hover:bg-muted/50 hover:no-underline transition-colors">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                <span>App Info</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-0 pb-0 pt-2">
              <div className="rounded-lg bg-background shadow-sm overflow-hidden border border-input">
                <div className="p-6 text-center text-muted-foreground">
                  Loading app status...
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    );
  }

  const renderContent = () => {
    return (
      <div
        key="status"
        className={hasLoadedOnce ? 'animate-slide-fade-in' : ''}
      >
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">App Name</p>
              <p className="font-medium text-foreground">{app?.appName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Production URL</p>
              {app?.appUrl ? (
                <a
                  href={app?.appUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:text-primary/80 transition-colors whitespace-nowrap overflow-hidden text-ellipsis block"
                >
                  {app?.appUrl || 'Not available'}
                </a>
              ) : (
                <p className="font-medium text-foreground">Not available</p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Repository</p>
              <a
                href={app?.repositoryUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:text-primary/80 transition-colors whitespace-nowrap overflow-hidden text-ellipsis block"
              >
                {app?.repositoryUrl}
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto mb-2">
      <Accordion
        type="single"
        collapsible
        value={isOpen ? 'info' : undefined}
        onValueChange={handleValueChange}
      >
        <AccordionItem value="info" className="border-0">
          <AccordionTrigger className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-foreground bg-background border border-input rounded-lg hover:bg-muted/50 hover:no-underline transition-colors">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span>App Info</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="p-0 pb-0 pt-2">
            <div className="rounded-lg bg-background shadow-sm overflow-hidden border border-input">
              {renderContent()}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
