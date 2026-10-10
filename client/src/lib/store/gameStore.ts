import { create } from 'zustand';

export type GamePlayMode = 'couple' | 'friends' | 'ai';

interface GameState {
  activeGame: string | null;
  gameMode: GamePlayMode;
  setActiveGame: (game: string | null) => void;
  setGameMode: (mode: GamePlayMode) => void;
}

export const useGameStore = create<GameState>((set) => ({
  activeGame: null,
  gameMode: 'couple',
  setActiveGame: (game) => set({ activeGame: game }),
  setGameMode: (mode) => set({ gameMode: mode }),
}));
