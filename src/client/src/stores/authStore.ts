import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  setLoading: (v: boolean) => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      setAuth: (user, accessToken, refreshToken) => {
        localStorage.setItem('sb_token', accessToken);
        localStorage.setItem('sb_refresh', refreshToken);
        set({ user, isAuthenticated: true });
      },
      clearAuth: () => {
        localStorage.removeItem('sb_token');
        localStorage.removeItem('sb_refresh');
        set({ user: null, isAuthenticated: false });
      },
      setLoading: (isLoading) => set({ isLoading }),
      setUser: (user) => set({ user }),
    }),
    {
      name: 'shebloom-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
