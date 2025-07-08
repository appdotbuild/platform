import { useUser } from '@stackframe/react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { useChat } from '~/hooks/useChat';
import { useMessageLimit } from '~/hooks/userMessageLimit';
import { isChatPage, isHomePage } from '~/utils/router-checker';
import { Button } from '../shared/button';
import { Input } from '../shared/input/input';

export function ChatInput() {
  const user = useUser();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { createNewApp, sendMessage } = useChat();
  const [inputValue, setInputValue] = useState('');
  const { isUserLimitReached } = useMessageLimit();

  const handleSubmit = useCallback(async () => {
    if (inputValue.trim()) {
      // if not logged, store the message and use it later to continue
      if (isHomePage(pathname) && !user) {
        localStorage.setItem('pendingMessage', inputValue);
        navigate({ to: '/handler/sign-in' });
        return;
      }

      isHomePage(pathname)
        ? createNewApp(inputValue)
        : await sendMessage(inputValue);
      setInputValue('');
    }
  }, [inputValue, pathname, user, navigate, createNewApp, sendMessage]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.currentTarget.value);
  }, []);

  return (
    <div className="w-full h-24 border border-dashed border-input bg-background text-black flex justify-between items-center relative px-10">
      <Input
        className="w-full h-full p-4 bg-transparent border-none outline-none text-foreground"
        placeholder={
          isChatPage(pathname)
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
        disabled={isUserLimitReached}
        autoFocus
      />

      <Button
        type="button"
        variant="secondary"
        size="lg"
        onClick={handleSubmit}
        disabled={!inputValue.trim() || isUserLimitReached}
      >
        {isChatPage(pathname) ? 'Send' : "Let's start!"}
      </Button>
    </div>
  );
}
