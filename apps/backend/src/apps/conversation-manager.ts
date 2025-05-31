import {
  type AgentSseEvent,
  type ContentMessage,
  type MessageContentBlock,
  MessageKind,
  type UserContentMessage,
  type AgentContentMessage,
  type ApplicationId,
} from '@appdotbuild/core';
import { app } from '../app';

export interface ConversationData {
  agentState?: AgentSseEvent['message']['agentState'];
  allMessages: ContentMessage[];
}

export class ConversationManager {
  private conversationMap = new Map<ApplicationId, ConversationData>();

  /**
   * Add or update conversation data for an application
   */
  addConversation(applicationId: string, event: AgentSseEvent): void {
    const existingConversation = this.conversationMap.get(applicationId);
    let allMessages: ContentMessage[] = [];

    if (existingConversation) {
      // If conversation exists, append new messages to existing ones
      allMessages = [...existingConversation.allMessages];
      const eventMessages = this.extractMessagesFromEvent(event);
      allMessages.push(...eventMessages);
    } else {
      // If no conversation exists, extract messages from the event
      allMessages = this.extractMessagesFromEvent(event);
    }

    this.conversationMap.set(applicationId, {
      agentState: event.message.agentState,
      allMessages,
    });
  }

  addUserMessageToConversation(applicationId: string, message: string): void {
    const userMessage: UserContentMessage = {
      role: 'user' as const,
      content: JSON.stringify([
        {
          type: 'text',
          text: message,
        },
      ]),
    };

    const existingData = this.conversationMap.get(applicationId);
    if (existingData) {
      existingData.allMessages.push(userMessage);
      this.conversationMap.set(applicationId, existingData);
    } else {
      this.conversationMap.set(applicationId, {
        allMessages: [userMessage],
        agentState: undefined,
      });
    }
  }

  /**
   * Get conversation history for an application
   */
  getConversationHistory(applicationId: string): ContentMessage[] {
    const data = this.conversationMap.get(applicationId);
    return data?.allMessages || [];
  }

  /**
   * Get conversation history formatted for client consumption
   */
  getConversationHistoryForClient(applicationId: string): any[] {
    const data = this.conversationMap.get(applicationId);
    if (!data) return [];

    return data.allMessages.map((message) => {
      if (message.role === 'user') {
        return {
          role: 'user',
          content: JSON.parse(message.content as string),
        };
      } else {
        return {
          role: 'assistant',
          content: JSON.parse(message.content as string),
          kind: message.kind,
        };
      }
    });
  }

  /**
   * Get the previous event for an application
   */
  getConversation(applicationId: string): ConversationData | null {
    return this.conversationMap.get(applicationId) || null;
  }

  /**
   * Check if conversation exists for an application
   */
  hasConversation(applicationId: string): boolean {
    return this.conversationMap.has(applicationId);
  }

  /**
   * Remove conversation data for an application
   */
  removeConversation(applicationId: string): void {
    this.conversationMap.delete(applicationId);
  }

  /**
   * Extract messages from an agent SSE event
   */
  private extractMessagesFromEvent(event: AgentSseEvent): ContentMessage[] {
    try {
      const messagesHistory = JSON.parse(event.message.content);

      if (!Array.isArray(messagesHistory)) {
        return [];
      }

      return messagesHistory.map(
        (content: {
          role: 'user' | 'assistant';
          content: MessageContentBlock[];
        }) => {
          const { role, content: messageContent } = content;
          if (role === 'user') {
            const textContent = messageContent
              .filter((c) => c.type === 'text')
              .map((c) => c.text)
              .join('');
            return {
              role: 'user' as const,
              content: textContent,
            } as UserContentMessage;
          }
          return {
            role: 'assistant' as const,
            content: JSON.stringify(messageContent),
            kind: MessageKind.STAGE_RESULT,
          } as AgentContentMessage;
        },
      );
    } catch (error) {
      app.log.error(`Error parsing messages from event: ${error}`);
      return [];
    }
  }
}

// Export a singleton instance
export const conversationManager = new ConversationManager();
