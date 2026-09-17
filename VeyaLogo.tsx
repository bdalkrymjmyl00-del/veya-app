import React from 'react';

interface VeyaLogoProps {
  className?: string;
  size?: number;
}

export const VeyaLogo: React.FC<VeyaLogoProps> = ({ className = '', size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none transition-transform duration-300 ease-out hover:scale-105 ${className}`}
      aria-label="Veya logo"
    >
      <defs>
        {/* Deep romantic gradient: soft silver-mauve to rich dark burgundy */}
        <linearGradient id="veyaFlowGradient" x1="6" y1="6" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f3edf1" />
          <stop offset="25%" stopColor="#d8a4b8" />
          <stop offset="55%" stopColor="#9f1239" />
          <stop offset="85%" stopColor="#721028" />
          <stop offset="100%" stopColor="#430816" />
        </linearGradient>

        {/* Soft, restrained velvet ambient glow */}
        <radialGradient id="veyaAtmosphericGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#881337" stopOpacity="0.32" />
          <stop offset="60%" stopColor="#881337" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#881337" stopOpacity="0" />
        </radialGradient>

        {/* Subtle silver edge highlight */}
        <linearGradient id="veyaSilverEdge" x1="18" y1="7" x2="18" y2="29" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="40%" stopColor="#e2cbd2" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#c08497" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {/* Gentle velvet atmospheric glow */}
      <circle cx="18" cy="18" r="17" fill="url(#veyaAtmosphericGlow)" />

      {/* Flowing, curved, refined modern V shape */}
      <path
        d="M7.5 9.5 C10.2 15.8, 14.2 24.8, 18 28.5 C21.8 24.8, 25.8 15.8, 28.5 9.5 C25.8 13.2, 21.2 17, 18 17 C14.8 17, 10.2 13.2, 7.5 9.5 Z"
        fill="url(#veyaFlowGradient)"
      />

      {/* Soft silver delicate highlight stroke along outer contour */}
      <path
        d="M8.2 10.2 C10.8 16.2, 14.6 24.8, 18 28.2 C21.4 24.8, 25.2 16.2, 27.8 10.2"
        stroke="url(#veyaSilverEdge)"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Inner flowing contour for depth and elegance */}
      <path
        d="M10.5 12 C13 14.6, 15.5 16, 18 16 C20.5 16, 23 14.6, 25.5 12"
        stroke="#ffffff"
        strokeWidth="0.75"
        strokeOpacity="0.45"
        strokeLinecap="round"
      />

      {/* Subtle silver center point */}
      <circle cx="18" cy="17.2" r="1.2" fill="#ffffff" fillOpacity="0.85" />
    </svg>
  );
};
