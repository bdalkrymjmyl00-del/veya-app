export type CharacterStatus = 'Online' | 'Offline' | 'Busy';

export interface Character {
  id: string;
  name: string;
  personality: string;
  background: string;
  speakingStyle: string;
  greeting: string;
  avatarColor: string;
  avatarImage?: string;
  tagline?: string;
  status?: CharacterStatus;
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface CharacterChatState {
  characterId: string;
  messages: ChatMessage[];
  lastUpdated: number;
}

export type MemoryCategory =
  | 'preference'
  | 'milestone'
  | 'topic'
  | 'event'
  | 'relationship'
  | 'promise'
  | 'conflict'
  | 'joke'
  | 'fact'
  | 'other';

export interface CharacterMemoryItem {
  id: string;
  characterId: string;
  content: string;
  category?: MemoryCategory;
  createdAt: number;
}

export interface MemorySettings {
  enabled: boolean;
  autoExtract: boolean;
  characterToggles: Record<string, boolean>; // characterId -> boolean
}

export interface UserProfile {
  name: string;
  age?: string;
  gender?: string;
  appearance?: string;
  personality?: string;
  background?: string;
  interests?: string;
  additionalDetails?: string;
  updatedAt?: number;
}

export type MainTab = 'chats' | 'create' | 'settings';

export type ViewMode = 'home' | 'create' | 'edit' | 'chat' | 'profile';
