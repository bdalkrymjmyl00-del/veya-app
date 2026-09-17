import { scheduleCloudSync } from './sync';

import {
  Character,
  CharacterChatState,
  ChatMessage,
  UserProfile,
  CharacterMemoryItem,
  CharacterStatus,
  MemoryCategory,
  MemorySettings,
} from './types';

const CHARACTERS_STORAGE_KEY = 'character_chat_app_characters_v1';
const SESSIONS_STORAGE_KEY = 'character_chat_app_sessions_v1';
const USER_PROFILE_STORAGE_KEY = 'character_chat_app_user_profile_v1';
const MEMORIES_STORAGE_KEY_PREFIX = 'character_chat_app_memories_v1_';

export function getCharacterStatus(character: Character): CharacterStatus {
  if (character.status && (character.status === 'Online' || character.status === 'Offline' || character.status === 'Busy')) {
    return character.status;
  }
  // Deterministic status based on character id for realistic presence
  const charCodeSum = character.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const statusPool: CharacterStatus[] = ['Online', 'Online', 'Busy', 'Offline'];
  return statusPool[charCodeSum % statusPool.length];
}

export const AVATAR_COLOR_PALETTES = [
  { id: 'indigo', name: 'Indigo', bg: 'bg-indigo-600', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  { id: 'emerald', name: 'Emerald', bg: 'bg-emerald-600', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  { id: 'amber', name: 'Amber', bg: 'bg-amber-600', text: 'text-amber-400', border: 'border-amber-500/30' },
  { id: 'rose', name: 'Rose', bg: 'bg-rose-600', text: 'text-rose-400', border: 'border-rose-500/30' },
  { id: 'cyan', name: 'Cyan', bg: 'bg-cyan-600', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  { id: 'violet', name: 'Violet', bg: 'bg-violet-600', text: 'text-violet-400', border: 'border-violet-500/30' },
  { id: 'teal', name: 'Teal', bg: 'bg-teal-600', text: 'text-teal-400', border: 'border-teal-500/30' },
  { id: 'zinc', name: 'Slate', bg: 'bg-zinc-600', text: 'text-zinc-400', border: 'border-zinc-500/30' },
];

export const DEFAULT_CHARACTERS: Character[] = [
  {
    id: 'char-eldrin',
    name: 'Eldrin the Archivist',
    personality: 'Curious, scholarly, patient, quietly contemplative with a dry sense of humor.',
    background: 'Chief keeper of the Grand Athenaeum of Solis, a sanctuary of lost manuscripts and astronomical lore. Has spent centuries cataloging rare phenomena and obscure languages.',
    speakingStyle: 'Speaks with measured eloquence, occasional poetic metaphors, and subtle gestures described in asterisks.',
    greeting: '*glances up from an ancient celestial chart and adjusts a pair of brass spectacles* Ah, greetings traveler. Did you come seeking knowledge of the stars, or simply shelter from the rain?',
    avatarColor: 'rose',
    avatarImage: '/assets/eldrin_portrait.jpg',
    status: 'Online',
    tagline: 'Keeper of celestial manuscripts and ancient secrets',
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'char-val',
    name: 'Val',
    personality: 'Witty, street-smart, guarded yet loyal, pragmatic with an adventurous streak.',
    background: 'A rogue scout who navigates neon-lit rooftops and forgotten underground subway tunnels in a high-tech metropolis. Known for fixing what others discard.',
    speakingStyle: 'Fast-paced, casual, slightly cynical but endearing, sprinkles dialogue with sharp observations.',
    greeting: '*twirls a pocket multitool with one gloved hand and nods* Step into the shadows before a patrol drone spots you. What brings you to this part of the city?',
    avatarColor: 'violet',
    avatarImage: '/assets/val_portrait.jpg',
    status: 'Online',
    tagline: 'Streetwise scout & tech salvage specialist',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
  }
];

export function loadCharacters(): Character[] {
  try {
    const raw = localStorage.getItem(CHARACTERS_STORAGE_KEY);
    if (!raw) {
      // Seed with initial fictional characters
      localStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify(DEFAULT_CHARACTERS));
      return DEFAULT_CHARACTERS;
    }
    const parsed = JSON.parse(raw);
    const list: Character[] = Array.isArray(parsed) ? parsed : DEFAULT_CHARACTERS;
    return list.map((c) => {
      if (c.id === 'char-eldrin' && !c.avatarImage) {
        return { ...c, avatarImage: '/assets/eldrin_portrait.jpg', status: c.status || 'Online' };
      }
      if (c.id === 'char-val' && !c.avatarImage) {
        return { ...c, avatarImage: '/assets/val_portrait.jpg', status: c.status || 'Online' };
      }
      return c;
    });
  } catch (e) {
    console.error('Failed to load characters from localStorage', e);
    return DEFAULT_CHARACTERS;
  }
}

export function saveCharacter(character: Character): void {
  const characters = loadCharacters();
  const existingIndex = characters.findIndex((c) => c.id === character.id);
  if (existingIndex >= 0) {
    characters[existingIndex] = { ...character, updatedAt: Date.now() };
  } else {
    characters.unshift({ ...character, createdAt: Date.now(), updatedAt: Date.now() });
  }
  localStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify(characters));
  scheduleCloudSync();
}

export function deleteCharacter(id: string): void {
  const characters = loadCharacters();
  const updated = characters.filter((c) => c.id !== id);
  localStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify(updated));

  // Also remove chat session
  const sessions = loadAllSessions();
  delete sessions[id];
  localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));

  // Also remove isolated memory bank
  try {
    localStorage.removeItem(getCharacterMemoryStorageKey(id));
  } catch {
    // Ignore storage errors
  }
  scheduleCloudSync();
}

