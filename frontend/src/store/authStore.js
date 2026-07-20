import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(persist(
  set => ({
    accessToken: null,
    user: null,
    setAuth: (accessToken, user) => set({ accessToken, user }),
    setToken: accessToken => set({ accessToken }),
    logout: () => set({ accessToken: null, user: null }),
  }),
  {
    name: 'camarin-auth',
    partialize: state => ({ user: state.user }),
  }
));