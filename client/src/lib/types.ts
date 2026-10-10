export interface User {
  _id: string;
  email: string;
  displayName: string;
  avatar?: string;
  friendId?: string;
  roomId?: string | null;
  friends?: (User | string)[];
}

export interface Friend {
  _id: string;
  displayName: string;
  email: string;
  avatar?: string;
  friendId?: string;
  roomId?: string | null;
  isOnline?: boolean;
}

export type MoodType = 'love' | 'horny' | 'angry' | 'just_friends';

export interface MoodHistoryItem {
  mood: MoodType;
  setBy?: string;
  setName: string;
  createdAt: string;
}

export interface MoodTheme {
  current: MoodType;
  updatedBy?: string;
  updatedByName: string;
  updatedAt: string;
  history: MoodHistoryItem[];
}

export interface Room {
  _id: string;
  inviteCode: string;
  participants: User[];
  members?: User[];
  moodTheme?: MoodTheme;
  createdAt: string;
}

export interface Message {
  _id: string;
  roomId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'emoji';
  createdAt: string;
  seen: boolean;
}

export interface Goal {
  _id: string;
  title: string;
  description?: string;
  category: string;
  dueDate?: string;
  owner?: 'me' | 'partner' | 'both';
  completedAt?: string | null;
  progress: number;
  streak?: number;
  createdAt?: string;
}

export interface Reminder {
  _id: string;
  title: string;
  description?: string;
  datetime: string;
  recurring: boolean;
}

export interface GameSession {
  _id: string;
  gameType: string;
  roomId: string;
  state: any;
}
