import React, { useState } from 'react';
import { getAvatarColorClass } from '../storage';

interface CharacterAvatarProps {
  name: string;
  avatarColor?: string;
  avatarImage?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'card' | 'xl' | '2xl';
  shape?: 'circle' | 'curved';
  className?: string;
}

const SIZE_MAP = {
  xs: 'w-7 h-7 text-xs',
  sm: 'w-9 h-9 text-xs',
  md: 'w-12 h-12 text-base',
  lg: 'w-16 h-16 text-xl',
  card: 'w-20 h-20 sm:w-[84px] sm:h-[84px] text-2xl',
  xl: 'w-24 h-24 text-3xl',
  '2xl': 'w-28 h-28 text-4xl',
};

export const CharacterAvatar: React.FC<CharacterAvatarProps> = ({
  name,
  avatarColor = 'rose',
  avatarImage,
  size = 'md',
  shape = 'circle',
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);
  const color = getAvatarColorClass(avatarColor);
  const sizeClasses = SIZE_MAP[size] || SIZE_MAP.md;
  const radiusClass = shape === 'curved' ? 'rounded-[22px]' : 'rounded-full';

  const initials = name
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');

  const showImage = Boolean(avatarImage && !hasError);

  return (
    <div
      className={`relative ${radiusClass} shrink-0 flex items-center justify-center overflow-hidden border border-[#521627]/80 ring-1 ring-[#f1edf0]/25 shadow-[0_4px_20px_rgba(0,0,0,0.5),0_0_12px_rgba(136,19,55,0.22)] ${sizeClasses} ${
        showImage ? 'bg-[#120d16]' : color.bg
      } ${className}`}
    >
      {showImage ? (
        <img
          src={avatarImage}
          alt={name}
          className={`w-full h-full object-cover ${radiusClass}`}
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
        />
      ) : (
        <span className="font-['Cormorant_Garamond',serif] font-bold text-white tracking-wider select-none">
          {initials || name.charAt(0).toUpperCase() || '?'}
        </span>
      )}
    </div>
  );
};
