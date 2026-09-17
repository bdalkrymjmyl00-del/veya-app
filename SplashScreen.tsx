import React, { useEffect, useState } from 'react';
import { VeyaLogo } from './VeyaLogo';

interface SplashScreenProps {
  onComplete: () => void;
  autoDismissMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete, autoDismissMs = 2200 }) => {
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadingOut(true);
      setTimeout(onComplete, 500);
    }, autoDismissMs);

    return () => clearTimeout(timer);
  }, [onComplete, autoDismissMs]);

  const handleSkip = () => {
    setFadingOut(true);
    setTimeout(onComplete, 250);
  };

  return (
    <div
      id="veya-splash-screen"
      onClick={handleSkip}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070508] cursor-pointer select-none transition-opacity duration-500 ease-out ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      aria-label="Veya Splash Screen"
    >
      {/* Subtle atmospheric texture and deep burgundy radial glow */}
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(136,19,55,0.22),rgba(88,12,31,0.08)_45%,transparent_70%)] pointer-events-none"
        aria-hidden="true"
      />

      {/* Subtle silver hairline highlight at the top */}
      <div
        className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#c08497]/30 to-transparent pointer-events-none"
        aria-hidden="true"
      />

      {/* Centered Minimal Brand Mark */}
      <div className="relative flex flex-col items-center justify-center space-y-6 animate-in fade-in zoom-in-95 duration-700">
        {/* Glowing halo behind logo */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-28 h-28 rounded-full bg-[#881337]/25 blur-2xl" />
          <div className="w-20 h-20 rounded-[28px] bg-gradient-to-b from-[#19101d] to-[#100b14] border border-[#3e192c] shadow-[0_8px_32px_rgba(0,0,0,0.8),0_0_24px_rgba(136,19,55,0.3)] flex items-center justify-center">
            <VeyaLogo size={52} />
          </div>
        </div>

        {/* Minimal atmospheric indicator */}
        <div className="flex items-center gap-1.5 pt-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[#c08497]/40 animate-pulse" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#c08497]/70 animate-pulse" style={{ animationDelay: '200ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-[#c08497]/40 animate-pulse" style={{ animationDelay: '400ms' }} />
        </div>
      </div>

      {/* Discreet bottom tap hint */}
      <div className="absolute bottom-10 inset-x-0 text-center pointer-events-none">
        <p className="text-[11px] font-serif italic text-[#c08497]/60 tracking-wider">
          Tap anywhere to continue
        </p>
      </div>
    </div>
  );
};
