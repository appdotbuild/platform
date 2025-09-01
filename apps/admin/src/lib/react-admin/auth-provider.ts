import { AuthProvider } from 'ra-core';
import { stackClientApp } from '@/stack';
import { isStaffUser } from '@appdotbuild/core';

export const authProvider: AuthProvider = {
  logout: async () => {
    const user = await stackClientApp.getUser();
    if (user) {
      await user.signOut();
    }
  },
  async checkAuth() {
    const user = await stackClientApp.getUser({ or: 'throw' });

    if (!isStaffUser(user)) {
      throw new Error('Unauthorized');
    }
  },
  login: async () => {},
  checkError: async () => {},
};
