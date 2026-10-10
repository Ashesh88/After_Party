import { create } from 'zustand';

export type GamePlayMode = 'couple' | 'friends' | 'ai';

export interface GameSessionData {
  sessionCode?: string;
  role?: 'w' | 'b';
  opponentName?: string;
  opponentId?: string;
}

interface GameState {
  activeGame: string | null;
  gameMode: GamePlayMode;
  sessionData: GameSessionData | null;
  setActiveGame: (game: string | null, sessionData?: GameSessionData | null) => void;
  setGameMode: (mode: GamePlayMode) => void;
  setSessionData: (data: GameSessionData | null) => void;
}

export const useGameStore = create<GameState>((set) => ({
  activeGame: null,
  gameMode: 'couple',
  sessionData: null,
  setActiveGame: (game, sessionData = null) => set({ activeGame: game, sessionData }),
  setGameMode: (mode) => set({ gameMode: mode }),
  setSessionData: (data) => set({ sessionData: data }),
}));
