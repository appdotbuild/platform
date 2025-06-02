import {
  MessageKind,
  type AgentSseEvent,
  type ApplicationId,
  type ConversationMessage,
} from '@appdotbuild/core';
import { app } from '../app';

export interface ConversationData {
  agentState?: AgentSseEvent['message']['agentState'];
  allMessages: ConversationMessage[];
}

export class ConversationManager {
  private conversationMap = new Map<ApplicationId, ConversationData>();

  /**
   * Add or update conversation data for an application
   */
  addConversation(applicationId: string, event: AgentSseEvent): void {
    const existingConversation = this.conversationMap.get(applicationId);
    let allMessages: ConversationMessage[] = [];

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
    const userMessage: ConversationMessage = {
      role: 'user' as const,
      content: message,
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

  addMessagesToConversation(
    applicationId: string,
    messages: ConversationMessage[],
  ): void {
    const existingData = this.conversationMap.get(applicationId);
    if (existingData) {
      existingData.allMessages.push(...messages);
      this.conversationMap.set(applicationId, existingData);
    } else {
      this.conversationMap.set(applicationId, {
        allMessages: messages,
        agentState: undefined,
      });
    }
  }

  /**
   * Get conversation history for an application
   */
  getConversationHistory(applicationId: string): ConversationMessage[] {
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
          content: message.content,
        };
      } else {
        return {
          role: 'assistant',
          content: message.content,
          kind: MessageKind.STAGE_RESULT,
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
   * Following the same logic as Python continue_conversation method
   */
  private extractMessagesFromEvent(
    event: AgentSseEvent,
  ): ConversationMessage[] {
    try {
      const eventMessages = event.message.messages;

      return eventMessages.map((messageRaw) => {
        const role = messageRaw.role;
        if (role === 'user') {
          return {
            role: 'user' as const,
            content: messageRaw.content,
          };
        } else {
          return {
            role: 'assistant' as const,
            content: messageRaw.content,
            kind: MessageKind.STAGE_RESULT,
          };
        }
      });
    } catch (error) {
      app.log.error(`Error parsing messages from event: ${error}`);
      return [];
    }
  }
}

// Export a singleton instance
export const conversationManager = new ConversationManager();
