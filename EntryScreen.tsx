import React, { useState } from 'react';
import { User, Sparkles, ArrowRight } from 'lucide-react';
import { VeyaLogo } from './VeyaLogo';
import { UserProfile } from '../types';

interface EntryScreenProps {
  userProfile: UserProfile;
  onEnter: (updatedProfile: UserProfile) => void;
}

export const EntryScreen: React.FC<EntryScreenProps> = ({ userProfile, onEnter }) => {
  const [name, setName] = useState(userProfile.name || '');

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalName = name.trim() || userProfile.name || 'Seeker';
    onEnter({
      ...userProfile,
      name: finalName,
    });
  };

  const handleQuickGuest = () => {
    onEnter({
      ...userProfile,
      name: userProfile.name || 'Seeker',
    });
  };

  return (
    <div
      id="veya-entry-screen"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070508] px-5 py-8 select-none overflow-y-auto"
    >
      {/* Dark layered background with atmospheric burgundy glow */}
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(136,19,55,0.18),rgba(72,10,25,0.06)_50%,transparent_75%)] pointer-events-none"
        aria-hidden="true"
      />

      {/* Subtle silver hairline highlight at the top */}
      <div
        className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#c08497]/30 to-transparent pointer-events-none"
        aria-hidden="true"
      />

      {/* Main Glassmorphic Card */}
      <div className="relative w-full max-w-sm rounded-[28px] bg-gradient-to-b from-[#140e19]/90 to-[#0f0a13]/95 border border-[#35192c] p-6 sm:p-8 shadow-[0_16px_48px_rgba(0,0,0,0.85),0_0_32px_rgba(136,19,55,0.2)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-500">
        {/* Subtle top edge highlight */}
        <div
          className="absolute inset-x-12 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#c08497]/40 to-transparent pointer-events-none"
          aria-hidden="true"
        />

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-[22px] bg-gradient-to-b from-[#1e1222] to-[#120b16] border border-[#441a2d] shadow-[0_4px_24px_rgba(0,0,0,0.6),0_0_16px_rgba(136,19,55,0.25)] flex items-center justify-center mb-3.5">
            <VeyaLogo size={38} />
          </div>

          <h1 className="font-['Cormorant_Garamond',serif] text-3xl font-semibold tracking-wide text-[#fdfcfd] leading-none mb-2">
            Veya
          </h1>
          <p className="text-xs text-[#c08497]/80 font-serif italic tracking-wide max-w-[240px] leading-relaxed">
            A sanctuary of dark romance companions and private correspondence.
          </p>
        </div>

        {/* Entry Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="entry-name-input"
              className="text-[11px] font-medium tracking-wider uppercase text-[#c08497]/90 flex items-center gap-1.5 px-0.5"
            >
              <User className="w-3 h-3 text-[#c08497]" />
              Your Persona / Name
            </label>
            <div className="relative">
              <input
                id="entry-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="How should companions address you?"
                maxLength={40}
                className="w-full px-4 py-3 rounded-[18px] bg-[#1a101f] border border-[#3b192e] text-sm text-[#f1edf0] placeholder-[#806f7b] focus:outline-none focus:border-[#881337] focus:ring-1 focus:ring-[#881337]/60 transition-all"
              />
            </div>
          </div>

          <div className="pt-2 space-y-2.5">
            <button
              id="entry-submit-btn"
              type="submit"
              className="w-full py-3.5 px-5 rounded-[20px] font-semibold text-xs tracking-wide text-white bg-gradient-to-r from-[#881337] via-[#75112e] to-[#540b1e] hover:from-[#9f1239] hover:to-[#680e25] border border-[#c08497]/30 shadow-[0_4px_22px_rgba(136,19,55,0.4)] flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <span>Enter Sanctuary</span>
              <ArrowRight className="w-4 h-4 text-rose-200" />
            </button>

            <button
              id="entry-guest-btn"
              type="button"
              onClick={handleQuickGuest}
              className="w-full py-2.5 px-4 rounded-[18px] text-[11px] font-medium text-[#a895a0] hover:text-[#f1edf0] hover:bg-[#1f1323] transition-colors"
            >
              Continue as Guest
            </button>
          </div>
        </form>
      </div>

      {/* Footer subtle attribution */}
      <div className="mt-8 text-center pointer-events-none">
        <p className="text-[10px] text-[#6b5866] tracking-widest uppercase">
          Private • Encrypted • Local
        </p>
      </div>
    </div>
  );
};
