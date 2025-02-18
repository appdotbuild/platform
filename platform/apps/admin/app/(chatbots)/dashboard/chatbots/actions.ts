"use server";

import { Chatbot, Pagination } from "./types";

const PLATFORM_API_URL = process.env.PLATFORM_API_URL;
export async function getAllChatbots({ 
  page = 1, 
  pageSize = 10 
}: { 
  search?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<{data: Chatbot[], pagination?: Pagination }> {
  try {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: pageSize.toString(),
    });

    const response = await fetch(`${PLATFORM_API_URL}/chatbots?${queryParams}`);
    if (!response.ok) {
      throw new Error('Failed to fetch chatbots');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching chatbots:", error);
    return { 
      data: []
    };
  }
}

export async function getChatbotReadUrl(id: string): Promise<{ readUrl: string }> {
  try {
    const response = await fetch(`${PLATFORM_API_URL}/chatbots/${id}/read-url`);
    if (!response.ok) {
      throw new Error('Failed to fetch chatbot read URL');
    }
    return response.json();
  } catch (error) {
    console.error("Error fetching chatbot read URL:", error);
    throw error;
  }
}
