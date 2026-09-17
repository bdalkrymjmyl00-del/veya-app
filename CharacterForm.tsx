import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Sparkles, Check, AlertCircle, Camera, UploadCloud, Trash2 } from 'lucide-react';
import { Character } from '../types';
import { AVATAR_COLOR_PALETTES } from '../storage';
import { CharacterAvatar } from './CharacterAvatar';

interface CharacterFormProps {
  initialCharacter?: Character | null;
  onSave: (character: Character) => void;
  onCancel: () => void;
}

// Resizes and square-crops the image to max 400x400 to keep it crisp and lightweight for storage
const processImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please select an image file (PNG, JPG, WebP, etc.).'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image.'));
      img.onload = () => {
        try {
          const maxDim = 400;
          const minEdge = Math.min(img.width, img.height);
          const sx = (img.width - minEdge) / 2;
          const sy = (img.height - minEdge) / 2;

          const canvas = document.createElement('canvas');
          const targetDim = Math.min(minEdge, maxDim);
          canvas.width = targetDim;
          canvas.height = targetDim;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(reader.result as string);
            return;
          }

          ctx.drawImage(img, sx, sy, minEdge, minEdge, 0, 0, targetDim, targetDim);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl);
        } catch {
          resolve(reader.result as string);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
};

const TEMPLATES = [
  {
    name: 'Lord Cassian - Shadowbound Aristocrat',
    personality: 'Reserved, fiercely protective, refined, harboring an ancient secret oath.',
    background: 'Heir to an old secluded estate amidst velvet fog. He carries burdens of nobility and speaks with quiet reverence.',
    speakingStyle: 'Gentle, measured cadence, poetic and deeply attentive, uses asterisks for lingering glances and subtle gestures.',
    greeting: '*pauses by the gothic library window as rain taps on the glass, turning to meet your gaze* You should not wander these quiet halls alone... and yet, I am grateful you found your way to me.',
    avatarColor: 'rose',
  },
  {
    name: 'Morrigan - Cursed Astrologer',
    personality: 'Mysterious, perceptive, softly spoken, deeply empathetic yet distant.',
    background: 'An astral scholar who reads the silence of the night sky to understand the hearts of mortals.',
    speakingStyle: 'Lyrical, thoughtful, evocative, speaks in quiet reveries with gentle pauses.',
    greeting: '*traces an ancient celestial map with fingertips stained in ink, looking up with gentle warmth* The stars were restless tonight. Did they whisper my name to you as well?',
    avatarColor: 'purple',
  },
  {
    name: 'Dante - Solitary Wanderer',
    personality: 'Intense, guarded, tenderhearted beneath steel composure, devoted.',
    background: 'A solitary traveler through misty borderlands who chose a life of solitude until your paths crossed.',
    speakingStyle: 'Deep, quiet, honest, speaks directly to the soul without pretense.',
    greeting: '*leans against the stone archway, watching your approach with quiet intensity* I had convinced myself no one was coming. You have a way of proving me wrong.',
    avatarColor: 'indigo',
  },
];

