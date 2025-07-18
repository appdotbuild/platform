import { useUser } from '@stackframe/react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { useChat } from '~/hooks/useChat';
import { useMessageLimit } from '~/hooks/userMessageLimit';
import { isAppPage, isHomePage } from '~/utils/router-checker';
import { Button } from '../shared/button';
import { Input } from '../shared/input/input';

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

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.currentTarget.value);
  }, []);

  return (
    <div className="w-full h-16 md:h-24 border border-dashed border-input bg-background text-black flex justify-between items-center relative px-2 md:px-10">
      <Input
        className="w-full h-full p-2 md:p-4 bg-transparent border-none outline-none text-foreground placeholder:text-sm md:placeholder:text-base"
        placeholder={
          isAppPage(pathname)
            ? 'Type your message...'
            : 'Describe the app you want to build...'
        }
        value={inputValue}
        onChange={handleChange}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleSubmit();
          }
        }}
        disabled={isUserLimitReached || isLoading}
        autoFocus
      />

      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="relative before:content-['↵'] before:md:content-none before:absolute before:inset-0 before:flex before:items-center before:justify-center before:text-base md:before:hidden text-[0px] md:text-base"
        onClick={handleSubmit}
        disabled={!inputValue.trim() || isUserLimitReached || isLoading}
      >
        {isAppPage(pathname) ? 'Send' : "Let's start!"}
      </Button>
    </div>
  );
}
