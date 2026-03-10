// @ts-nocheck
import { useNavigate, useLocation } from 'react-router-dom';

const TABS = [
  { id: 'home', path: '/dashboard', emoji: '🏠', label: 'Home' },
  { id: 'track', path: '/tracker', emoji: '📅', label: 'Tracker' },
  { id: 'wellness', path: '/wellness', emoji: '🌿', label: 'Wellness' },
  { id: 'doctors', path: '/doctors', emoji: '👩\u200D⚕️', label: 'Doctors' },
  { id: 'profile', path: '/profile', emoji: '👤', label: 'Profile' },
];

interface BottomNavProps {
  communityBadge?: boolean;
}

export default function BottomNav({ communityBadge }: BottomNavProps) {
  const nav = useNavigate();
  const { pathname } = useLocation();

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40">
      <div className="bg-white rounded-t-3xl border-t border-rose-100 px-3 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))', height: 70 }}>
        <div className="flex items-center justify-around h-full">
          {TABS.map(tab => {
            const active = isActive(tab.path);
            return (
              <button
                key={tab.id}
                onClick={() => nav(tab.path)}
                className="flex flex-col items-center gap-0.5 active:scale-95 transition-all"
              >
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl transition-all ${active ? 'bg-gradient-to-r from-rose-500 to-pink-500 shadow-md shadow-rose-200' : ''}`}>
                  <span className={active ? 'brightness-0 invert' : 'grayscale opacity-40'} style={{ fontSize: 20 }}>
                    {tab.emoji}
                  </span>
                </div>
                <span className={`font-bold transition-colors ${active ? 'text-rose-500' : 'text-gray-300'}`} style={{ fontSize: 10 }}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
