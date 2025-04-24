"use client";

import { useChat } from "ai/react";
import { createContext, useContext, useState } from "react";

export interface ChatContextType {
  chat: ReturnType<typeof useChat> | undefined;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

function useChatProvider() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChatProvider must be used within a ChatProvider");
  }
  return context;
}

interface ChatConfigProviderProps {
  children: React.ReactNode;
  initialData?: Partial<ChatContextType>;
}

function ChatProvider({ children, initialData = {} }: ChatConfigProviderProps) {
  const value = {
    chat: initialData.chat,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export { ChatProvider, useChatProvider };
