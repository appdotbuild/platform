'use server';

import { App, Paginated, ReadUrl } from '@appdotbuild/core/types/api';
import JSZip from 'jszip';
import { stackServerApp } from '@appdotbuild/auth';

const PLATFORM_API_URL = process.env.PLATFORM_API_URL;

let neonEmployeeCache: { isNeon: boolean; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function isNeonEmployee(): Promise<boolean> {
  if (
    neonEmployeeCache &&
    Date.now() - neonEmployeeCache.timestamp < CACHE_DURATION
  ) {
    return neonEmployeeCache.isNeon;
  }

  try {
    const user = await stackServerApp.getUser();
    const { accessToken } = await user.getAuthJson();

    const response = await fetch(`${PLATFORM_API_URL}/auth/is-neon-employee`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      neonEmployeeCache = { isNeon: false, timestamp: Date.now() };
      return false;
    }

    const data = await response.json();
    neonEmployeeCache = { isNeon: data.isNeonEmployee, timestamp: Date.now() };
    return data.isNeonEmployee;
  } catch (error) {
    console.error('Error checking neon employee status:', error);
    neonEmployeeCache = { isNeon: false, timestamp: Date.now() };
    return false;
  }
}

export async function getAllApps({
  page = 1,
  pageSize = 10,
}: {
  search?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<Paginated<App>> {
  const user = await stackServerApp.getUser();
  const { accessToken } = await user.getAuthJson();

  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: pageSize.toString(),
  });

  const isNeon = await isNeonEmployee();
  const endpoint = isNeon ? '/admin/apps' : '/apps';

  const response = await fetch(
    `${PLATFORM_API_URL}${endpoint}?${queryParams}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  if (!response.ok) {
    const responseText = await response.text();

    throw new Error(
      `Failed to fetch apps: ${response.statusText} ${responseText}`,
    );
  }
  const data = await response.json();
  return data;
}

export async function getAppReadUrl(id: string): Promise<ReadUrl> {
  try {
    const user = await stackServerApp.getUser();
    const { accessToken } = await user.getAuthJson();
    const response = await fetch(`${PLATFORM_API_URL}/apps/${id}/read-url`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch app read URL');
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching app read URL:', error);
    throw error;
  }
}

export async function getApp(id: string): Promise<App | null> {
  try {
    const user = await stackServerApp.getUser();
    const { accessToken } = await user.getAuthJson();
    const response = await fetch(`${PLATFORM_API_URL}/apps/${id}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error('Failed to fetch app');
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching app:', error);
    throw error;
  }
}

interface FileEntry {
  path: string;
  content: string;
  type: 'file' | 'directory';
  children?: FileEntry[];
}

function buildFileTree(files: { [key: string]: string }): FileEntry[] {
  const root: FileEntry[] = [];

  // Sort paths to ensure parent directories are processed first
  const paths = Object.keys(files).sort();

  for (const path of paths) {
    const parts = path.split('/');
    let current = root;

    // Process each part of the path
    for (let i = 0; i < parts.length; i++) {
      const isFile = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join('/');

      let node = current.find((n) => n.path === currentPath);

      if (!node) {
        node = {
          path: currentPath,
          type: isFile ? 'file' : 'directory',
          content: isFile ? files[path] : '',
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

// In the past, we used to keep app code in S3.
export async function getAppCode(appId: string) {
  try {
    const { readUrl } = await getAppReadUrl(appId);

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
          file.async('string').then((content) => {
            files[path] = content;
          }),
        );
      }
    });

    await Promise.all(promises);

    if (Object.keys(files).length === 0) {
      throw new Error('No files found in the zip');
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
    console.error('Error loading code:', error);
    throw error;
  }
}
