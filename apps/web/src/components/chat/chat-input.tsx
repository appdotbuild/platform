import { useUser } from '@stackframe/react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useChat } from '~/hooks/useChat';
import { isChatPage, isHomePage } from '~/utils/router-checker';

export function ChatInput() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const user = useUser();
  const { createNewApp, sendMessage } = useChat();
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = async () => {
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
  };

  return (
    <div className="w-4xl h-24 border border-dashed border-gray-500 bg-white text-black flex justify-between items-center relative px-10">
      <input
        className="w-full h-full p-4 bg-transparent border-none outline-none text-black"
        placeholder={
          isChatPage(pathname)
            ? 'Type your message...'
            : 'Describe the app you want to build...'
        }
        value={inputValue}
        onChange={(e) => setInputValue(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
        autoFocus
      />

      <button
        type="button"
        className="bg-black w-32 h-12 text-white hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleSubmit}
        disabled={!inputValue.trim()}
      >
        {isChatPage(pathname) ? 'Send' : "Let's start!"}
      </button>
    </div>
  );
}
