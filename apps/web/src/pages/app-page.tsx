import { createLazyRoute, useParams } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@design/components/ui/resizable';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@design/components/ui/tabs';
import { ChatContainer } from '~/components/chat/chat-container';
import { ChatInput } from '~/components/chat/chat-input';
import { ChatMessageLimit } from '~/components/chat/chat-message-limit';
import { ChatPageLoading } from '~/components/chat/chat-page-loading';
import { AnalyticsEvents, sendPageView } from '~/external/segment';
import { useApp } from '~/hooks/useApp';
import { useCurrentApp } from '~/hooks/useCurrentApp';
import { ExternalLink, RotateCcw } from 'lucide-react';
import { Button } from '@design/components/ui/button';
import { useLayout } from '~/hooks/useLayout';
import { useWindowSize } from '~/hooks/useWindowSize';

export const AppPageRoute = createLazyRoute('/apps/$appId')({
  component: AppPage,
});

export function AppPage() {
  const { currentAppState } = useCurrentApp();
  const { width } = useWindowSize();
  const { appId } = useParams({ from: '/apps/$appId' });
  const { setMxAuto } = useLayout();
  const { isLoading, app } = useApp(appId);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    sendPageView(AnalyticsEvents.PAGE_VIEW_APP);
  }, []);

  useEffect(() => {
    if (app?.appUrl && width > 1279) {
      setMxAuto(false);
    }

    return () => setMxAuto(true);
  }, [app?.appUrl, setMxAuto, width]);

  const renderContent = () => {
    if (isLoading && currentAppState === 'idle') {
      return <ChatPageLoading />;
    }
    return (
      <div className="flex flex-col h-full w-full items-center overflow-y-auto">
        <ChatContainer chatId={appId} isLoadingApp={isLoading} />
      </div>
    );
  };

  const handleIframeLoad = () => {
    if (iframeRef.current) {
      setKey((prev) => prev + 1);
    }
  };

  const renderMobileContent = (appUrl?: string | null) => {
    return (
      <motion.div
        layout
        className="w-full h-full flex flex-col pt-16 pb-16 flex xl:hidden"
      >
        <Tabs defaultValue="chat" className="w-full h-full">
          <TabsList>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger disabled={!appUrl} value="preview">
              Preview
            </TabsTrigger>
          </TabsList>
          <TabsContent value="chat" className="overflow-hidden">
            <motion.div
              layout
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.2, type: 'spring', bounce: 0 }}
              className="flex flex-col items-center w-full h-full overflow-hidden relative"
            >
              {renderContent()}
              <motion.div
                layout
                className="fixed bottom-5 left-1/2 transform -translate-x-1/2 w-4/5 max-w-4xl"
              >
                <div className="flex flex-col gap-2">
                  <ChatMessageLimit />
                  <ChatInput />
                </div>
              </motion.div>
              <div className="w-full h-24 md:h-24" />
            </motion.div>
          </TabsContent>
          <TabsContent value="preview" className="px-2 h-full">
            {appUrl && (
              <motion.div
                layout
                className="w-full h-full"
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.2, type: 'spring', bounce: 0 }}
              >
                <iframe
                  key={`mobile-${key}`}
                  ref={iframeRef}
                  src={appUrl}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-presentation allow-popups-to-escape-sandbox allow-popups allow-downloads allow-storage-access-by-user-activation"
                  className="w-full h-full rounded-t-lg border-none"
                />
                <div className="w-full relative flex h-12 flex-grow items-center justify-between gap-2 px-2 text-sm bg-background border border-input sticky bottom-0 rounded-b-lg">
                  <div className="flex-grow">
                    <div className="relative min-w-0 flex-1 flex-grow">
                      <input placeholder="/" value="/" />
                    </div>
                  </div>
                  <div className="flex items-center">
                    <a
                      className="cursor-pointer hover:bg-muted rounded-md aspect-square h-6 w-6 p-1"
                      href={appUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="text-gray-700 w-4 h-4" />
                    </a>
                    <Button
                      variant="ghost"
                      className="cursor-pointer hover:bg-muted rounded-md aspect-square h-6 w-6 p-1"
                      size="icon"
                      onClick={handleIframeLoad}
                    >
                      <RotateCcw className="text-gray-700 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    );
  };

  const renderDesktopContent = (appUrl?: string | null) => {
    if (!appUrl) {
      return (
        <AnimatePresence mode="popLayout">
          <motion.div
            layout
            layoutId="chat-container"
            className="flex flex-col items-center w-full h-full overflow-hidden relative"
            transition={{ duration: 0.2, type: 'spring', bounce: 0 }}
          >
            <div className="flex flex-col items-center w-full h-full mt-24 overflow-hidden">
              {renderContent()}
              <motion.div
                layoutId="chat-input"
                className="fixed bottom-5 left-1/2 transform -translate-x-1/2 w-4/5 max-w-4xl"
                style={{ viewTransitionName: 'chat-input' }}
              >
                <div className="flex flex-col gap-2">
                  <ChatMessageLimit />
                  <ChatInput />
                </div>
              </motion.div>
              <div className="w-full h-10 md:h-24" />
            </div>
          </motion.div>
        </AnimatePresence>
      );
    }

    return (
      <motion.div
        layout
        className="fixed bottom-0 w-full h-full pt-24 pb-8 flex gap-8 hidden xl:flex"
      >
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel className="p-4" defaultSize={30}>
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ duration: 0.4, type: 'spring', bounce: 0 }}
              className="flex flex-col items-center w-full h-full overflow-hidden relative"
            >
              {renderContent()}
              <motion.div
                layoutId="chat-input"
                className="sticky bottom-0 w-full max-w-4xl"
                style={{ viewTransitionName: 'chat-input' }}
              >
                <div className="flex flex-col gap-2">
                  <ChatMessageLimit />
                  <ChatInput />
                </div>
              </motion.div>
              <div className="w-full h-24 md:h-24" />
            </motion.div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel className="p-4" defaultSize={70}>
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.4, type: 'spring', bounce: 0 }}
              className="w-full h-full flex flex-col items-center justify-center rounded-t-lg"
            >
              <div className="w-full relative flex h-8 flex-grow items-center justify-between gap-2 rounded-t-lg px-2 text-sm bg-background border border-input">
                <div className="flex-grow">
                  <div className="relative min-w-0 flex-1 flex-grow">
                    <input placeholder="/" value="/" />
                  </div>
                </div>
                <div className="flex items-center">
                  <a
                    className="cursor-pointer hover:bg-muted rounded-md aspect-square h-6 w-6 p-1"
                    href={appUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink className="text-gray-700 w-4 h-4" />
                  </a>
                  <Button
                    variant="ghost"
                    className="cursor-pointer hover:bg-muted rounded-md aspect-square h-6 w-6 p-1"
                    size="icon"
                    onClick={handleIframeLoad}
                  >
                    <RotateCcw className="text-gray-700 h-4 w-4" />
                  </Button>
                </div>
              </div>
              <iframe
                key={`desktop-${key}`}
                ref={iframeRef}
                src={appUrl}
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-presentation allow-popups-to-escape-sandbox allow-popups allow-downloads allow-storage-access-by-user-activation"
                className="w-full h-full rounded-b-lg border-none"
              />
            </motion.div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </motion.div>
    );
  };

  return (
    <>
      {renderMobileContent(app?.appUrl)}
      {renderDesktopContent(app?.appUrl)}
    </>
  );
}
