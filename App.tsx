import { useState, useEffect } from 'react';
import { Character, ViewMode, MainTab, UserProfile } from './types';
import { loadCharacters, saveCharacter, deleteCharacter, loadUserProfile, getLastMessagePreview } from './storage';
import { CharacterCard } from './components/CharacterCard';
import { CharacterForm } from './components/CharacterForm';
import { ChatView } from './components/ChatView';
import { UserProfileView } from './components/UserProfileView';
import { CharacterMemoryModal } from './components/CharacterMemoryModal';
import { BottomNavBar } from './components/BottomNavBar';
import { SettingsView } from './components/SettingsView';
import { VeyaLogo } from './components/VeyaLogo';
import { AuthView } from './components/AuthView';
import { getAuth, isOfflineMode, pullCloud } from './sync';

export default function App() {
  const [authenticated, setAuthenticated] = useState(() => Boolean(getAuth()) || isOfflineMode());
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [memoryModalCharacter, setMemoryModalCharacter] = useState<Character | null>(null);

  // Navigation state: exactly three main tabs: Chats, Create, Settings
  const [activeTab, setActiveTab] = useState<MainTab>('chats');
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [previousViewMode, setPreviousViewMode] = useState<ViewMode>('home');

  const [userProfile, setUserProfile] = useState<UserProfile>(() => loadUserProfile());

  // Load local state; authenticated cloud users pull their latest snapshot first.
  useEffect(() => {
    const initialize = async () => {
      if (getAuth()) {
        try { await pullCloud(); } catch (e) { console.warn('Cloud restore skipped:', e); }
      }
      setCharacters(loadCharacters());
      setUserProfile(loadUserProfile());
    };
    void initialize();
  }, [authenticated]);

  if (!authenticated) {
    return <AuthView onAuthenticated={() => setAuthenticated(true)} />;
  }

  // Handle character selection -> Open Chat
  const handleSelectCharacter = (char: Character) => {
    setSelectedCharacter(char);
    setViewMode('chat');
  };

  // Handle edit existing character -> switches to create tab in edit mode
  const handleOpenEdit = (char: Character) => {
    setEditingCharacter(char);
    setActiveTab('create');
    setViewMode('home');
  };

  // Handle open User Profile directly (from Chat view info modal if requested)
  const handleOpenProfileFromChat = () => {
    setUserProfile(loadUserProfile());
    setPreviousViewMode('chat');
    setViewMode('profile');
  };

  // Handle back from User Profile
  const handleBackFromProfile = () => {
    setUserProfile(loadUserProfile());
    if (previousViewMode === 'chat' && selectedCharacter) {
      setViewMode('chat');
    } else {
      setViewMode('home');
      setActiveTab('settings');
    }
  };

  // Handle delete character/conversation
  const handleDeleteCharacter = (id: string) => {
    deleteCharacter(id);
    const updated = characters.filter((c) => c.id !== id);
    setCharacters(updated);
    if (selectedCharacter?.id === id) {
      setSelectedCharacter(null);
      setViewMode('home');
      setActiveTab('chats');
    }
  };

  // Handle save from CharacterForm
  const handleSaveCharacter = (char: Character) => {
    saveCharacter(char);
    const updated = loadCharacters();
    setCharacters(updated);
    setEditingCharacter(null);
    setSelectedCharacter(char);
    // After creating or editing, open chat directly for an immersive experience
    setViewMode('chat');
  };

  // Handle tab switching from BottomNavBar
  const handleSelectTab = (tab: MainTab) => {
    // If switching away from create tab, clear editing character
    if (tab !== 'create') {
      setEditingCharacter(null);
    }
    setActiveTab(tab);
    setViewMode('home');
  };

  // Sorted characters: prioritizing recent activity, then updated/created time
  const sortedCharacters = [...characters].sort((a, b) => {
    const prevA = getLastMessagePreview(a.id);
    const prevB = getLastMessagePreview(b.id);
    const timeA = prevA.timestamp || a.updatedAt || a.createdAt || 0;
    const timeB = prevB.timestamp || b.updatedAt || b.createdAt || 0;
    return timeB - timeA;
  });

  return (
    <div className="min-h-screen bg-[#070508] flex justify-center text-[#f1edf0] selection:bg-rose-950/60 selection:text-rose-200">
      <main className="w-full max-w-lg min-h-screen bg-[#0d0a0f] flex flex-col shadow-[0_0_70px_rgba(0,0,0,0.9)] border-x border-[#23141d]/80 relative">
        {/* ================= VIEW: ACTIVE CHAT SCREEN ================= */}
        {viewMode === 'chat' && selectedCharacter && (
          <ChatView
            character={selectedCharacter}
            onBack={() => {
              setSelectedCharacter(null);
              setViewMode('home');
              setActiveTab('chats');
            }}
            onEditCharacter={(char) => {
              setEditingCharacter(char);
              setActiveTab('create');
              setViewMode('home');
            }}
            onOpenUserProfile={handleOpenProfileFromChat}
          />
        )}

        {/* ================= VIEW: FULL PROFILE (WHEN TRIGGERED FROM CHAT) ================= */}
        {viewMode === 'profile' && (
          <UserProfileView
            onBack={handleBackFromProfile}
            onSaved={(updated) => setUserProfile(updated)}
          />
        )}

        {/* ================= VIEW: MAIN APP SCREENS WITH BOTTOM NAVIGATION ================= */}
        {viewMode === 'home' && (
          <div className="flex flex-col flex-1 min-h-screen relative">
            {/* ----------------- TAB 1: MAIN CHARACTER / CHATS PAGE (DARK ROMANCE) ----------------- */}
            {activeTab === 'chats' && (
              <div className="flex flex-col flex-1 min-h-screen pb-24 relative">
                {/* Subtle romantic ambient top glow */}
                <div
                  className="absolute top-0 left-0 right-0 h-64 bg-[radial-gradient(ellipse_85%_220px_at_50%_-15px,rgba(136,19,55,0.18),transparent_75%)] pointer-events-none"
                  aria-hidden="true"
                />

                {/* Elegant Veya Header with Smooth Curves & Soft Silver Highlights */}
                <header className="sticky top-0 z-20 px-5 pt-5 pb-4 bg-[#0d0a0f]/92 backdrop-blur-xl border-b border-[#23141d]/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <VeyaLogo size={32} />
                    <div>
                      <h1 className="font-['Cormorant_Garamond',serif] text-2xl sm:text-[26px] font-semibold tracking-wide text-[#fdfcfd] leading-none">
                        Veya
                      </h1>
                      <p className="text-[11px] text-[#c08497]/80 font-serif italic tracking-wider mt-0.5">
                        Dark Romance Companions
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {sortedCharacters.length > 0 && (
                      <span className="text-[11px] font-medium tracking-wider text-[#d8a4b8] px-3 py-1 rounded-full bg-[#1c101a]/90 border border-[#3e192c]/80 shadow-[0_2px_10px_rgba(0,0,0,0.3)]">
                        {sortedCharacters.length} {sortedCharacters.length === 1 ? 'Companion' : 'Companions'}
                      </span>
                    )}
                  </div>
                </header>

                {/* Companions & Conversations List - Spacious, Clean & Softly Glowing */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-5 space-y-4 sm:space-y-5">
                  {sortedCharacters.length > 0 ? (
                    sortedCharacters.map((char) => {
                      const previewData = getLastMessagePreview(char.id, char.greeting);
                      return (
                        <CharacterCard
                          key={char.id}
                          character={char}
                          onSelect={handleSelectCharacter}
                          onEdit={handleOpenEdit}
                          onDelete={handleDeleteCharacter}
                          onManageMemory={(c) => setMemoryModalCharacter(c)}
                          lastMessagePreview={previewData.text}
                          lastMessageTimestamp={previewData.timestamp}
                          lastMessageRole={previewData.role}
                        />
                      );
                    })
                  ) : (
                    /* Romantic Empty State if all companions are deleted */
                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-4">
                      <div className="w-16 h-16 rounded-full bg-[#180f1b] border border-[#441a2c] flex items-center justify-center shadow-[0_0_24px_rgba(136,19,55,0.2)]">
                        <VeyaLogo size={36} />
                      </div>
                      <div className="space-y-1.5 max-w-xs">
                        <h3 className="font-['Cormorant_Garamond',serif] text-xl font-semibold text-[#fdfcfd]">
                          No Companions Awakened Yet
                        </h3>
                        <p className="text-xs text-[#a895a0] leading-relaxed font-light">
                          Step beyond the threshold and create your first dark romance companion to begin.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('create')}
                        className="px-5 py-2.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-[#881337] to-[#580c1f] hover:from-[#9f1239] hover:to-[#6b1026] border border-[#c08497]/30 shadow-[0_4px_20px_rgba(136,19,55,0.35)] transition-all active:scale-95"
                      >
                        Awaken a Companion
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ----------------- TAB 2: CREATE CHARACTER (DEDICATED PAGE) ----------------- */}
            {activeTab === 'create' && (
              <div className="flex-1 flex flex-col min-h-screen">
                <CharacterForm
                  initialCharacter={editingCharacter}
                  onSave={handleSaveCharacter}
                  onCancel={() => {
                    setEditingCharacter(null);
                    setActiveTab('chats');
                  }}
                />
              </div>
            )}

            {/* ----------------- TAB 3: SETTINGS (DEDICATED PAGE) ----------------- */}
            {activeTab === 'settings' && (
              <div className="flex-1 flex flex-col min-h-screen">
                <SettingsView
                  characters={characters}
                  userProfile={userProfile}
                  onUserProfileUpdated={(updated) => setUserProfile(updated)}
                  onCharactersUpdated={(updated) => setCharacters(updated)}
                  onSelectCharacterToChat={handleSelectCharacter}
                />
              </div>
            )}

            {/* ================= FIXED BOTTOM NAVIGATION BAR ================= */}
            <BottomNavBar
              activeTab={activeTab}
              onSelectTab={handleSelectTab}
            />
          </div>
        )}

        {/* Global Character Memory Modal */}
        {memoryModalCharacter && (
          <CharacterMemoryModal
            character={memoryModalCharacter}
            isOpen={Boolean(memoryModalCharacter)}
            onClose={() => setMemoryModalCharacter(null)}
          />
        )}
      </main>
    </div>
  );
}
