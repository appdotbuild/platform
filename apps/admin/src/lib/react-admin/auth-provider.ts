import { AuthProvider } from 'ra-core';
import { stackClientApp } from '@/stack';

export const authProvider: AuthProvider = {
  logout: async () => {
    const user = await stackClientApp.getUser();
    if (user) {
      await user.signOut();
    }
  },
  async checkAuth() {
    await stackClientApp.getUser({ or: 'throw' });

    // TODO: let's enable this about 2 weeks after we deploy this
    // const NEON_EMPLOYEE_GROUP = 'neon';
    // if (user.clientReadOnlyMetadata?.user_group !== NEON_EMPLOYEE_GROUP) {
    //   throw new Error('Unauthorized');
    // }
  },
  login: async () => {},
  checkError: async () => {},
};
