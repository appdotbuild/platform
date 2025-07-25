import {
  MessageKind,
  PromptKind,
  type AgentSseEvent,
  type ApplicationId,
  type ConversationMessage,
  type TemplateId,
} from '@appdotbuild/core';
import { app } from '../app';

export interface ConversationData {
  agentState?: AgentSseEvent['message']['agentState'];
  allMessages: ConversationMessage[];
  techStack: TemplateId;
}

export class ConversationManager {
  private conversationMap = new Map<ApplicationId, ConversationData>();

  /**
   * Add or update conversation data for an application
   */
  addConversation(
    applicationId: string,
    event: AgentSseEvent,
    techStack: TemplateId,
  ): void {
    const existingConversation = this.conversationMap.get(applicationId);
    let allMessages: ConversationData['allMessages'] = [];
    let agentState: ConversationData['agentState'] = null;

    if (existingConversation) {
      // If conversation exists, append new messages to existing ones
      allMessages = [...existingConversation.allMessages];
      const eventMessages = this.extractMessagesFromEvent(event);
      allMessages.push(...eventMessages);
      agentState = event.message.agentState ?? existingConversation.agentState;
    } else {
      // If no conversation exists, extract messages from the event
      allMessages = this.extractMessagesFromEvent(event);
      agentState = event.message.agentState ?? null;
    }

    this.conversationMap.set(applicationId, {
      agentState,
      allMessages,
      techStack: techStack,
    });
  }

  addUserMessageToConversation(
    applicationId: string,
    message: string,
    techStack: TemplateId,
  ): void {
    const userMessage: ConversationMessage = {
      role: PromptKind.USER,
      content: message,
      kind: MessageKind.USER_MESSAGE,
    };

    const existingData = this.conversationMap.get(applicationId);
    if (existingData) {
      existingData.allMessages.push(userMessage);
      this.conversationMap.set(applicationId, existingData);
    } else {
      this.conversationMap.set(applicationId, {
        allMessages: [userMessage],
        agentState: undefined,
        techStack: techStack,
      });
    }
  }

  addMessagesToConversation(
    applicationId: string,
    messages: ConversationMessage[],
    techStack: TemplateId,
  ): void {
    const existingData = this.conversationMap.get(applicationId);
    if (existingData) {
      existingData.allMessages.push(...messages);
      this.conversationMap.set(applicationId, existingData);
    } else {
      this.conversationMap.set(applicationId, {
        allMessages: messages,
        agentState: undefined,
        techStack: techStack,
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
        if (role === PromptKind.USER) {
          return {
            role: PromptKind.USER,
            content: messageRaw.content,
            kind: MessageKind.USER_MESSAGE,
          };
        } else {
          return {
            role: PromptKind.ASSISTANT,
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

export const conversationManager = new ConversationManager();
