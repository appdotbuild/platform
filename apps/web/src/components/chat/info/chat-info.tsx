import { useParams } from '@tanstack/react-router';
import { Info } from 'lucide-react';
import { useRef, useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '~/components/shared/accordion/accordion';
import { useApp } from '~/hooks/useApp';
import { ChatInfoContent } from './chat-info-content';
import { ChatInfoError } from './chat-info-error';
import { ChatInfoLoading } from './chat-info-loading';

export function ChatInfo() {
  const { appId } = useParams({ from: '/apps/$appId' });
  const { app, isLoading, error } = useApp(appId);
  const [isOpen, setIsOpen] = useState(true);
  const hasLoadedOnceRef = useRef(false);

  const handleValueChange = (value: string) => {
    const newIsOpen = value === 'info';
    setIsOpen(newIsOpen);
    if (newIsOpen && !hasLoadedOnceRef.current) {
      hasLoadedOnceRef.current = true;
    }
  };

  const renderContent = () => {
    if (isLoading && isOpen) {
      return <ChatInfoLoading />;
    }
    if (error && isOpen) {
      return <ChatInfoError />;
    }
    return (
      <ChatInfoContent app={app} hasLoadedOnce={hasLoadedOnceRef.current} />
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto mb-2">
      <Accordion
        type="single"
        collapsible
        value={isOpen ? 'info' : ''}
        onValueChange={handleValueChange}
      >
        <AccordionItem value="info" className="border-0">
          <AccordionTrigger className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-foreground bg-background border border-input rounded-lg hover:bg-muted/50 hover:no-underline transition-colors cursor-pointer">
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
