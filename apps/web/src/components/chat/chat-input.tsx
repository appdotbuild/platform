import { Button } from '~/components/shared/button';
import { StackPicker } from '~/components/chat/stack/stack-picker';
import { Textarea } from '~/components/shared/text-area';
import { useUser } from '@stackframe/react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { useChat } from '~/hooks/useChat';
import { useMessageLimit } from '~/hooks/userMessageLimit';
import { cn } from '~/lib/utils';
import { isAppPage, isHomePage } from '~/utils/router-checker';
import type { TemplateId } from '@appdotbuild/core';

export function ChatInput() {
  const user = useUser();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { createNewApp, sendMessage, isLoading } = useChat();
  const [inputValue, setInputValue] = useState('');
  const { isUserLimitReached } = useMessageLimit();
  const [selectedStack, setSelectedStack] = useState<TemplateId>('trpc_agent');

  const handleSubmit = useCallback(async () => {
    if (inputValue.trim() && !isLoading) {
      // if not logged, store the message and use it later to continue
      if (isHomePage(pathname) && !user) {
        localStorage.setItem('pendingMessage', inputValue);
        localStorage.setItem('pendingTemplateId', selectedStack);
        navigate({ to: '/handler/sign-in' });
        return;
      }

      if (isHomePage(pathname)) {
        createNewApp({ firstInput: inputValue, templateId: selectedStack });
      } else {
        await sendMessage({ message: inputValue, templateId: selectedStack });
      }

      setInputValue('');
    }
  }, [
    inputValue,
    pathname,
    user,
    navigate,
    createNewApp,
    sendMessage,
    isLoading,
    selectedStack,
  ]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInputValue(e.currentTarget.value);
    },
    [],
  );

  const showStackPicker = isHomePage(pathname);

  return (
    <div className="flex-col py-[18px]  w-full border border-dashed border-input bg-background text-black flex items-center relative px-4 lg:px-6 gap-2 md:gap-4">
      <div className="flex justify-between w-full">
        <Textarea
          className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-sm md:placeholder:text-base resize-none"
          placeholder={
            isAppPage(pathname)
              ? 'Type your message...'
              : 'Describe the app you want to build...'
          }
          value={inputValue}
          onChange={handleChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          disabled={isUserLimitReached || isLoading}
          autoFocus
          minHeight={isHomePage(pathname) ? 120 : 30}
          maxHeight={120}
        />
        <div
          className={cn(
            'transition-all duration-300 ease-out flex items-center translate-y-4',
            inputValue.length > 0
              ? 'w-auto opacity-100'
              : 'w-0 opacity-0 overflow-hidden',
          )}
        >
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="relative before:content-['↵'] before:md:content-none before:absolute before:inset-0 before:flex before:items-center before:justify-center before:text-base md:before:hidden text-[0px] md:text-base shrink-0"
            onClick={handleSubmit}
            disabled={!inputValue.trim() || isUserLimitReached || isLoading}
          >
            {isAppPage(pathname) ? 'Send' : "Let's start!"}
          </Button>
        </div>
      </div>

      {/* Stack Picker - Bottom Left Corner */}
      {showStackPicker && (
        <div className="flex justify-start w-full">
          <StackPicker
            selectedStack={selectedStack}
            onStackChange={setSelectedStack}
            disabled={isLoading}
          />
        </div>
      )}
    </div>
  );
}