export function loadAllSessions(): Record<string, CharacterChatState> {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export interface ConversationPreview {
  text: string;
  timestamp?: number;
  role?: 'user' | 'model';
}

export function getLastMessagePreview(characterId: string, fallbackGreeting?: string): ConversationPreview {
  const sessions = loadAllSessions();
  const session = sessions[characterId];
  if (session && Array.isArray(session.messages) && session.messages.length > 0) {
    const lastMsg = session.messages[session.messages.length - 1];
    return {
      text: lastMsg.content,
      timestamp: lastMsg.timestamp,
      role: lastMsg.role,
    };
  }
  return {
    text: fallbackGreeting || '',
    timestamp: undefined,
  };
}

export function hasExistingConversation(characterId: string): boolean {
  const sessions = loadAllSessions();
  const session = sessions[characterId];
  if (!session || !Array.isArray(session.messages) || session.messages.length === 0) {
    return false;
  }
  return true;
}

export function loadChatSession(characterId: string, initialGreeting?: string): CharacterChatState {
  const sessions = loadAllSessions();
  if (sessions[characterId] && Array.isArray(sessions[characterId].messages) && sessions[characterId].messages.length > 0) {
    return sessions[characterId];
  }

  // Create initial chat session with character greeting
  const initialMessages: ChatMessage[] = [];
  if (initialGreeting && initialGreeting.trim()) {
    initialMessages.push({
      id: `msg-init-${Date.now()}`,
      role: 'model',
      content: initialGreeting.trim(),
      timestamp: Date.now(),
    });
  }

  const newState: CharacterChatState = {
    characterId,
    messages: initialMessages,
    lastUpdated: Date.now(),
  };

  sessions[characterId] = newState;
  try {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    scheduleCloudSync();
  } catch (e) {
    console.error('Failed to save initial chat session', e);
  }
  return newState;
}

export function saveChatMessages(characterId: string, messages: ChatMessage[]): void {
  const sessions = loadAllSessions();
  sessions[characterId] = {
    characterId,
    messages,
    lastUpdated: Date.now(),
  };
  try {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    scheduleCloudSync();
  } catch (e) {
    console.error('Failed to save chat messages', e);
  }
}

export function clearChatSession(characterId: string, initialGreeting?: string): CharacterChatState {
  const initialMessages: ChatMessage[] = [];
  if (initialGreeting && initialGreeting.trim()) {
    initialMessages.push({
      id: `msg-init-${Date.now()}`,
      role: 'model',
      content: initialGreeting.trim(),
      timestamp: Date.now(),
    });
  }

  const newState: CharacterChatState = {
    characterId,
    messages: initialMessages,
    lastUpdated: Date.now(),
  };

  const sessions = loadAllSessions();
  sessions[characterId] = newState;
  localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  scheduleCloudSync();
  return newState;
}

export function getAvatarColorClass(colorId?: string): { bg: string; text: string; border: string } {
  const match = AVATAR_COLOR_PALETTES.find((p) => p.id === colorId);
  return match || AVATAR_COLOR_PALETTES[0];
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: 'Traveler',
  age: '',
  gender: '',
  appearance: '',
  personality: '',
  background: '',
  interests: '',
  additionalDetails: '',
};

export function loadUserProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_USER_PROFILE;
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_USER_PROFILE,
      ...parsed,
    };
  } catch (e) {
    console.error('Failed to load user profile from localStorage', e);
    return DEFAULT_USER_PROFILE;
  }
}

