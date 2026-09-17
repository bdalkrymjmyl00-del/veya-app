import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Sparkles, Check, RotateCcw, Eye, Shield } from 'lucide-react';
import { UserProfile } from '../types';
import { loadUserProfile, saveUserProfile, DEFAULT_USER_PROFILE } from '../storage';

interface UserProfileViewProps {
  onBack: () => void;
  onSaved?: (profile: UserProfile) => void;
}

const PRESET_PERSONAS = [
  {
    label: 'Shadowbound Seeker',
    name: 'Rowan',
    age: '26',
    gender: 'Ambiguous',
    appearance: 'Tall with dark hooded velvet cloak, sharp hazel eyes, quiet footsteps, silver ring with deep wine gem.',
    personality: 'Perceptive, calm under pressure, witty, slow to trust but fiercely loyal and protective.',
    background: 'A solitary wanderer through misty borderlands, keeping ancient records of forgotten covenants.',
    interests: 'Nocturnal walks, ancient cartography, acoustic melodies, roasted black tea.',
    additionalDetails: 'Has a faint scar across the left palm from an ancient oath. Prefers the quiet corners of candlelit rooms.',
  },
  {
    label: 'Nocturnal Scholar',
    name: 'Caelen',
    age: '28',
    gender: 'Male',
    appearance: 'Messy dark hair, wire-rimmed glasses, tailored dark linen coat with ink-stained silver cuffs.',
    personality: 'Thoughtful, curious, gentle-spoken, deeply observant with a dry, teasing wit.',
    background: 'Former keeper of an ancient secluded library who seeks living lore and forbidden manuscripts.',
    interests: 'Forgotten languages, antique clockwork, rare poetry, quiet alcoves.',
    additionalDetails: 'Always carries an embossed leather notebook filled with handwritten thoughts and sketches.',
  },
  {
    label: 'Elegiac Romantic',
    name: 'Elysia',
    age: '24',
    gender: 'Female',
    appearance: 'Soft dark waves pinned with silver clips, dark plum silk shawl, observant amber eyes, graceful posture.',
    personality: 'Poetic, intuitive, honest, empathetic with a playful spark beneath quiet composure.',
    background: 'Raised among cathedral gardens and ancient towers, seeking genuine intimacy away from court politics.',
    interests: 'Stargazing, harpsichord melodies, handwritten correspondence, rain on stone terraces.',
    additionalDetails: 'Speaks softly and values deep listening over loud declarations.',
  },
];

