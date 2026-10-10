import { create } from 'zustand';

interface GameState {
  activeGame: string | null;
  setActiveGame: (game: string | null) => void;
}

export const useGameStore = create<GameState>((set) => ({
  activeGame: null,
  setActiveGame: (game) => set({ activeGame: game }),
}));