export function saveUserProfile(profile: UserProfile): void {
  try {
    const updated = {
      ...profile,
      name: profile.name.trim() || 'Traveler',
      updatedAt: Date.now(),
    };
    localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(updated));
    scheduleCloudSync();
  } catch (e) {
    console.error('Failed to save user profile to localStorage', e);
  }
}

// Initial default memories showcasing user preferences, relationship milestones, and favorite topics
const DEFAULT_CHARACTER_MEMORIES: Record<string, CharacterMemoryItem[]> = {
  'char-eldrin': [
    {
      id: 'mem-eldrin-1',
      characterId: 'char-eldrin',
      category: 'milestone',
      content: 'Shared a quiet breakthrough during a midnight storm when Eldrin first confided the location of the sealed celestial vaults.',
      createdAt: Date.now() - 86400000 * 3,
    },
    {
      id: 'mem-eldrin-2',
      characterId: 'char-eldrin',
      category: 'preference',
      content: 'User strongly prefers hot roasted herbal tea with a drop of wildflower honey over bitter alchemical tonics.',
      createdAt: Date.now() - 86400000 * 2,
    },
    {
      id: 'mem-eldrin-3',
      characterId: 'char-eldrin',
      category: 'topic',
      content: 'User loves discussing lost star charts, ancient constellations, and philosophical speculations about deep time.',
      createdAt: Date.now() - 86400000 * 1.5,
    },
    {
      id: 'mem-eldrin-4',
      characterId: 'char-eldrin',
      category: 'promise',
      content: 'Promised to preserve any salvaged manuscripts from the ruined borderlands without handing them over to imperial censors.',
      createdAt: Date.now() - 86400000,
    },
  ],
  'char-val': [
    {
      id: 'mem-val-1',
      characterId: 'char-val',
      category: 'milestone',
      content: 'Dodged city enforcement squads back-to-back in the lower subway conduits, marking the moment Val truly trusted the user.',
      createdAt: Date.now() - 86400000 * 3,
    },
    {
      id: 'mem-val-2',
      characterId: 'char-val',
      category: 'preference',
      content: 'User always checks the shadows and emergency exits first upon entering any room, and prefers black espresso.',
      createdAt: Date.now() - 86400000 * 2,
    },
    {
      id: 'mem-val-3',
      characterId: 'char-val',
      category: 'topic',
      content: 'User is fascinated by rogue frequency synthesizers, old analog radio signals, and cyberpunk underground hacking lore.',
      createdAt: Date.now() - 86400000 * 1.5,
    },
    {
      id: 'mem-val-4',
      characterId: 'char-val',
      category: 'promise',
      content: 'Agreed never to disclose the coordinates of Val\'s rooftop antenna nest to anyone in the corporate sector.',
      createdAt: Date.now() - 86400000,
    },
  ],
};

const MEMORY_SETTINGS_KEY = 'veya_memory_settings_v1';

export const DEFAULT_MEMORY_SETTINGS: MemorySettings = {
  enabled: true,
  autoExtract: true,
  characterToggles: {},
};

