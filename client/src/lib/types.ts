export interface User {
  _id: string;
  email: string;
  displayName: string;
  avatar?: string;
}

export interface Room {
  _id: string;
  inviteCode: string;
  participants: User[];
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