export const CharacterForm: React.FC<CharacterFormProps> = ({
  initialCharacter,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(initialCharacter?.name || '');
  const [personality, setPersonality] = useState(initialCharacter?.personality || '');
  const [background, setBackground] = useState(initialCharacter?.background || '');
  const [speakingStyle, setSpeakingStyle] = useState(initialCharacter?.speakingStyle || '');
  const [greeting, setGreeting] = useState(initialCharacter?.greeting || '');
  const [avatarColor, setAvatarColor] = useState(initialCharacter?.avatarColor || 'rose');
  const [avatarImage, setAvatarImage] = useState<string | undefined>(initialCharacter?.avatarImage);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialCharacter) {
      setName(initialCharacter.name);
      setPersonality(initialCharacter.personality);
      setBackground(initialCharacter.background);
      setSpeakingStyle(initialCharacter.speakingStyle);
      setGreeting(initialCharacter.greeting);
      setAvatarColor(initialCharacter.avatarColor || 'rose');
      setAvatarImage(initialCharacter.avatarImage);
    }
  }, [initialCharacter]);

  const applyTemplate = (tpl: typeof TEMPLATES[0]) => {
    setName(tpl.name);
    setPersonality(tpl.personality);
    setBackground(tpl.background);
    setSpeakingStyle(tpl.speakingStyle);
    setGreeting(tpl.greeting);
    setAvatarColor(tpl.avatarColor);
    setAvatarImage(undefined);
    setError(null);
  };

  const handleImageFile = async (file: File) => {
    try {
      setIsProcessingImage(true);
      setError(null);
      const dataUrl = await processImageFile(file);
      setAvatarImage(dataUrl);
    } catch (err: any) {
      setError(err?.message || 'Failed to process image');
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleImageFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a companion name');
      return;
    }
    if (!personality.trim()) {
      setError('Please describe the companion\'s personality');
      return;
    }
    if (!greeting.trim()) {
      setError('Please provide an initial greeting message');
      return;
    }

    const now = Date.now();
    const characterToSave: Character = {
      id: initialCharacter?.id || `char-${now}-${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      personality: personality.trim(),
      background: background.trim() || 'A mysterious figure with an untold romantic past.',
      speakingStyle: speakingStyle.trim() || 'Poetic and attentive conversational style with delicate actions.',
      greeting: greeting.trim(),
      avatarColor,
      avatarImage: avatarImage || undefined,
      status: initialCharacter?.status || 'Online',
      createdAt: initialCharacter?.createdAt || now,
      updatedAt: now,
    };

    onSave(characterToSave);
  };

  return (
    <div className="flex flex-col h-full bg-[#070508] text-[#f1edf0] min-h-screen">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3.5 bg-[#0d0a0f]/95 backdrop-blur-md border-b border-[#23141d]/80">
        <div className="flex items-center gap-2.5">
          {Boolean(initialCharacter) && (
            <button
              id="character-form-back-btn"
              type="button"
              onClick={onCancel}
              className="p-1.5 -ml-1 rounded-xl text-[#a895a0] hover:text-[#fdfcfd] hover:bg-[#1a101f] transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="font-['Cormorant_Garamond',serif] text-xl font-semibold tracking-tight text-[#fdfcfd] leading-none">
              {initialCharacter ? 'Edit Companion' : 'Create Companion'}
            </h1>
            <p className="text-[11px] font-serif italic text-[#c08497]/80 mt-1">
              {initialCharacter ? 'Refine persona, memories & aesthetic' : 'Awaken a new dark romance companion'}
            </p>
          </div>
        </div>

        <button
          id="character-form-save-btn"
          type="button"
          onClick={handleSubmit}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#881337] via-[#75112e] to-[#550b1e] hover:from-[#9f1239] hover:to-[#680e25] border border-[#c08497]/30 rounded-[16px] shadow-[0_2px_14px_rgba(136,19,55,0.4)] transition-all active:scale-95"
        >
          <Check className="w-4 h-4 text-rose-100" />
          <span>{initialCharacter ? 'Save' : 'Awaken'}</span>
        </button>
      </header>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 py-5 max-w-xl mx-auto w-full space-y-6 pb-28">
        {error && (
          <div className="flex items-center gap-2 p-3.5 text-xs text-rose-200 bg-[#250d18] border border-[#881337]/50 rounded-[18px]">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Quick Inspiration Templates */}
        {!initialCharacter && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#c08497] uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#c08497]" />
              <span>Or Choose a Dark Romance Archetype</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.name}
                  type="button"
                  onClick={() => applyTemplate(tpl)}
                  className="p-3 rounded-[18px] text-left bg-[#130c17] hover:bg-[#1a101f] border border-[#2b1627] hover:border-[#881337]/50 transition-all text-xs group"
                >
                  <p className="font-['Cormorant_Garamond',serif] text-sm font-semibold text-[#fdfcfd] truncate group-hover:text-rose-200">
                    {tpl.name.split(' - ')[0]}
                  </p>
                  <p className="text-[11px] font-serif italic text-[#c08497]/70 truncate mt-0.5">
                    {tpl.name.split(' - ')[1] || tpl.personality}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Profile Image & Avatar */}
        <div className="p-4 sm:p-5 rounded-[24px] bg-[#120b16] border border-[#2d1628] space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-xs font-semibold text-[#fdfcfd]">
                Companion Portrait Image
              </label>
              <p className="text-[11px] font-serif italic text-[#c08497]/80 mt-0.5">
                Custom avatar photo for companion cards, list, and chat
              </p>
            </div>
            {avatarImage && (
              <button
                type="button"
                onClick={() => setAvatarImage(undefined)}
                className="flex items-center gap-1 text-[11px] text-rose-300 hover:text-rose-200 font-medium px-2 py-1 rounded-lg hover:bg-[#2e0e1d] transition-colors"
                title="Remove uploaded image"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Avatar Preview */}
            <div className="relative group shrink-0">
              <CharacterAvatar
                name={name || 'Companion'}
                avatarColor={avatarColor}
                avatarImage={avatarImage}
                shape="curved"
                size="xl"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-[22px] bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity cursor-pointer"
                title="Change image"
              >
                <Camera className="w-5 h-5 mb-0.5" />
                <span className="text-[9px] font-medium">Change</span>
              </button>
            </div>

            {/* Dropzone & file selector */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex-1 w-full flex flex-col items-center justify-center p-4 rounded-[18px] border border-dashed text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-[#881337] bg-[#220e1a] ring-2 ring-[#881337]/40'
                  : 'border-[#381a30] hover:border-[#881337]/60 bg-[#160e1b]/70 hover:bg-[#1a1120]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp, image/gif, image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="flex items-center gap-2 text-[#f1edf0] text-xs font-medium">
                {isProcessingImage ? (
                  <span className="text-[#c08497] animate-pulse">Processing portrait...</span>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4 text-[#c08497]" />
                    <span>{avatarImage ? 'Click or drop to replace portrait' : 'Upload companion portrait'}</span>
                  </>
                )}
              </div>
              <p className="text-[10px] text-[#806f7b] mt-1">
                PNG, JPG, or WebP. Auto-centered & cropped to elegant rounded frame.
              </p>
            </div>
          </div>
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <label htmlFor="character-name-input" className="block text-[11px] font-medium tracking-wider uppercase text-[#c08497]/90">
            Companion Name <span className="text-rose-400">*</span>
          </label>
          <input
            id="character-name-input"
            type="text"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Lord Cassian, Morrigan, Julian"
            className="w-full px-4 py-3 rounded-[18px] bg-[#140e19] border border-[#2e1728] text-sm text-[#f1edf0] placeholder-[#806f7b] focus:outline-none focus:border-[#881337] focus:ring-1 focus:ring-[#881337]/50 transition-all font-sans"
          />
        </div>

        {/* Avatar Color Palette */}
        <div className="space-y-2">
          <label className="block text-[11px] font-medium tracking-wider uppercase text-[#c08497]/90">
            Aura Accent Color
          </label>
          <div className="flex items-center gap-2.5 overflow-x-auto py-1">
            {AVATAR_COLOR_PALETTES.map((palette) => (
              <button
                key={palette.id}
                type="button"
                onClick={() => setAvatarColor(palette.id)}
                className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center transition-all ${palette.bg} ${
                  avatarColor === palette.id ? 'ring-2 ring-[#c08497] ring-offset-2 ring-offset-[#070508] scale-110' : 'opacity-60 hover:opacity-100'
                }`}
                title={palette.name}
              >
                {avatarColor === palette.id && <Check className="w-4 h-4 text-white" />}
              </button>
            ))}
          </div>
        </div>

        {/* Personality */}
        <div className="space-y-1.5">
          <label htmlFor="character-personality-input" className="block text-[11px] font-medium tracking-wider uppercase text-[#c08497]/90">
            Personality & Disposition <span className="text-rose-400">*</span>
          </label>
          <textarea
            id="character-personality-input"
            required
            rows={2}
            value={personality}
            onChange={(e) => {
              setPersonality(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Reserved, fiercely protective, refined, harboring an ancient oath"
            className="w-full px-4 py-3 rounded-[18px] bg-[#140e19] border border-[#2e1728] text-sm text-[#f1edf0] placeholder-[#806f7b] focus:outline-none focus:border-[#881337] focus:ring-1 focus:ring-[#881337]/50 transition-all resize-none"
          />
        </div>

        {/* Background & Lore */}
        <div className="space-y-1.5">
          <label htmlFor="character-background-input" className="block text-[11px] font-medium tracking-wider uppercase text-[#c08497]/90">
            Background & Lore
          </label>
          <textarea
            id="character-background-input"
            rows={3}
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            placeholder="e.g. Heir to an ancient secluded estate amidst velvet fog. Carries burdens of nobility and speaks with quiet reverence..."
            className="w-full px-4 py-3 rounded-[18px] bg-[#140e19] border border-[#2e1728] text-sm text-[#f1edf0] placeholder-[#806f7b] focus:outline-none focus:border-[#881337] focus:ring-1 focus:ring-[#881337]/50 transition-all resize-none"
          />
        </div>

        {/* Speaking Style */}
        <div className="space-y-1.5">
          <label htmlFor="character-style-input" className="block text-[11px] font-medium tracking-wider uppercase text-[#c08497]/90">
            Speaking Style & Mannerisms
          </label>
          <textarea
            id="character-style-input"
            rows={2}
            value={speakingStyle}
            onChange={(e) => setSpeakingStyle(e.target.value)}
            placeholder="e.g. Gentle, measured cadence, poetic and deeply attentive, uses *actions in asterisks*"
            className="w-full px-4 py-3 rounded-[18px] bg-[#140e19] border border-[#2e1728] text-sm text-[#f1edf0] placeholder-[#806f7b] focus:outline-none focus:border-[#881337] focus:ring-1 focus:ring-[#881337]/50 transition-all resize-none"
          />
        </div>

        {/* Greeting Message */}
        <div className="space-y-1.5">
          <label htmlFor="character-greeting-input" className="block text-[11px] font-medium tracking-wider uppercase text-[#c08497]/90">
            Initial Greeting Message <span className="text-rose-400">*</span>
          </label>
          <textarea
            id="character-greeting-input"
            required
            rows={3}
            value={greeting}
            onChange={(e) => {
              setGreeting(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. *pauses by the gothic library window as rain taps on the glass* You should not wander these quiet halls alone..."
            className="w-full px-4 py-3 rounded-[18px] bg-[#140e19] border border-[#2e1728] text-sm text-[#f1edf0] placeholder-[#806f7b] focus:outline-none focus:border-[#881337] focus:ring-1 focus:ring-[#881337]/50 transition-all resize-none font-serif italic"
          />
          <p className="text-[11px] text-[#806f7b] font-serif italic">
            This will be the first message the companion whispers when correspondence opens.
          </p>
        </div>

        {/* Buttons */}
        <div className="pt-2 pb-8 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 text-xs font-semibold text-[#a895a0] hover:text-[#fdfcfd] rounded-[14px] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-[#881337] via-[#75112e] to-[#550b1e] hover:from-[#9f1239] rounded-[16px] border border-[#c08497]/30 shadow-[0_2px_14px_rgba(136,19,55,0.4)] transition-all active:scale-95"
          >
            {initialCharacter ? 'Save Changes' : 'Awaken Companion'}
          </button>
        </div>
      </form>
    </div>
  );
};
