"use server";

import { Chatbot, Paginated, ReadUrl } from "@repo/core/types/api";
import { env } from "@/env.mjs";

const PLATFORM_API_URL = env.PLATFORM_API_URL;
const PLATFORM_INTERNAL_API_KEY = env.PLATFORM_INTERNAL_API_KEY;

export async function getAllChatbots({ 
  page = 1, 
  pageSize = 10 
}: { 
  search?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<Paginated<Chatbot>> {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: pageSize.toString(),
  });

  const response = await fetch(`${PLATFORM_API_URL}/chatbots?${queryParams}`, {
    headers: {
      Authorization: `Bearer ${PLATFORM_INTERNAL_API_KEY}`,
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch chatbots');
  }
  const data = await response.json();
  return data;
}

export async function getChatbotReadUrl(id: string): Promise<ReadUrl> {
  try {
    const response = await fetch(`${PLATFORM_API_URL}/chatbots/${id}/read-url`, {
      headers: {
        Authorization: `Bearer ${PLATFORM_INTERNAL_API_KEY}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch chatbot read URL');
    }
    return response.json();
  } catch (error) {
    console.error("Error fetching chatbot read URL:", error);
    throw error;
  }
}

export async function getChatbot(id: string): Promise<Chatbot | null> {
  try {
    const response = await fetch(`${PLATFORM_API_URL}/chatbots/${id}`, {
      headers: {
        Authorization: `Bearer ${PLATFORM_INTERNAL_API_KEY}`,
      },
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error('Failed to fetch chatbot');
    }
    
    return response.json();
  } catch (error) {
    console.error("Error fetching chatbot:", error);
    throw error;
  }
}