export function loadMemorySettings(): MemorySettings {
  try {
    const raw = localStorage.getItem(MEMORY_SETTINGS_KEY);
    if (!raw) return DEFAULT_MEMORY_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : true,
      autoExtract: typeof parsed.autoExtract === 'boolean' ? parsed.autoExtract : true,
      characterToggles: parsed.characterToggles && typeof parsed.characterToggles === 'object' ? parsed.characterToggles : {},
    };
  } catch (e) {
    console.error('Failed to load memory settings', e);
    return DEFAULT_MEMORY_SETTINGS;
  }
}

export function saveMemorySettings(settings: MemorySettings): void {
  try {
    localStorage.setItem(MEMORY_SETTINGS_KEY, JSON.stringify(settings));
    scheduleCloudSync();
  } catch (e) {
    console.error('Failed to save memory settings', e);
  }
}

export function isMemoryEnabledForCharacter(characterId: string): boolean {
  const settings = loadMemorySettings();
  if (!settings.enabled) return false;
  // If explicitly toggled off for this character, return false
  if (settings.characterToggles && settings.characterToggles[characterId] === false) {
    return false;
  }
  return true;
}

export function toggleCharacterMemory(characterId: string, enabled?: boolean): boolean {
  const settings = loadMemorySettings();
  const current = settings.characterToggles?.[characterId] !== false;
  const nextValue = enabled !== undefined ? enabled : !current;
  settings.characterToggles = {
    ...settings.characterToggles,
    [characterId]: nextValue,
  };
  saveMemorySettings(settings);
  return nextValue;
}

export function getCharacterMemoryStorageKey(characterId: string): string {
  return `${MEMORIES_STORAGE_KEY_PREFIX}${characterId}`;
}

export function loadCharacterMemories(characterId: string): CharacterMemoryItem[] {
  try {
    const key = getCharacterMemoryStorageKey(characterId);
    const raw = localStorage.getItem(key);
    if (!raw) {
      if (DEFAULT_CHARACTER_MEMORIES[characterId]) {
        const seeded = DEFAULT_CHARACTER_MEMORIES[characterId];
        localStorage.setItem(key, JSON.stringify(seeded));
        return seeded;
      }
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error(`Failed to load memories for character ${characterId}`, e);
    return [];
  }
}

export function saveCharacterMemories(characterId: string, memories: CharacterMemoryItem[]): void {
  try {
    const key = getCharacterMemoryStorageKey(characterId);
    localStorage.setItem(key, JSON.stringify(memories));
    scheduleCloudSync();
  } catch (e) {
    console.error(`Failed to save memories for character ${characterId}`, e);
  }
}

export function addCharacterMemory(
  characterId: string,
  content: string,
  category: MemoryCategory = 'fact'
): CharacterMemoryItem {
  const existing = loadCharacterMemories(characterId);
  const newMemory: CharacterMemoryItem = {
    id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    characterId,
    content: content.trim(),
    category,
    createdAt: Date.now(),
  };
  const updated = [newMemory, ...existing];
  saveCharacterMemories(characterId, updated);
  return newMemory;
}

export function updateCharacterMemory(
  characterId: string,
  memoryId: string,
  newContent: string,
  newCategory?: MemoryCategory
): void {
  const existing = loadCharacterMemories(characterId);
  const updated = existing.map((m) => {
    if (m.id === memoryId) {
      return {
        ...m,
        content: newContent.trim(),
        category: newCategory || m.category,
      };
    }
    return m;
  });
  saveCharacterMemories(characterId, updated);
}

export function deleteCharacterMemory(characterId: string, memoryId: string): void {
  const existing = loadCharacterMemories(characterId);
  const updated = existing.filter((m) => m.id !== memoryId);
  saveCharacterMemories(characterId, updated);
}

export function clearCharacterMemories(characterId: string): void {
  const key = getCharacterMemoryStorageKey(characterId);
  localStorage.setItem(key, JSON.stringify([]));
  scheduleCloudSync();
}

export function clearAllCharactersMemories(characterIds: string[]): void {
  for (const id of characterIds) {
    clearCharacterMemories(id);
  }
}

