export interface User {
  _id: string;
  email: string;
  displayName: string;
  avatar?: string;
  friendId?: string;
  roomId?: string | null;
  friends?: (User | string)[];
  lastSeen?: string | Date;
}

export interface Friend {
  _id: string;
  displayName: string;
  email: string;
  avatar?: string;
  friendId?: string;
  roomId?: string | null;
  isOnline?: boolean;
  lastSeen?: string | Date;
}

export type MoodType = 'love' | 'angry' | 'just_friends' | 'sad' | 'horny';

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

export interface WeeklyMemory {
  _id: string;
  weekNumber: number;
  year: number;
  caption: string;
  imageUrl?: string;
  prompt: string;
  addedBy?: string;
  addedByName?: string;
  likes?: string[];
  createdAt: string;
}

export interface Room {
  _id: string;
  inviteCode: string;
  name?: string;
  isLocked?: boolean;
  wallpaper?: string;
  participants?: User[];
  members?: User[];
  host?: User | string;
  moodTheme?: MoodTheme;
  plannedEvent?: {
    title: string;
    targetDate: string;
    updatedBy?: string;
    updatedByName?: string;
    updatedAt?: string;
  };
  weeklyMemories?: WeeklyMemory[];
  createdAt: string;
}

export interface SavedSpace {
  roomId: string;
  customName: string;
  roomName: string;
  inviteCode: string;
  partner?: { _id: string; displayName: string; avatar?: string } | null;
  memberCount: number;
  moodTheme: string;
  plannedEvent?: { title: string; targetDate: string } | null;
  isActive: boolean;
  savedAt: string;
}

export interface Message {
  _id: string;
  roomId?: string | null;
  recipientId?: any;
  senderId: any;
  content: string;
  type: 'text' | 'image' | 'emoji' | 'audio' | 'whisper';
  imageUrl?: string;
  audioUrl?: string;
  audioDuration?: number;
  createdAt: string;
  seen: boolean;
}

export interface ConversationItem {
  id: string;
  type: 'direct' | 'room';
  user?: {
    _id: string;
    displayName: string;
    avatar?: string;
    friendId?: string;
    lastSeen?: string | Date;
  };
  name?: string;
  inviteCode?: string;
  members?: any[];
  isActive?: boolean;
  lastMessage?: {
    _id?: string;
    content: string;
    type?: string;
    senderName?: string;
    senderId?: any;
    createdAt?: string;
    seen?: boolean;
  } | null;
  unreadCount?: number;
  updatedAt?: string | Date;
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
