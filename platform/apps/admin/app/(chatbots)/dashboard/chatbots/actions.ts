"use server";

import { Chatbot, Paginated, ReadUrl } from "@repo/core/types/api";
import { env } from "@/env.mjs";
import JSZip from "jszip";

const PLATFORM_API_URL = env.PLATFORM_API_URL;
const PLATFORM_INTERNAL_API_KEY = env.PLATFORM_INTERNAL_API_KEY;

export async function getAllChatbots({
  page = 1,
  pageSize = 10,
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
    throw new Error("Failed to fetch chatbots");
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
      throw new Error("Failed to fetch chatbot read URL");
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
      throw new Error("Failed to fetch chatbot");
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching chatbot:", error);
    throw error;
  }
}

interface FileEntry {
  path: string;
  content: string;
  type: "file" | "directory";
  children?: FileEntry[];
}

function buildFileTree(files: { [key: string]: string }): FileEntry[] {
  const root: FileEntry[] = [];

  // Sort paths to ensure parent directories are processed first
  const paths = Object.keys(files).sort();

  for (const path of paths) {
    const parts = path.split("/");
    let current = root;

    // Process each part of the path
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join("/");

      let node = current.find((n) => n.path === currentPath);

      if (!node) {
        node = {
          path: currentPath,
          type: isFile ? "file" : "directory",
          content: isFile ? files[path] : "",
          children: isFile ? undefined : [],
        };
        current.push(node);
      }

      if (!isFile) {
        current = node.children!;
      }
    }
  }

  return root;
}

export async function getChatbotCode(chatbotId: string) {
  try {
    const { readUrl } = await getChatbotReadUrl(chatbotId);

    const response = await fetch(readUrl);
    const zipBuffer = await response.arrayBuffer();

    const zip = new JSZip();
    const contents = await zip.loadAsync(zipBuffer);

    // Get all files and their contents
    const files: { [key: string]: string } = {};
    const promises = [];

    contents.forEach((path, file) => {
      if (!file.dir) {
        promises.push(
          file.async("string").then((content) => {
            files[path] = content;
          })
        );
      }
    });

    await Promise.all(promises);

    if (Object.keys(files).length === 0) {
      throw new Error("No files found in the zip");
    }

    const fileTree = buildFileTree(files);
    const firstFilePath = Object.keys(files)[0];

    return {
      files: fileTree,
      currentFile: {
        path: firstFilePath,
        content: files[firstFilePath],
      },
    };
  } catch (error) {
    console.error("Error loading code:", error);
    throw error;
  }
}
