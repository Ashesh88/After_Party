import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Room } from '../types';
import api from '../api';

interface AuthState {
  user: User | null;
  token: string | null;
  room: Room | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  setRoom: (room: Room | null) => void;
  updateAvatar: (avatarUrl: string) => Promise<void>;
}

const setCookie = (name: string, value: string, days: number) => {
  if (typeof window === 'undefined') return;
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = "; expires=" + date.toUTCString();
  document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

const deleteCookie = (name: string) => {
  if (typeof window === 'undefined') return;
  document.cookie = name + '=; Max-Age=-99999999;';
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      room: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const res = await api.post('/auth/login', { email, password });
          const { token, user, room } = res.data;
          setCookie('token', token, 7);
          set({ user, token, room, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (email, password, displayName) => {
        set({ isLoading: true });
        try {
          const res = await api.post('/auth/register', { email, password, displayName });
          const { token, user, room } = res.data;
          setCookie('token', token, 7);
          set({ user, token, room, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        deleteCookie('token');
        set({ user: null, token: null, room: null });
      },

      fetchMe: async () => {
        if (!get().token) return;
        try {
          const res = await api.get('/auth/me');
          set({ user: res.data.user, room: res.data.room });
        } catch (error) {
          // If 401, interceptor will logout
        }
      },

      setRoom: (room) => set({ room }),

      updateAvatar: async (avatarUrl: string) => {
        try {
          const res = await api.patch('/auth/profile', { avatar: avatarUrl });
          set({ user: res.data.user });
        } catch (error) {
          throw error;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user, room: state.room }),
    }
  )
);
