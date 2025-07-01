import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { isChatPage } from '~/utils/router-checker';

export function ChatInput() {
  const navigate = useNavigate({ from: '/' });
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = async () => {
    navigate({
      to: '/chat/123',
    });
  };

  return (
    <div className="w-4xl h-24 border border-dashed border-gray-500 bg-white text-black flex justify-between items-center relative px-10">
      <input
        className="w-full h-full p-4 bg-transparent border-none outline-none text-black"
        placeholder={
          isChatPage()
            ? 'Type your message...'
            : 'Describe the app you want to build...'
        }
        value={inputValue}
        onInput={(e) => setInputValue(e.currentTarget.value)}
        onKeyPress={(e) => {
          if (e.key === 'Enter' && inputValue.trim() !== '') {
            e.preventDefault();
            handleSubmit();
          }
        }}
        ref={(el) => {
          setTimeout(() => el?.focus(), 100);
        }}
      />

      <button
        type="submit"
        className="bg-black w-32 h-12 text-white hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleSubmit}
      >
        {isChatPage() ? 'Send' : "Let's start!"}
      </button>
    </div>
  );
}
