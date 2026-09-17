import React, { useState, useEffect } from 'react';
import {
  User,
  Brain,
  Palette,
  Shield,
  Sparkles,
  ChevronRight,
  RotateCcw,
  Check,
  Sliders,
  Info,
  Eye,
  EyeOff,
  Lock,
} from 'lucide-react';
import { Character, UserProfile, MemorySettings } from '../types';
import { scheduleCloudSync } from '../sync';
import {
  loadCharacterMemories,
  clearChatSession,
  DEFAULT_CHARACTERS,
  saveCharacter,
  loadMemorySettings,
  saveMemorySettings,
  isMemoryEnabledForCharacter,
  toggleCharacterMemory,
} from '../storage';
import { CharacterAvatar } from './CharacterAvatar';
import { UserProfileView } from './UserProfileView';
import { CharacterMemoryModal } from './CharacterMemoryModal';
import { VeyaLogo } from './VeyaLogo';

interface SettingsViewProps {
  characters: Character[];
  userProfile: UserProfile;
  onUserProfileUpdated: (updated: UserProfile) => void;
  onCharactersUpdated: (updated: Character[]) => void;
  onSelectCharacterToChat?: (char: Character) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  characters,
  userProfile,
  onUserProfileUpdated,
  onCharactersUpdated,
}) => {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [memoryModalCharacter, setMemoryModalCharacter] = useState<Character | null>(null);

  // Appearance & Theme preferences (persisted locally)
  const [activeTheme, setActiveTheme] = useState<string>(() => {
    return localStorage.getItem('app_setting_theme') || 'dark_romance';
  });
  const [activeAccent, setActiveAccent] = useState<string>(() => {
    return localStorage.getItem('app_setting_accent') || 'burgundy';
  });
  const [chatFontSize, setChatFontSize] = useState<string>(() => {
    return localStorage.getItem('app_setting_fontsize') || 'standard';
  });
  const [confirmClearChats, setConfirmClearChats] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  // Memory settings and counts cache
  const [memorySettings, setMemorySettings] = useState<MemorySettings>(() => loadMemorySettings());
  const [memoryCounts, setMemoryCounts] = useState<Record<string, number>>({});
  const [characterMemoryStatus, setCharacterMemoryStatus] = useState<Record<string, boolean>>({});

  const refreshMemoryCounts = () => {
    const counts: Record<string, number> = {};
    const statuses: Record<string, boolean> = {};
    for (const char of characters) {
      const mems = loadCharacterMemories(char.id);
      counts[char.id] = mems.length;
      statuses[char.id] = isMemoryEnabledForCharacter(char.id);
    }
    setMemoryCounts(counts);
    setCharacterMemoryStatus(statuses);
  };

  useEffect(() => {
    refreshMemoryCounts();
  }, [characters, memoryModalCharacter]);

  const handleToggleGlobalMemory = () => {
    const updated = { ...memorySettings, enabled: !memorySettings.enabled };
    saveMemorySettings(updated);
    setMemorySettings(updated);
  };

  const handleToggleAutoExtract = () => {
    const updated = { ...memorySettings, autoExtract: !memorySettings.autoExtract };
    saveMemorySettings(updated);
    setMemorySettings(updated);
  };

  const handleToggleCharacterMemory = (charId: string) => {
    const newState = toggleCharacterMemory(charId);
    setCharacterMemoryStatus((prev) => ({ ...prev, [charId]: newState }));
  };

  const handleThemeChange = (themeId: string) => {
    setActiveTheme(themeId);
    localStorage.setItem('app_setting_theme', themeId);
    scheduleCloudSync();
  };

  const handleAccentChange = (accentId: string) => {
    setActiveAccent(accentId);
    localStorage.setItem('app_setting_accent', accentId);
    scheduleCloudSync();
  };

  const handleFontSizeChange = (size: string) => {
    setChatFontSize(size);
    localStorage.setItem('app_setting_fontsize', size);
    scheduleCloudSync();
  };

  const handleClearAllChats = () => {
    for (const char of characters) {
      clearChatSession(char.id, char.greeting);
    }
    setConfirmClearChats(false);
    setResetSuccessMessage('All companion conversations reset to initial greetings.');
    setTimeout(() => setResetSuccessMessage(null), 3500);
  };

  const handleRestoreDefaultCharacters = () => {
    if (window.confirm('Restore default dark romance companions? Your custom companions will be preserved.')) {
      for (const defChar of DEFAULT_CHARACTERS) {
        saveCharacter(defChar);
      }
      onCharactersUpdated([...characters]);
      setResetSuccessMessage('Default companions restored.');
      setTimeout(() => setResetSuccessMessage(null), 3000);
    }
  };

  // If user is editing profile, show full UserProfileView with back to Settings
  if (isEditingProfile) {
    return (
      <UserProfileView
        onBack={() => setIsEditingProfile(false)}
        onSaved={(updated) => {
          onUserProfileUpdated(updated);
        }}
      />
    );
  }

  const ACCENT_OPTIONS = [
    { id: 'burgundy', label: 'Burgundy', color: 'bg-[#881337]' },
    { id: 'mauve', label: 'Dusty Mauve', color: 'bg-[#c08497]' },
    { id: 'silver', label: 'Soft Silver', color: 'bg-[#d1d5db]' },
    { id: 'plum', label: 'Midnight Plum', color: 'bg-[#581c87]' },
    { id: 'crimson', label: 'Crimson', color: 'bg-[#9f1239]' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#070508] text-[#f1edf0] pb-28 relative">
      {/* Soft Ambient Radial Glow at top for layered dark depth */}
      <div
        className="absolute top-0 inset-x-0 h-64 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#240e1b]/45 via-[#0f0914]/20 to-transparent pointer-events-none"
        aria-hidden="true"
      />

      {/* ================= TOP HEADER ================= */}
      <header className="sticky top-0 z-30 px-5 pt-6 pb-4 bg-[#0a070c]/90 backdrop-blur-xl border-b border-[#23141d]/80 shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
        {/* Subtle silver hairline highlight on top edge */}
        <div
          className="absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#c08497]/30 to-transparent pointer-events-none"
          aria-hidden="true"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-[#1a0e19] to-[#100913] border border-[#3e192c] flex items-center justify-center text-[#c08497] shadow-[0_2px_12px_rgba(136,19,55,0.25)]">
                <Sliders className="w-5 h-5 text-rose-200/90" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#881337] ring-2 ring-[#0a070c]" />
            </div>
            <div>
              <h1 className="font-['Cormorant_Garamond',serif] text-2xl font-semibold tracking-wide text-[#fdfcfd] leading-none">
                Settings
              </h1>
              <p className="text-[11px] font-serif italic text-[#c08497]/85 tracking-wide mt-1">
                Sanctuary Persona, Memory & Atmosphere
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <VeyaLogo size={28} className="opacity-90" />
          </div>
        </div>
      </header>

      {/* Success Notification Banner */}
      {resetSuccessMessage && (
        <div className="mx-4 mt-3 p-3.5 rounded-[18px] bg-gradient-to-r from-[#200e1a] to-[#140a16] border border-[#881337]/70 text-xs text-rose-200 flex items-center gap-2.5 shadow-[0_4px_20px_rgba(136,19,55,0.35)] animate-in fade-in">
          <div className="w-5 h-5 rounded-full bg-[#881337] flex items-center justify-center shrink-0">
            <Check className="w-3 h-3 text-white" />
          </div>
          <span className="font-sans font-medium">{resetSuccessMessage}</span>
        </div>
      )}

      {/* Main Settings Content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6 max-w-xl mx-auto w-full relative z-10">

        {/* ================= SECTION 1: ROLEPLAY PERSONA ================= */}
        <section aria-labelledby="settings-profile-heading" className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-[6px] bg-[#221020] border border-[#3e192c] flex items-center justify-center">
                <User className="w-2.5 h-2.5 text-[#c08497]" />
              </div>
              <h2 id="settings-profile-heading" className="text-[11px] font-semibold text-[#c08497] uppercase tracking-widest font-sans">
                My Roleplay Persona
              </h2>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1e1022] border border-[#38182d] text-[#d8a4b8] font-medium tracking-wide">
              Active Presence
            </span>
          </div>

          <div
            id="settings-user-profile-card"
            onClick={() => setIsEditingProfile(true)}
            className="group relative p-4 sm:p-5 rounded-[26px] bg-gradient-to-b from-[#140e19] via-[#110b15] to-[#0e0812] hover:from-[#191020] hover:to-[#120a17] border border-[#2d172a] hover:border-[#881337]/70 transition-all duration-300 cursor-pointer shadow-[0_6px_26px_-4px_rgba(0,0,0,0.65),0_0_16px_rgba(114,16,40,0.1)] hover:shadow-[0_12px_36px_-4px_rgba(0,0,0,0.75),0_0_24px_rgba(136,19,55,0.2)] overflow-hidden"
          >
            {/* Subtle silver hairline highlight */}
            <div
              className="absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#c08497]/30 to-transparent pointer-events-none"
              aria-hidden="true"
            />

            <div className="flex items-center gap-4">
              {/* User Avatar Frame */}
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-[20px] bg-gradient-to-b from-[#251229] to-[#140916] border border-[#441a33] ring-1 ring-[#c08497]/30 ring-offset-2 ring-offset-[#110b15] text-rose-200 flex items-center justify-center font-['Cormorant_Garamond',serif] font-bold text-2xl shadow-[0_4px_16px_rgba(136,19,55,0.25)] group-hover:scale-[1.03] transition-transform duration-300">
                  {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 ring-2 ring-[#110b15] shadow-[0_0_8px_rgba(52,211,153,0.7)] flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                </span>
              </div>

              {/* Profile Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <h3 className="font-['Cormorant_Garamond',serif] text-xl font-semibold text-[#fdfcfd] group-hover:text-rose-100 transition-colors truncate leading-tight">
                    {userProfile.name || 'Anonymous Seeker'}
                  </h3>
                  <span className="text-xs font-semibold text-[#c08497] group-hover:text-rose-200 flex items-center gap-1 shrink-0 transition-colors">
                    Edit Persona
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>

                <p className="text-xs text-[#a895a0] line-clamp-1 font-serif italic tracking-wide">
                  {userProfile.personality || userProfile.appearance || 'Custom roleplaying persona'}
                </p>

                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  {userProfile.gender && (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#1b0f1e] text-[#d8a4b8] border border-[#38182d] text-[10px] font-medium tracking-wide">
                      {userProfile.gender}
                    </span>
                  )}
                  {userProfile.age && (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#1b0f1e] text-[#d8a4b8] border border-[#38182d] text-[10px] font-medium tracking-wide">
                      Age {userProfile.age}
                    </span>
                  )}
                  <span className="text-[10px] text-[#806f7b] font-serif italic">
                    Companions adapt responses to this identity
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= SECTION 2: MEMORY & PRIVACY VAULT ================= */}
        <section aria-labelledby="settings-memory-heading" className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-[6px] bg-[#221020] border border-[#3e192c] flex items-center justify-center">
                <Brain className="w-2.5 h-2.5 text-[#c08497]" />
              </div>
              <h2 id="settings-memory-heading" className="text-[11px] font-semibold text-[#c08497] uppercase tracking-widest font-sans">
                Memory & Privacy Controls
              </h2>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#170e1c] border border-[#32172a] text-[#806f7b] font-serif italic">
              Private & Local
            </span>
          </div>

          <div className="relative p-5 rounded-[26px] bg-gradient-to-b from-[#140e19] via-[#110b15] to-[#0e0812] border border-[#2d172a] shadow-[0_6px_26px_-4px_rgba(0,0,0,0.65)] space-y-4 overflow-hidden">
            {/* Subtle silver hairline highlight */}
            <div
              className="absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#c08497]/25 to-transparent pointer-events-none"
              aria-hidden="true"
            />

            {/* Global Switches Container */}
            <div className="space-y-3.5 pb-4 border-b border-[#231222]">
              {/* Switch 1: Active Recall */}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#f1edf0] font-serif">Active Memory Recall</span>
                    <span
                      className={`text-[9px] px-2 py-0.2 rounded-full font-medium tracking-wide ${
                        memorySettings.enabled
                          ? 'bg-[#2a0e1b] text-rose-300 border border-[#881337]/50 shadow-[0_0_8px_rgba(136,19,55,0.3)]'
                          : 'bg-[#180e1b] text-[#806f7b] border border-[#291325]'
                      }`}
                    >
                      {memorySettings.enabled ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#a895a0] leading-snug mt-1 font-sans">
                    Companions reference your shared history, emotional milestones, and preferences naturally in conversation.
                  </p>
                </div>

                {/* Restyled Custom Toggle */}
                <button
                  id="toggle-global-memory-btn"
                  type="button"
                  onClick={handleToggleGlobalMemory}
                  className={`w-12 h-6.5 rounded-full transition-all duration-300 flex items-center px-0.5 shrink-0 focus:outline-none ${
                    memorySettings.enabled
                      ? 'bg-gradient-to-r from-[#881337] to-[#5b0d23] ring-1 ring-[#c08497]/40 shadow-[0_0_12px_rgba(136,19,55,0.45)] justify-end'
                      : 'bg-[#1b111e] border border-[#2d182b] justify-start'
                  }`}
                  aria-label="Toggle Global Memory Recall"
                >
                  <span className="w-5 h-5 rounded-full bg-[#fdfcfd] shadow-md transition-transform duration-300 flex items-center justify-center">
                    {memorySettings.enabled && <span className="w-1.5 h-1.5 rounded-full bg-[#881337]" />}
                  </span>
                </button>
              </div>

              {/* Switch 2: Auto-Capture Moments */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#f1edf0] font-serif">Auto-Capture Shared Moments</span>
                    <span
                      className={`text-[9px] px-2 py-0.2 rounded-full font-medium tracking-wide ${
                        memorySettings.autoExtract
                          ? 'bg-[#2a0e1b] text-rose-300 border border-[#881337]/50 shadow-[0_0_8px_rgba(136,19,55,0.3)]'
                          : 'bg-[#180e1b] text-[#806f7b] border border-[#291325]'
                      }`}
                    >
                      {memorySettings.autoExtract ? 'Enabled' : 'Off'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#a895a0] leading-snug mt-1 font-sans">
                    Quietly records memorable moments, preferences, and personal details exchanged during dialogue.
                  </p>
                </div>

                <button
                  id="toggle-auto-extract-btn"
                  type="button"
                  onClick={handleToggleAutoExtract}
                  className={`w-12 h-6.5 rounded-full transition-all duration-300 flex items-center px-0.5 shrink-0 focus:outline-none ${
                    memorySettings.autoExtract
                      ? 'bg-gradient-to-r from-[#881337] to-[#5b0d23] ring-1 ring-[#c08497]/40 shadow-[0_0_12px_rgba(136,19,55,0.45)] justify-end'
                      : 'bg-[#1b111e] border border-[#2d182b] justify-start'
                  }`}
                  aria-label="Toggle Auto-Extract Memories"
                >
                  <span className="w-5 h-5 rounded-full bg-[#fdfcfd] shadow-md transition-transform duration-300 flex items-center justify-center">
                    {memorySettings.autoExtract && <span className="w-1.5 h-1.5 rounded-full bg-[#881337]" />}
                  </span>
                </button>
              </div>
            </div>

            {/* Privacy Guarantee Box */}
            <div className="flex items-start gap-2.5 p-3 rounded-[16px] bg-[#100914] border border-[#271424] text-[11px] text-[#a895a0]">
              <Lock className="w-3.5 h-3.5 text-[#c08497] shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong className="text-[#f1edf0] font-medium font-serif">Privacy Sanctuary:</strong> All memory banks remain strictly inside your browser's local storage. No conversation logs or memories are ever transmitted to external servers.
              </p>
            </div>

            {/* Companion Memory Vaults List */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs font-semibold text-[#f1edf0] font-serif tracking-wide">
                  Companion Memory Vaults
                </h3>
                <span className="text-[10px] text-[#c08497]/80 font-sans">
                  {characters.length} {characters.length === 1 ? 'Companion' : 'Companions'}
                </span>
              </div>

              {characters.length === 0 ? (
                <div className="text-center py-5 text-xs text-[#806f7b] font-serif italic bg-[#150d1a]/60 rounded-[18px] border border-[#291526]">
                  No companions created yet. Awaken a companion to form memories.
                </div>
              ) : (
                <div className="space-y-2">
                  {characters.map((char) => {
                    const count = memoryCounts[char.id] ?? 0;
                    const isEnabled = characterMemoryStatus[char.id] !== false && memorySettings.enabled;
                    return (
                      <div
                        key={char.id}
                        id={`settings-memory-item-${char.id}`}
                        className="flex items-center justify-between gap-3 p-3 rounded-[18px] bg-gradient-to-r from-[#160d1b] to-[#120916] hover:from-[#1b1021] hover:to-[#150a19] border border-[#2c1628] hover:border-[#881337]/50 transition-all duration-200 shadow-sm"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <CharacterAvatar
                            name={char.name}
                            avatarColor={char.avatarColor}
                            avatarImage={char.avatarImage}
                            shape="curved"
                            size="sm"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-semibold text-[#fdfcfd] truncate font-serif">{char.name}</h4>
                              <span
                                className={`text-[9px] px-2 py-0.2 rounded-full font-medium ${
                                  isEnabled
                                    ? 'bg-[#290d1a] text-rose-300 border border-[#881337]/50'
                                    : 'bg-[#1a101f] text-[#806f7b] border border-[#2e1728]'
                                }`}
                              >
                                {isEnabled ? 'Active' : 'Paused'}
                              </span>
                            </div>
                            <span className="text-[11px] text-[#a895a0] font-sans">
                              {count} {count === 1 ? 'memory' : 'memories'} preserved
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            id={`settings-toggle-memory-btn-${char.id}`}
                            type="button"
                            onClick={() => handleToggleCharacterMemory(char.id)}
                            className={`p-2 rounded-[12px] border text-xs transition-colors ${
                              characterMemoryStatus[char.id] !== false
                                ? 'bg-[#251020] border-[#881337]/60 text-rose-300 hover:bg-[#34122a]'
                                : 'bg-[#150d1a] border-[#2b1527] text-[#806f7b] hover:text-[#fdfcfd]'
                            }`}
                            title={
                              characterMemoryStatus[char.id] !== false
                                ? 'Pause memory for this companion'
                                : 'Enable memory for this companion'
                            }
                          >
                            {characterMemoryStatus[char.id] !== false ? (
                              <Eye className="w-3.5 h-3.5 text-[#c08497]" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5 text-[#806f7b]" />
                            )}
                          </button>

                          <button
                            id={`settings-manage-memory-btn-${char.id}`}
                            type="button"
                            onClick={() => setMemoryModalCharacter(char)}
                            className="px-3 py-1.5 text-xs font-semibold text-rose-100 hover:text-white bg-gradient-to-r from-[#881337] to-[#6b0f2a] hover:from-[#9f1239] border border-[#c08497]/30 rounded-[12px] transition-all shadow-sm flex items-center gap-1 active:scale-95 cursor-pointer"
                          >
                            <Brain className="w-3.5 h-3.5 text-rose-200" />
                            <span>Vault</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ================= SECTION 3: VISUAL ATMOSPHERE ================= */}
        <section aria-labelledby="settings-appearance-heading" className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-[6px] bg-[#221020] border border-[#3e192c] flex items-center justify-center">
                <Palette className="w-2.5 h-2.5 text-[#c08497]" />
              </div>
              <h2 id="settings-appearance-heading" className="text-[11px] font-semibold text-[#c08497] uppercase tracking-widest font-sans">
                Visual Atmosphere
              </h2>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#170e1c] border border-[#32172a] text-[#806f7b] font-serif italic">
              Dark Romance
            </span>
          </div>

          <div className="relative p-5 rounded-[26px] bg-gradient-to-b from-[#140e19] via-[#110b15] to-[#0e0812] border border-[#2d172a] shadow-[0_6px_26px_-4px_rgba(0,0,0,0.65)] space-y-4 overflow-hidden">
            {/* Subtle silver hairline highlight */}
            <div
              className="absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#c08497]/25 to-transparent pointer-events-none"
              aria-hidden="true"
            />

            {/* Atmosphere Palette Themes */}
            <div>
              <label className="text-xs font-semibold text-[#f1edf0] block mb-2 font-serif">
                Atmosphere Palette
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleThemeChange('dark_romance')}
                  className={`p-3.5 rounded-[18px] border text-left transition-all duration-200 cursor-pointer ${
                    activeTheme === 'dark_romance'
                      ? 'bg-gradient-to-br from-[#220e1d] to-[#120915] border-[#881337] text-white shadow-[0_2px_14px_rgba(136,19,55,0.35)] ring-1 ring-[#c08497]/30'
                      : 'bg-[#150d1a] border-[#2b1527] text-[#a895a0] hover:text-[#fdfcfd] hover:border-[#3d1a31]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold font-serif text-[#fdfcfd]">Dark Velvet</span>
                    {activeTheme === 'dark_romance' && <Check className="w-3.5 h-3.5 text-[#c08497]" />}
                  </div>
                  <span className="text-[10px] text-[#806f7b] block font-sans leading-tight">
                    Deep charcoal, black & burgundy
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleThemeChange('burgundy_night')}
                  className={`p-3.5 rounded-[18px] border text-left transition-all duration-200 cursor-pointer ${
                    activeTheme === 'burgundy_night'
                      ? 'bg-gradient-to-br from-[#220e1d] to-[#120915] border-[#881337] text-white shadow-[0_2px_14px_rgba(136,19,55,0.35)] ring-1 ring-[#c08497]/30'
                      : 'bg-[#150d1a] border-[#2b1527] text-[#a895a0] hover:text-[#fdfcfd] hover:border-[#3d1a31]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold font-serif text-[#fdfcfd]">Burgundy Mist</span>
                    {activeTheme === 'burgundy_night' && <Check className="w-3.5 h-3.5 text-[#c08497]" />}
                  </div>
                  <span className="text-[10px] text-[#806f7b] block font-sans leading-tight">
                    Rich wine glow & muted silver
                  </span>
                </button>
              </div>
            </div>

            {/* Accent Color Palette */}
            <div>
              <label className="text-xs font-semibold text-[#f1edf0] block mb-2 font-serif">
                Signature Accent
              </label>
              <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
                {ACCENT_OPTIONS.map((accent) => (
                  <button
                    key={accent.id}
                    type="button"
                    onClick={() => handleAccentChange(accent.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[14px] text-xs font-medium border transition-all duration-200 cursor-pointer whitespace-nowrap ${
                      activeAccent === accent.id
                        ? 'bg-[#240e1e] border-[#881337] text-white shadow-[0_2px_10px_rgba(136,19,55,0.3)] ring-1 ring-[#c08497]/30'
                        : 'bg-[#150d1a] border-[#2b1527] text-[#a895a0] hover:text-[#fdfcfd] hover:border-[#381a2e]'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${accent.color} ring-1 ring-white/20`} />
                    <span>{accent.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Text Size */}
            <div>
              <label className="text-xs font-semibold text-[#f1edf0] block mb-2 font-serif">
                Chat Typography Scale
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { id: 'compact', label: 'Compact' },
                  { id: 'standard', label: 'Standard' },
                  { id: 'comfortable', label: 'Comfortable' },
                ].map((size) => (
                  <button
                    key={size.id}
                    type="button"
                    onClick={() => handleFontSizeChange(size.id)}
                    className={`py-2 px-2.5 rounded-[14px] border text-center font-medium transition-all duration-200 cursor-pointer ${
                      chatFontSize === size.id
                        ? 'bg-gradient-to-r from-[#881337] to-[#6b0f2a] text-white border-[#c08497]/40 shadow-[0_2px_8px_rgba(136,19,55,0.3)]'
                        : 'bg-[#150d1a] text-[#a895a0] border-[#2b1527] hover:text-[#fdfcfd] hover:border-[#381a2e]'
                    }`}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-[#231222] text-[11px] text-[#806f7b] flex items-center gap-1.5 font-serif italic">
              <Sparkles className="w-3 h-3 text-[#c08497]" />
              <span>Sanctuary theme calibrated for comfortable nocturnal reading.</span>
            </div>
          </div>
        </section>

        {/* ================= SECTION 4: DATA & SANCTUARY ================= */}
        <section aria-labelledby="settings-data-heading" className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-[6px] bg-[#221020] border border-[#3e192c] flex items-center justify-center">
                <Shield className="w-2.5 h-2.5 text-[#c08497]" />
              </div>
              <h2 id="settings-data-heading" className="text-[11px] font-semibold text-[#c08497] uppercase tracking-widest font-sans">
                Data & Sanctuary Management
              </h2>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#170e1c] border border-[#32172a] text-[#806f7b] font-serif italic">
              Local Storage
            </span>
          </div>

          <div className="relative p-5 rounded-[26px] bg-gradient-to-b from-[#140e19] via-[#110b15] to-[#0e0812] border border-[#2d172a] shadow-[0_6px_26px_-4px_rgba(0,0,0,0.65)] space-y-3.5 overflow-hidden">
            {/* Subtle silver hairline highlight */}
            <div
              className="absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#c08497]/25 to-transparent pointer-events-none"
              aria-hidden="true"
            />

            <div className="flex items-start gap-2.5 text-xs text-[#a895a0] leading-relaxed">
              <Info className="w-4 h-4 text-[#c08497] shrink-0 mt-0.5" />
              <p>
                All dialogue, character personalities, and private memory vaults reside securely within your device's browser cache.
              </p>
            </div>

            <div className="pt-2 border-t border-[#241223] flex flex-col gap-2.5">
              {confirmClearChats ? (
                <div className="p-4 bg-[#240d1a] border border-[#881337]/70 rounded-[20px] space-y-2.5 animate-in fade-in shadow-[0_4px_20px_rgba(136,19,55,0.3)]">
                  <p className="text-xs text-rose-200 font-medium leading-relaxed font-serif">
                    Reset active companion dialogues to initial greetings? Your custom companions and memory vaults will remain safe.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      id="confirm-clear-chats-btn"
                      type="button"
                      onClick={handleClearAllChats}
                      className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#881337] to-[#600e23] hover:from-[#9f1239] border border-[#c08497]/30 rounded-[12px] transition-all shadow cursor-pointer"
                    >
                      Yes, Reset Chat Messages
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClearChats(false)}
                      className="px-4 py-2 text-xs text-[#a895a0] hover:text-white bg-[#1a0e1c] hover:bg-[#251228] rounded-[12px] transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  id="settings-clear-chats-btn"
                  type="button"
                  onClick={() => setConfirmClearChats(true)}
                  className="w-full text-left px-4 py-3 text-xs font-medium text-[#e0cfd8] hover:text-white bg-gradient-to-r from-[#160d1b] to-[#120916] hover:from-[#1d1023] hover:to-[#170c1c] rounded-[18px] border border-[#2b1527] hover:border-[#881337]/60 transition-all duration-200 flex items-center justify-between cursor-pointer shadow-sm"
                >
                  <span className="flex items-center gap-2.5">
                    <RotateCcw className="w-3.5 h-3.5 text-[#c08497]" />
                    <span>Reset All Conversation History</span>
                  </span>
                  <span className="text-[10px] text-[#806f7b] font-serif italic">Restores greetings</span>
                </button>
              )}

              <button
                id="settings-restore-defaults-btn"
                type="button"
                onClick={handleRestoreDefaultCharacters}
                className="w-full text-left px-4 py-3 text-xs font-medium text-[#e0cfd8] hover:text-white bg-gradient-to-r from-[#160d1b] to-[#120916] hover:from-[#1d1023] hover:to-[#170c1c] rounded-[18px] border border-[#2b1527] hover:border-[#881337]/60 transition-all duration-200 flex items-center justify-between cursor-pointer shadow-sm"
              >
                <span className="flex items-center gap-2.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#c08497]" />
                  <span>Restore Built-in Companions</span>
                </span>
                <span className="text-[10px] text-[#806f7b] font-serif italic">Lord Cassian & Morrigan</span>
              </button>
            </div>
          </div>
        </section>

        {/* Brand Footer Signoff */}
        <div className="pt-2 pb-6 text-center space-y-1">
          <p className="font-['Cormorant_Garamond',serif] text-sm italic text-[#c08497]/70">
            Veya • Private Dark Romance Sanctuary
          </p>
          <p className="text-[10px] text-[#806f7b] font-sans">
            Client-side encrypted memory architecture
          </p>
        </div>
      </div>

      {/* Character Memory Modal for Settings */}
      {memoryModalCharacter && (
        <CharacterMemoryModal
          character={memoryModalCharacter}
          isOpen={Boolean(memoryModalCharacter)}
          onClose={() => {
            setMemoryModalCharacter(null);
            refreshMemoryCounts();
          }}
          onMemoriesUpdated={() => refreshMemoryCounts()}
        />
      )}
    </div>
  );
};
