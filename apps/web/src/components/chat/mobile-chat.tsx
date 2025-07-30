import { motion } from 'motion/react';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@design/components/ui/tabs';
import { ChatMessageLimit } from './chat-message-limit';
import { ChatInput } from './chat-input';
import { ExternalLink, RotateCcw } from 'lucide-react';
import { Button } from '@design/components/ui/button';
import { useRef, useState } from 'react';
import type { DeployStatusType } from '@appdotbuild/core';

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
  const [key, setKey] = useState(0);

  const handleIframeReload = () => {
    if (iframeRef.current) {
      setKey((prev) => prev + 1);
    }
  };

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
