"use client";

import { useChat } from "ai/react";
import { createContext, useContext, useState } from "react";

export interface ChatContextType {
  chat: ReturnType<typeof useChat>;
  /** When using the agentic mode with tools */
  agentMode: boolean;
  welcomeMessage: string;
  suggestedQueries: string[];
  logoUrl: string;
  /** When inside a modal */
  modalMode: boolean;
  setAgentMode: (mode: boolean) => void;
  setWelcomeMessage: (message: string) => void;
  setSuggestedQueries: (queries: string[]) => void;
  setLogoUrl: (url: string) => void;
  setChat: (chat: ReturnType<typeof useChat>) => void;
  setModalMode: (mode: boolean) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

function useChatConfig() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChatConfig must be used within a ChatConfigProvider");
  }
  return context;
}

interface ChatConfigProviderProps {
  children: React.ReactNode;
  initialData?: Partial<ChatContextType>;
}

function ChatConfigProvider({
  children,
  initialData = {},
}: ChatConfigProviderProps) {
  const [agentMode, setAgentMode] = useState(initialData.agentMode ?? false);
  const [welcomeMessage, setWelcomeMessage] = useState(
    initialData.welcomeMessage ?? "",
  );
  const [suggestedQueries, setSuggestedQueries] = useState<string[]>(
    initialData.suggestedQueries ?? [],
  );
  const [logoUrl, setLogoUrl] = useState(initialData.logoUrl ?? "");
  const [chat, setChat] = useState<ReturnType<typeof useChat> | undefined>(
    undefined,
  );
  const [modalMode, setModalMode] = useState(initialData.modalMode ?? false);

  const value = {
    agentMode,
    welcomeMessage,
    suggestedQueries,
    logoUrl,
    setAgentMode,
    setWelcomeMessage,
    setSuggestedQueries,
    setLogoUrl,
    chat,
    setChat,
    modalMode,
    setModalMode,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export { ChatConfigProvider, useChatConfig };
