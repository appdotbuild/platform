import { AnimatePresence, motion } from 'motion/react';
import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizableHandle,
  Button,
} from '@design/components/ui';
import { ExternalLink, RotateCcw } from 'lucide-react';
import { ChatMessageLimit } from './chat-message-limit';
import { ChatInput } from './chat-input';
import { useRef, useState } from 'react';
import type { DeployStatusType } from '@appdotbuild/core';
import { Iframe } from './iframe';

export function DesktopChat({
  appUrl,
  renderContent,
  deployStatus,
}: {
  appUrl?: string | null;
  renderContent: () => React.ReactNode;
  deployStatus?: DeployStatusType;
}) {
  const [key, setKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const handleIframeReload = () => {
    if (iframeRef.current) {
      setIframeLoaded(false);
      setKey((prev) => prev + 1);
    }
  };

  const handleIframeLoad = () => setIframeLoaded(true);

  if (!appUrl || deployStatus !== 'deployed') {
    return (
      <AnimatePresence mode="popLayout">
        <motion.div
          layout
          layoutId="chat-container"
          className="flex flex-col items-center w-full h-full overflow-hidden relative hidden xl:flex"
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
        <ResizablePanel className="p-4" defaultSize={25}>
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
              className="sticky bottom-0 w-full max-w-4xl mt-8"
              style={{ viewTransitionName: 'chat-input' }}
            >
              <div className="flex flex-col gap-2">
                <ChatMessageLimit />
                <ChatInput />
              </div>
            </motion.div>
          </motion.div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel className="p-4" defaultSize={75}>
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
                  disabled={!iframeLoaded}
                  variant="ghost"
                  className="cursor-pointer hover:bg-muted rounded-md aspect-square h-6 w-6 p-1"
                  size="icon"
                  onClick={handleIframeReload}
                >
                  <RotateCcw className="text-gray-700 h-4 w-4" />
                </Button>
              </div>
            </div>
            <Iframe
              key={`desktop-${key}`}
              ref={iframeRef}
              src={appUrl}
              className="rounded-b-lg"
              onLoad={handleIframeLoad}
            />
          </motion.div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </motion.div>
  );
}
