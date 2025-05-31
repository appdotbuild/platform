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

  addMessagesToConversation(
    applicationId: string,
    messages: ContentMessage[],
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
   * Following the same logic as Python continue_conversation method
   */
  private extractMessagesFromEvent(event: AgentSseEvent): ContentMessage[] {
    try {
      const messagesHistory = JSON.parse(event.message.content);

      if (!Array.isArray(messagesHistory)) {
        return [];
      }

      return messagesHistory
        .map((messageRaw) => {
          const role = messageRaw.role;
          const rawContent = messageRaw.content || '';

          let currentContentStr = '';
          let hasTextContent = false;

          if (typeof rawContent === 'string') {
            currentContentStr = rawContent;
            hasTextContent = currentContentStr.length > 0;
          } else if (
            Array.isArray(rawContent) &&
            rawContent.length > 0 &&
            typeof rawContent[0] === 'object'
          ) {
            // Check if it's a text content block
            if ('text' in rawContent[0] && rawContent[0].type === 'text') {
              currentContentStr = rawContent[0].text || '';
              hasTextContent = currentContentStr.length > 0;
            }
            // Skip tool_use and other non-text content
            else if (
              'type' in rawContent[0] &&
              rawContent[0].type === 'tool_use'
            ) {
              return null; // Filter out tool_use messages
            }
          }

          // Only include messages with actual text content
          if (!hasTextContent) {
            return null;
          }

          if (role === 'user') {
            return {
              role: 'user' as const,
              content: JSON.stringify([
                {
                  type: 'text',
                  text: currentContentStr,
                },
              ]),
            };
          } else if (role === 'assistant') {
            return {
              role: 'assistant' as const,
              content: JSON.stringify([
                {
                  type: 'text',
                  text: currentContentStr,
                },
              ]),
              kind: MessageKind.STAGE_RESULT,
            };
          }

          return null;
        })
        .filter(Boolean) as ContentMessage[]; // Remove null entries
    } catch (error) {
      app.log.error(`Error parsing messages from event: ${error}`);
      return [];
    }
  }
}

// Export a singleton instance
export const conversationManager = new ConversationManager();
