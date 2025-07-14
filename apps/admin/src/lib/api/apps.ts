import type { App, Paginated, ReadUrl } from '@appdotbuild/core/types/api';
import { stackClientApp } from '../auth';

const PLATFORM_API_URL = import.meta.env.VITE_PLATFORM_API_URL;

export async function getAllApps({
  page = 1,
  pageSize = 10,
}: {
  search?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<Paginated<App>> {
  const user = await stackClientApp.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }
  const { accessToken } = await user.getAuthJson();

  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: pageSize.toString(),
  });

  const response = await fetch(
    `${PLATFORM_API_URL}/admin/apps?${queryParams}`,
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
    const user = await stackClientApp.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
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
    const user = await stackClientApp.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
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
