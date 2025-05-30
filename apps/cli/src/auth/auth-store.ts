import type { User } from '@stackframe/js';
import { create } from 'zustand';
import type { Token } from './auth-storage.js';

interface AuthState {
  user: User | null;
  accessToken: Token | null;
  refreshToken: Token | null;
  isNeonEmployee: boolean | undefined;

  // Actions
  setAccessToken: (accessToken: Token) => void;
  setRefreshToken: (refreshToken: Token) => void;
  setUser: (user: User) => void;
  setIsNeonEmployee: (isNeonEmployee: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isNeonEmployee: undefined,

  setAccessToken: (accessToken: Token) => set({ accessToken }),
  setRefreshToken: (refreshToken: Token) => set({ refreshToken }),
  setUser: (user: User) => set({ user }),
  setIsNeonEmployee: (isNeonEmployee: boolean) => set({ isNeonEmployee }),
}));
