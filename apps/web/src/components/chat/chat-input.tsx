import type { CurrentUser, CurrentInternalUser } from '@stackframe/react';
import { useUser } from '@stackframe/react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useState, useCallback } from 'react';
import { useChat } from '~/hooks/useChat';
import { isChatPage, isHomePage } from '~/utils/router-checker';
import { Button } from '../shared/button';
import { Input } from '../shared/input/input';

interface ChatInputProps {
  user?: CurrentUser | CurrentInternalUser | null;
}

export function ChatInput({ user: userProp }: ChatInputProps = {}) {
  // Only call useUser if user is not provided as prop
  const userFromHook = useUser();
  const user = userProp !== undefined ? userProp : userFromHook;
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { createNewApp, sendMessage } = useChat();
  const [inputValue, setInputValue] = useState('');

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
    <div className="w-4xl h-24 border border-dashed border-input bg-background text-black flex justify-between items-center relative px-10">
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
        autoFocus
      />

      <Button
        type="button"
        variant="secondary"
        size="lg"
        onClick={handleSubmit}
        disabled={!inputValue.trim()}
      >
        {isChatPage(pathname) ? 'Send' : "Let's start!"}
      </Button>
    </div>
  );
}
