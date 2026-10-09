import { create } from 'zustand';
import api from '../api';
import { MoodType, MoodTheme } from '../types';
import toast from 'react-hot-toast';

export const MOOD_CONFIG: Record<
  MoodType,
  {
    id: MoodType;
    label: string;
    subLabel: string;
    primaryColor: string;
    glowColor: string;
    tagColor: string;
    borderClass: string;
    bgBadge: string;
    gradientBg: string;
  }
> = {
  love: {
    id: 'love',
    label: 'Love',
    subLabel: 'Sweet, affectionate & romantic atmosphere',
    primaryColor: '#f43f8e',
    glowColor: 'rgba(244, 63, 142, 0.4)',
    tagColor: 'from-pink-500 via-rose-400 to-pink-600',
    borderClass: 'border-pink-500/40 hover:border-pink-500',
    bgBadge: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
    gradientBg: 'from-pink-500/20 via-rose-500/10 to-transparent',
  },
  horny: {
    id: 'horny',
    label: 'Horny',
    subLabel: 'Spicy, seductive & naughty late-night energy',
    primaryColor: '#d946ef',
    glowColor: 'rgba(217, 70, 239, 0.4)',
    tagColor: 'from-fuchsia-500 via-purple-500 to-pink-500',
    borderClass: 'border-fuchsia-500/40 hover:border-fuchsia-500',
    bgBadge: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
    gradientBg: 'from-fuchsia-600/25 via-purple-900/15 to-transparent',
  },
  angry: {
    id: 'angry',
    label: 'Angry',
    subLabel: 'Upset mood — needs pampering & sweet apologies',
    primaryColor: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.4)',
    tagColor: 'from-red-500 via-amber-500 to-rose-600',
    borderClass: 'border-red-500/40 hover:border-red-500',
    bgBadge: 'bg-red-500/20 text-red-300 border-red-500/40',
    gradientBg: 'from-red-600/25 via-amber-600/15 to-transparent',
  },
  just_friends: {
    id: 'just_friends',
    label: 'Just Friends',
    subLabel: 'Casual, relaxed & chill best buddies mode',
    primaryColor: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.4)',
    tagColor: 'from-cyan-500 via-teal-400 to-blue-500',
    borderClass: 'border-cyan-500/40 hover:border-cyan-500',
    bgBadge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    gradientBg: 'from-cyan-600/20 via-blue-600/10 to-transparent',
  },
};

interface MoodStore {
  moodTheme: MoodTheme;
  isModalOpen: boolean;
  isLoading: boolean;
  openModal: () => void;
  closeModal: () => void;
  fetchMood: () => Promise<void>;
  setMood: (mood: MoodType) => Promise<void>;
  updateFromSocket: (data: { moodTheme: MoodTheme; changedBy?: { displayName: string; _id: string } }) => void;
}

const defaultMoodTheme: MoodTheme = {
  current: 'love',
  updatedByName: 'Partner',
  updatedAt: new Date().toISOString(),
  history: [],
};

const applyMoodToDom = (mood: MoodType) => {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-mood', mood);
  }
};

export const useMoodStore = create<MoodStore>((set, get) => ({
  moodTheme: defaultMoodTheme,
  isModalOpen: false,
  isLoading: false,

  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false }),

  fetchMood: async () => {
    try {
      const res = await api.get('/rooms/mood');
      if (res.data?.moodTheme) {
        set({ moodTheme: res.data.moodTheme });
        applyMoodToDom(res.data.moodTheme.current);
      }
    } catch {
      // Room might not be created yet, fallback to love
      applyMoodToDom('love');
    }
  },

  setMood: async (mood: MoodType) => {
    set({ isLoading: true });
    try {
      const res = await api.patch('/rooms/mood', { mood });
      if (res.data?.moodTheme) {
        set({ moodTheme: res.data.moodTheme });
        applyMoodToDom(mood);
        const config = MOOD_CONFIG[mood];
        toast.success(`Mood theme changed to ${config.label}! ✨`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update mood theme');
    } finally {
      set({ isLoading: false });
    }
  },

  updateFromSocket: (data) => {
    if (data?.moodTheme) {
      set({ moodTheme: data.moodTheme });
      applyMoodToDom(data.moodTheme.current);
      if (data.changedBy?.displayName) {
        const config = MOOD_CONFIG[data.moodTheme.current];
        toast(`Mood changed to ${config?.label || data.moodTheme.current} by ${data.changedBy.displayName}!`, {
          icon: '✨',
        });
      }
    }
  },
}));

export function formatRelativeTime(dateString?: string): string {
  if (!dateString) return 'Just now';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Recently';
  }
}

