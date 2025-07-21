import { Button } from '../shared/button';
import { Textarea } from '../shared/text-area';
import { useUser } from '@stackframe/react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { useChat } from '~/hooks/useChat';
import { useMessageLimit } from '~/hooks/userMessageLimit';
import { cn } from '~/lib/utils';
import { isAppPage, isHomePage } from '~/utils/router-checker';

export function ChatInput() {
  const user = useUser();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { createNewApp, sendMessage, isLoading } = useChat();
  const [inputValue, setInputValue] = useState('');
  const { isUserLimitReached } = useMessageLimit();

  const handleSubmit = useCallback(async () => {
    if (inputValue.trim() && !isLoading) {
      // if not logged, store the message and use it later to continue
      if (isHomePage(pathname) && !user) {
        localStorage.setItem('pendingMessage', inputValue);
        navigate({ to: '/handler/sign-in' });
        return;
      }

      isHomePage(pathname)
        ? createNewApp(inputValue)
        : await sendMessage({ message: inputValue });
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
  ]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInputValue(e.currentTarget.value);
    },
    [],
  );

  return (
    <div className="w-full border border-dashed border-input bg-background text-black flex items-center relative px-4 lg:px-6 gap-2 md:gap-4">
      <Textarea
        className="flex-1 py-[18px] bg-transparent border-none outline-none text-foreground placeholder:text-sm md:placeholder:text-base resize-none"
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
        minHeight={69}
        maxHeight={250}
      />

      <div
        className={cn(
          'transition-all duration-300 ease-out',
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
  );
}
