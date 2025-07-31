import { stackClientApp } from '~/lib/auth';

export const getToken = async (): Promise<string | null> => {
  try {
    const user = await stackClientApp.getUser();
    if (!user) return null;

    const { accessToken } = await user.getAuthJson();
    return accessToken || null;
  } catch (_) {
    return null;
  }
};
