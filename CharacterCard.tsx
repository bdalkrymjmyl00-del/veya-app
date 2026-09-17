import React from 'react';
import { MoreVertical, Pencil, Trash2, Brain, Sparkles } from 'lucide-react';
import { Character, CharacterStatus } from '../types';
import { CharacterAvatar } from './CharacterAvatar';
import { getCharacterStatus, loadCharacterMemories } from '../storage';

interface CharacterCardProps {
  character: Character;
  onSelect: (character: Character) => void;
  onEdit: (character: Character) => void;
  onDelete: (id: string) => void;
  onManageMemory?: (character: Character) => void;
  lastMessagePreview?: string;
  lastMessageTimestamp?: number;
  lastMessageRole?: 'user' | 'model';
}

const formatChatTime = (timestamp?: number): string => {
  if (!timestamp) return '';
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 24 && now.getDate() === date.getDate()) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  if (diffHours < 48 && (now.getDate() - date.getDate() === 1 || now.getDate() - date.getDate() === -30)) {
    return 'Yesterday';
  }
  if (diffHours < 24 * 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  onSelect,
  onEdit,
  onDelete,
  onManageMemory,
  lastMessagePreview,
  lastMessageTimestamp,
  lastMessageRole,
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);

  const timeDisplay = formatChatTime(lastMessageTimestamp || character.updatedAt);
  const displayPreview = lastMessagePreview || character.greeting;
  const status: CharacterStatus = getCharacterStatus(character);
  const memoryCount = loadCharacterMemories(character.id).length;

  const statusConfig = {
    Online: {
      dotBg: 'bg-emerald-400',
      glow: 'shadow-[0_0_8px_rgba(52,211,153,0.7)]',
      badgeBg: 'bg-[#0d1f17]/90',
      badgeText: 'text-emerald-300',
      border: 'border-emerald-800/40',
      label: 'Online',
    },
    Busy: {
      dotBg: 'bg-amber-400',
      glow: 'shadow-[0_0_8px_rgba(251,191,36,0.65)]',
      badgeBg: 'bg-[#22160a]/90',
      badgeText: 'text-amber-300',
      border: 'border-amber-800/40',
      label: 'Busy',
    },
    Offline: {
      dotBg: 'bg-[#8e7f8b]',
      glow: '',
      badgeBg: 'bg-[#18111b]/90',
      badgeText: 'text-[#a895a0]',
      border: 'border-[#362130]/50',
      label: 'Offline',
    },
  }[status];

  return (
    <div
      id={`character-card-${character.id}`}
      className="group relative flex items-center gap-4 sm:gap-5 p-4 sm:p-5 rounded-[26px] bg-gradient-to-br from-[#140e18] via-[#110c15] to-[#0d0911] hover:from-[#19111f] hover:to-[#120c17] active:bg-[#1d1323] border border-[#2d1828] hover:border-[#7c1d37]/80 transition-all duration-300 ease-out hover:-translate-y-1 active:scale-[0.985] active:translate-y-0 cursor-pointer shadow-[0_6px_26px_-4px_rgba(0,0,0,0.65),0_0_16px_rgba(114,16,40,0.1)] hover:shadow-[0_14px_38px_-4px_rgba(0,0,0,0.75),0_0_28px_rgba(136,19,55,0.22)] overflow-hidden"
      onClick={() => onSelect(character)}
    >
      {/* Subtle silver hairline highlight on top edge */}
      <div
        className="absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#c08497]/30 to-transparent pointer-events-none"
        aria-hidden="true"
      />

      {/* Faint watermark curve inspired by the Veya petal motif */}
      <svg
        className="absolute -right-6 -bottom-6 w-32 h-32 opacity-[0.035] group-hover:opacity-[0.06] transition-opacity duration-500 pointer-events-none"
        viewBox="0 0 36 36"
        fill="currentColor"
      >
        <path d="M8 9.5C10.5 15.5 14.5 24.5 18 28C21.5 24.5 25.5 15.5 28 9.5C25.5 13 21 16.5 18 16.5C15 16.5 10.5 13 8 9.5Z" />
      </svg>

      {/* Larger Profile Image with Smooth Curved Frame & Subtle Halo */}
      <div className="relative shrink-0">
        <CharacterAvatar
          name={character.name}
          avatarColor={character.avatarColor}
          avatarImage={character.avatarImage}
          size="card"
          shape="curved"
          className="ring-1 ring-[#c08497]/40 ring-offset-2 ring-offset-[#110c15] transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />

        {/* Small Status Indicator Dot on Avatar */}
        <span
          className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ring-2 ring-[#110c15] flex items-center justify-center ${statusConfig.dotBg} ${statusConfig.glow}`}
          title={`Status: ${statusConfig.label}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
        </span>
      </div>

      {/* Content & Information */}
      <div className="flex-1 min-w-0 pr-6 sm:pr-8">
        {/* Top row: Name, Status badge & Time */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-['Cormorant_Garamond',serif] text-xl sm:text-[22px] font-semibold tracking-wide text-[#fdfcfd] leading-none group-hover:text-rose-100 transition-colors truncate">
                {character.name}
              </h3>

              {/* Small Status Indicator Badge */}
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide border ${statusConfig.badgeBg} ${statusConfig.badgeText} ${statusConfig.border} shrink-0`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotBg} ${statusConfig.glow}`} />
                {statusConfig.label}
              </span>
            </div>

            {/* Tagline / Archetype if available */}
            {character.tagline && (
              <p className="text-[11px] sm:text-xs text-[#c08497]/85 font-serif italic tracking-wide truncate mt-0.5">
                {character.tagline}
              </p>
            )}
          </div>

          {timeDisplay && (
            <span className="text-[11px] text-[#a895a0] font-normal shrink-0 font-sans mt-0.5">
              {timeDisplay}
            </span>
          )}
        </div>

        {/* Bottom row: Last message preview & subtle memory counter */}
        <div className="flex items-center justify-between gap-2 mt-1">
          <div className="flex items-center text-xs sm:text-[13px] text-[#a895a0] line-clamp-1 leading-relaxed min-w-0">
            {lastMessageRole === 'user' && (
              <span className="text-[#c08497] font-medium mr-1.5 shrink-0">You:</span>
            )}
            <span className="truncate text-[#9f8e9c] group-hover:text-[#cfc3cb] transition-colors font-light">
              {displayPreview}
            </span>
          </div>

          {memoryCount > 0 && (
            <span
              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-[#1d1221] text-[#d8a4b8] border border-[#3d192c]/70 shrink-0"
              title={`${memoryCount} memories remembered`}
            >
              <Sparkles className="w-2.5 h-2.5 text-[#c08497]" />
              <span>{memoryCount}</span>
            </span>
          )}
        </div>
      </div>

      {/* Options Menu Button with Soft Hover */}
      <div
        className="absolute top-4 right-2 sm:right-3"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          id={`character-menu-btn-${character.id}`}
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-1.5 rounded-xl text-[#a895a0] hover:text-[#f1edf0] hover:bg-[#251726]/80 active:bg-[#34182f] transition-all"
          aria-label="Character options"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-8 z-40 w-48 rounded-[20px] bg-[#170f1a] border border-[#3e1b2e] shadow-[0_14px_40px_rgba(0,0,0,0.85),0_0_24px_rgba(136,19,55,0.25)] py-2 text-xs animate-in fade-in zoom-in-95 duration-150">
              <button
                id={`memory-char-btn-${character.id}`}
                onClick={() => {
                  setMenuOpen(false);
                  onManageMemory?.(character);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[#e2cbd2] hover:text-white hover:bg-[#281527] transition-colors text-left font-medium"
              >
                <Brain className="w-4 h-4 text-[#c08497]" />
                <span>Memory Bank ({memoryCount})</span>
              </button>
              <button
                id={`edit-char-btn-${character.id}`}
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(character);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[#e2cbd2] hover:text-white hover:bg-[#281527] transition-colors text-left font-medium"
              >
                <Pencil className="w-4 h-4 text-[#a895a0]" />
                <span>Edit Character</span>
              </button>
              <button
                id={`delete-char-btn-${character.id}`}
                onClick={() => {
                  setMenuOpen(false);
                  if (window.confirm(`Delete ${character.name}? All chat history for this character will be cleared.`)) {
                    onDelete(character.id);
                  }
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-rose-300 hover:text-rose-200 hover:bg-rose-950/50 transition-colors text-left border-t border-[#311624] mt-1 font-medium"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Delete Character</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