export const UserProfileView: React.FC<UserProfileViewProps> = ({ onBack, onSaved }) => {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    const loaded = loadUserProfile();
    setProfile(loaded);
  }, []);

  const handleChange = (field: keyof UserProfile, value: string) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    saveUserProfile(profile);
    setShowSavedFeedback(true);
    if (onSaved) onSaved(profile);
    setTimeout(() => setShowSavedFeedback(false), 2500);
  };

  const handleApplyPreset = (preset: typeof PRESET_PERSONAS[0]) => {
    const updated: UserProfile = {
      name: preset.name,
      age: preset.age,
      gender: preset.gender,
      appearance: preset.appearance,
      personality: preset.personality,
      background: preset.background,
      interests: preset.interests,
      additionalDetails: preset.additionalDetails,
    };
    setProfile(updated);
    saveUserProfile(updated);
    setShowSavedFeedback(true);
    if (onSaved) onSaved(updated);
    setTimeout(() => setShowSavedFeedback(false), 2000);
  };

  const handleReset = () => {
    if (window.confirm('Reset your profile back to default settings?')) {
      setProfile(DEFAULT_USER_PROFILE);
      saveUserProfile(DEFAULT_USER_PROFILE);
      if (onSaved) onSaved(DEFAULT_USER_PROFILE);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-[#070508] text-[#f1edf0]">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-20 px-4 py-3.5 bg-[#0d0a0f]/95 backdrop-blur-md border-b border-[#23141d]/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            id="back-from-profile-btn"
            onClick={onBack}
            className="p-1.5 -ml-1 text-[#a895a0] hover:text-[#fdfcfd] hover:bg-[#1a101f] rounded-xl transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-['Cormorant_Garamond',serif] text-xl font-semibold tracking-tight text-[#fdfcfd] flex items-center gap-2">
              <User className="w-4 h-4 text-[#c08497]" />
              <span>My Persona Profile</span>
            </h1>
            <p className="text-[11px] font-serif italic text-[#c08497]/80">
              Shared persona across all companion correspondence
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="save-user-profile-header-btn"
            onClick={() => handleSave()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-[#881337] via-[#75112e] to-[#550b1e] hover:from-[#9f1239] text-white text-xs font-semibold rounded-[14px] border border-[#c08497]/30 shadow-[0_2px_12px_rgba(136,19,55,0.35)] transition-all active:scale-95"
          >
            {showSavedFeedback ? (
              <>
                <Check className="w-3.5 h-3.5 text-rose-200" />
                <span>Saved!</span>
              </>
            ) : (
              <span>Save</span>
            )}
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-w-xl mx-auto w-full pb-24">
        {/* Intro Context Banner */}
        <div className="p-3.5 rounded-[22px] bg-[#130c17] border border-[#2b1527] space-y-2">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-[#881337]/30 text-rose-300 flex items-center justify-center shrink-0 mt-0.5 border border-[#881337]/40">
              <Sparkles className="w-3.5 h-3.5 text-[#c08497]" />
            </div>
            <div className="text-xs space-y-1">
              <p className="font-['Cormorant_Garamond',serif] text-sm font-semibold text-[#fdfcfd]">
                Persistent Sanctuary Context
              </p>
              <p className="text-[#a895a0] leading-relaxed text-[11px] font-sans">
                Every companion will naturally recognize these facets when speaking with you. They will never recite your dossier unnaturally, nor will they speak for your character or dictate your decisions.
              </p>
            </div>
          </div>
        </div>

        {/* Mode Toggle: Edit Form vs Live Perception Preview */}
        <div className="flex items-center p-1 bg-[#120a15] rounded-[18px] border border-[#291325]">
          <button
            id="profile-tab-edit"
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-[14px] transition-all ${
              activeTab === 'edit'
                ? 'bg-gradient-to-r from-[#881337] to-[#600e23] text-white shadow-sm border border-[#c08497]/30'
                : 'text-[#a895a0] hover:text-[#fdfcfd]'
            }`}
          >
            Edit Persona Details
          </button>
          <button
            id="profile-tab-preview"
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-[14px] flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'preview'
                ? 'bg-gradient-to-r from-[#881337] to-[#600e23] text-white shadow-sm border border-[#c08497]/30'
                : 'text-[#a895a0] hover:text-[#fdfcfd]'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-[#c08497]" />
            <span>Companion Perception</span>
          </button>
        </div>

        {activeTab === 'preview' ? (
          /* PREVIEW CARD: Shows how AI companions perceive the user */
          <div className="space-y-3.5 animate-in fade-in duration-200">
            <div className="p-5 rounded-[24px] bg-gradient-to-b from-[#140d18] to-[#0f0913] border border-[#32172a] space-y-4 shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="w-13 h-13 rounded-[20px] bg-gradient-to-b from-[#221226] to-[#150a18] border border-[#441a33] flex items-center justify-center text-rose-200 font-serif font-bold text-xl shadow-[0_2px_12px_rgba(136,19,55,0.3)]">
                  {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h3 className="font-['Cormorant_Garamond',serif] text-lg font-semibold text-[#fdfcfd] flex items-center gap-2">
                    <span>{profile.name || 'Anonymous Seeker'}</span>
                    {profile.age && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1e1022] text-[#c08497] font-normal border border-[#3e192f]">
                        {profile.age}
                      </span>
                    )}
                    {profile.gender && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1e1022] text-[#c08497] font-normal border border-[#3e192f]">
                        {profile.gender}
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] font-serif italic text-[#c08497]/80 mt-0.5">
                    {profile.personality ? `Disposition: ${profile.personality}` : 'No personality traits set'}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-[#291325] text-xs">
                {profile.appearance && (
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#c08497] block mb-1">
                      Appearance & Presence
                    </span>
                    <p className="text-[#f1edf0] leading-relaxed bg-[#160e1b] p-3 rounded-[16px] border border-[#2d1527]">
                      {profile.appearance}
                    </p>
                  </div>
                )}

                {profile.background && (
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#c08497] block mb-1">
                      Background & Personal Lore
                    </span>
                    <p className="text-[#f1edf0] leading-relaxed bg-[#160e1b] p-3 rounded-[16px] border border-[#2d1527]">
                      {profile.background}
                    </p>
                  </div>
                )}

                {profile.interests && (
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#c08497] block mb-1">
                      Interests & Quiet Passions
                    </span>
                    <p className="text-[#f1edf0] leading-relaxed bg-[#160e1b] p-3 rounded-[16px] border border-[#2d1527]">
                      {profile.interests}
                    </p>
                  </div>
                )}

                {profile.additionalDetails && (
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#c08497] block mb-1">
                      Hidden Details & Secrets
                    </span>
                    <p className="text-[#f1edf0] leading-relaxed bg-[#160e1b] p-3 rounded-[16px] border border-[#2d1527]">
                      {profile.additionalDetails}
                    </p>
                  </div>
                )}

                {!profile.appearance && !profile.background && !profile.interests && !profile.additionalDetails && (
                  <p className="text-xs text-[#806f7b] italic py-3 text-center font-serif">
                    Add facets in the Edit tab to grant companions deeper perception of your presence.
                  </p>
                )}
              </div>
            </div>

            <div className="p-3 bg-[#130b17] rounded-[18px] border border-[#2b1427] text-[11px] text-[#a895a0] flex items-start gap-2">
              <Shield className="w-4 h-4 text-[#c08497] shrink-0 mt-0.5" />
              <span>
                Your persona is stored exclusively on your device and weaves gracefully into every companion interaction.
              </span>
            </div>
          </div>
        ) : (
          /* EDIT PROFILE FORM */
          <form onSubmit={handleSave} className="space-y-4 animate-in fade-in duration-200">
            {/* Quick Presets */}
            <div>
              <label className="block text-[11px] font-semibold text-[#c08497] uppercase tracking-wider mb-2">
                Quick Fill Archetypes (Optional)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_PERSONAS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="px-3 py-1.5 text-[11px] font-medium bg-[#140d18] hover:bg-[#1d1123] text-[#e0cfd8] hover:text-white rounded-[14px] border border-[#2e1629] transition-all"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 1. Name */}
            <div className="space-y-1">
              <label htmlFor="user-profile-name-input" className="block text-[11px] font-medium tracking-wider uppercase text-[#c08497]/90">
                Persona Name <span className="text-rose-400">*</span>
              </label>
              <input
                id="user-profile-name-input"
                type="text"
                required
                value={profile.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="How should companions address you?"
                className="w-full px-4 py-3 bg-[#140e19] border border-[#2e1728] rounded-[18px] text-xs text-[#f1edf0] placeholder-[#806f7b] focus:outline-none focus:border-[#881337] focus:ring-1 focus:ring-[#881337]/50 transition-all font-sans"
              />
              <p className="text-[10px] text-[#806f7b] font-serif italic">
                The name companions whisper during conversation.
              </p>
            </div>

            {/* 2 & 3. Age & Gender in a two-column row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="user-profile-age-input" className="block text-[11px] font-medium tracking-wider uppercase text-[#c08497]/90">
                  Age
                </label>
                <input
                  id="user-profile-age-input"
                  type="text"
                  value={profile.age || ''}
                  onChange={(e) => handleChange('age', e.target.value)}
                  placeholder="e.g. 24, late 20s"
                  className="w-full px-4 py-3 bg-[#140e19] border border-[#2e1728] rounded-[18px] text-xs text-[#f1edf0] placeholder-[#806f7b] focus:outline-none focus:border-[#881337] focus:ring-1 focus:ring-[#881337]/50 transition-all font-sans"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="user-profile-gender-input" className="block text-[11px] font-medium tracking-wider uppercase text-[#c08497]/90">
                  Gender <span className="text-[#806f7b] font-normal lowercase">(optional)</span>
                </label>
                <input
                  id="user-profile-gender-input"
                  type="text"
                  value={profile.gender || ''}
                  onChange={(e) => handleChange('gender', e.target.value)}
                  placeholder="e.g. Female, Male, Non-binary"
                  className="w-full px-4 py-3 bg-[#140e19] border border-[#2e1728] rounded-[18px] text-xs text-[#f1edf0] placeholder-[#806f7b] focus:outline-none focus:border-[#881337] focus:ring-1 focus:ring-[#881337]/50 transition-all font-sans"
                />
              </div>
            </div>

            {/* 4. Appearance */}
            <div className="space-y-1">
              <label htmlFor="user-profile-appearance-input" className="block text-[11px] font-medium tracking-wider uppercase text-[#c08497]/90">
                Appearance & Attire
              </label>
              <textarea
                id="user-profile-appearance-input"
                rows={2}
                value={profile.appearance || ''}
                onChange={(e) => handleChange('appearance', e.target.value)}
                placeholder="e.g. Tall, messy dark waves, piercing hazel eyes, dark velvet coat, silver signet ring..."
                className="w-full px-4 py-3 bg-[#140e19] border border-[#2e1728] rounded-[18px] text-xs text-[#f1edf0] placeholder-[#806f7b] focus:outline-none focus:border-[#881337] focus:ring-1 focus:ring-[#881337]/50 resize-none transition-all font-sans"
              />
              <p className="text-[10px] text-[#806f7b] font-serif italic">
                Helps companions notice your attire, physical demeanor, and gestures.
              </p>
            </div>

            {/* 5. Personality */}
            <div className="space-y-1">
              <label htmlFor="user-profile-personality-input" className="block text-[11px] font-medium tracking-wider uppercase text-[#c08497]/90">
                Personality & Temperament
              </label>
              <textarea
                id="user-profile-personality-input"
                rows={2}
                value={profile.personality || ''}
                onChange={(e) => handleChange('personality', e.target.value)}
                placeholder="e.g. Calm, observant, witty, teasing, slightly guarded, gentle listener..."
                className="w-full px-4 py-3 bg-[#140e19] border border-[#2e1728] rounded-[18px] text-xs text-[#f1edf0] placeholder-[#806f7b] focus:outline-none focus:border-[#881337] focus:ring-1 focus:ring-[#881337]/50 resize-none transition-all font-sans"
              />
              <p className="text-[10px] text-[#806f7b] font-serif italic">
                Your character's natural demeanor and disposition.
              </p>
            </div>

            {/* 6. Background */}
            <div className="space-y-1">
              <label htmlFor="user-profile-background-input" className="block text-[11px] font-medium tracking-wider uppercase text-[#c08497]/90">
                Origins & Past History
              </label>
              <textarea
                id="user-profile-background-input"
                rows={2}
                value={profile.background || ''}
                onChange={(e) => handleChange('background', e.target.value)}
                placeholder="e.g. A solitary wanderer through forgotten misty paths, carrying the memories of an ancient kingdom..."
                className="w-full px-4 py-3 bg-[#140e19] border border-[#2e1728] rounded-[18px] text-xs text-[#f1edf0] placeholder-[#806f7b] focus:outline-none focus:border-[#881337] focus:ring-1 focus:ring-[#881337]/50 resize-none transition-all font-sans"
              />
              <p className="text-[10px] text-[#806f7b] font-serif italic">
                Your backstory, heritage, or personal lore.
              </p>
            </div>

            {/* 7. Interests */}
            <div className="space-y-1">
              <label htmlFor="user-profile-interests-input" className="block text-[11px] font-medium tracking-wider uppercase text-[#c08497]/90">
                Interests & Quiet Passions
              </label>
              <textarea
                id="user-profile-interests-input"
                rows={2}
                value={profile.interests || ''}
                onChange={(e) => handleChange('interests', e.target.value)}
                placeholder="e.g. Celestial charts, antique clockwork, acoustic melodies, rainy walks, bitter tea..."
                className="w-full px-4 py-3 bg-[#140e19] border border-[#2e1728] rounded-[18px] text-xs text-[#f1edf0] placeholder-[#806f7b] focus:outline-none focus:border-[#881337] focus:ring-1 focus:ring-[#881337]/50 resize-none transition-all font-sans"
              />
            </div>

            {/* 8. Additional Details */}
            <div className="space-y-1">
              <label htmlFor="user-profile-additional-input" className="block text-[11px] font-medium tracking-wider uppercase text-[#c08497]/90">
                Special Quirks & Secrets
              </label>
              <textarea
                id="user-profile-additional-input"
                rows={2}
                value={profile.additionalDetails || ''}
                onChange={(e) => handleChange('additionalDetails', e.target.value)}
                placeholder="e.g. Carries an antique locket, speaks with a slight northern cadence, quietly flustered when praised..."
                className="w-full px-4 py-3 bg-[#140e19] border border-[#2e1728] rounded-[18px] text-xs text-[#f1edf0] placeholder-[#806f7b] focus:outline-none focus:border-[#881337] focus:ring-1 focus:ring-[#881337]/50 resize-none transition-all font-sans"
              />
            </div>

            {/* Actions Bottom Bar */}
            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#806f7b] hover:text-[#fdfcfd] hover:bg-[#180e1b] rounded-[14px] transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Defaults</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onBack}
                  className="px-4 py-2 text-xs font-medium text-[#a895a0] hover:text-[#fdfcfd] hover:bg-[#180e1b] rounded-[14px] transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="save-user-profile-btn"
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-[#881337] via-[#75112e] to-[#550b1e] hover:from-[#9f1239] rounded-[16px] border border-[#c08497]/30 shadow-[0_2px_14px_rgba(136,19,55,0.4)] transition-all active:scale-95"
                >
                  {showSavedFeedback ? (
                    <>
                      <Check className="w-4 h-4 text-rose-200" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <span>Save Persona</span>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
