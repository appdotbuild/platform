import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@design/components/ui';
import { ExternalLink, RotateCcw } from 'lucide-react';
import type { DeployStatusType } from '@appdotbuild/core';
import { ChatMessageLimit } from './chat-message-limit';
import { ChatInput } from './chat-input';
import { Iframe } from './iframe';
import { useWatchDeployedStatus } from '~/hooks/useWatchDeployedStatus';

export function MobileChat({
  appUrl,
  renderContent,
  deployStatus,
}: {
  appUrl?: string | null;
  renderContent: () => React.ReactNode;
  deployStatus?: DeployStatusType;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const handleIframeReload = () => {
    if (!iframeRef.current) return;

    setIframeLoaded(false);
    const url = new URL(iframeRef.current.src);
    url.searchParams.set('nocache', Date.now().toString());
    iframeRef.current.src = url.toString();
  };

  useWatchDeployedStatus(deployStatus, handleIframeReload);

  const handleIframeLoad = () => setIframeLoaded(true);

  return (
    <motion.div
      layout
      className="w-full h-full flex flex-col pt-16 pb-16 flex xl:hidden"
    >
      <Tabs defaultValue="chat" className="w-full h-full">
        <TabsList>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger
            disabled={!appUrl || deployStatus !== 'deployed'}
            value="preview"
          >
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
          {appUrl && deployStatus === 'deployed' && (
            <motion.div
              layout
              className="w-full h-full"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.2, type: 'spring', bounce: 0 }}
            >
              <Iframe
                src={appUrl}
                ref={iframeRef}
                className="rounded-t-lg"
                onLoad={handleIframeLoad}
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
            </motion.div>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
