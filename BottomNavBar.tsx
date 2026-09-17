import React from 'react';
import { MessageSquare, PlusCircle, Settings } from 'lucide-react';
import { MainTab } from '../types';

interface BottomNavBarProps {
  activeTab: MainTab;
  onSelectTab: (tab: MainTab) => void;
  unreadCount?: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onSelectTab,
  unreadCount,
}) => {
  const tabs = [
    {
      id: 'chats' as MainTab,
      label: 'Chats',
      icon: MessageSquare,
      badge: unreadCount && unreadCount > 0 ? unreadCount : null,
    },
    {
      id: 'create' as MainTab,
      label: 'Create',
      icon: PlusCircle,
    },
    {
      id: 'settings' as MainTab,
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <nav
      id="mobile-bottom-navigation-bar"
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#0d0a0f]/95 backdrop-blur-xl border-t border-[#23141d]/80 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_28px_rgba(0,0,0,0.6)]"
    >
      <div className="max-w-lg mx-auto px-4 py-1.5 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`bottom-nav-tab-${tab.id}`}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`flex-1 relative flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all duration-200 group active:scale-95 select-none ${
                isActive
                  ? 'text-[#f1edf0]'
                  : 'text-[#9c8c97] hover:text-[#d4c5cf]'
              }`}
            >
              {/* Icon Container with subtle active pill glow */}
              <div
                className={`relative flex items-center justify-center w-10 h-7 rounded-full transition-all duration-200 ${
                  isActive
                    ? 'bg-rose-950/60 text-rose-200 ring-1 ring-rose-800/60 shadow-[0_0_12px_rgba(159,18,57,0.3)]'
                    : 'group-hover:bg-[#1b121a] text-[#9c8c97]'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-105' : ''}`} />

                {/* Badge if present */}
                {tab.badge && (
                  <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#881337] text-white text-[10px] font-bold flex items-center justify-center shadow-[0_0_8px_rgba(136,19,55,0.6)]">
                    {tab.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[11px] mt-1 font-medium tracking-tight transition-colors duration-200 ${
                  isActive ? 'text-[#e2cbd2] font-semibold' : 'text-[#9c8c97] group-hover:text-[#cfc0ca]'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
