import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  photoUrl?: string;
  role: string;
  authProvider?: string; // 'email' | 'mobile' | 'google' | 'apple'
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
        // Clear all persisted stores on logout to prevent cross-user data leaks
        localStorage.removeItem('vedaclue-subscription');
        localStorage.removeItem('vedaclue-cycle');
        localStorage.removeItem('vedaclue-ayurveda');
        localStorage.removeItem('sb_referral_code');
        localStorage.removeItem('sb_notif_prefs');
        set({ user: null, isAuthenticated: false });
      },
      setLoading: (isLoading) => set({ isLoading }),
      setUser: (user) => set({ user }),
    }),
    {
      name: 'vedaclue-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
