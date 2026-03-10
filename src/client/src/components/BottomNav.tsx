import { useNavigate, useLocation } from 'react-router-dom';

const TABS = [
  { id: 'home', path: '/dashboard', emoji: '🏠', label: 'Home' },
  { id: 'shop', path: '/ayurveda', emoji: '🌿', label: 'Shop' },
  { id: 'track', path: '/tracker', emoji: '📅', label: 'Track', center: true },
  { id: 'community', path: '/community', emoji: '💬', label: 'Community' },
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
      <div className="bg-white/95 backdrop-blur-xl border-t border-gray-100 px-2 pb-safe flex items-end justify-around" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
        {TABS.map(tab => {
          const active = isActive(tab.path);
          if (tab.center) {
            return (
              <button
                key={tab.id}
                onClick={() => nav(tab.path)}
                className="flex flex-col items-center -mt-5 active:scale-95 transition-transform"
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg border-4 border-white"
                  style={{ background: 'linear-gradient(135deg, #E11D48, #F43F5E)' }}
                >
                  {tab.emoji}
                </div>
                <span className={`text-[8px] font-bold mt-1 ${active ? 'text-rose-500' : 'text-gray-400'}`}>{tab.label}</span>
              </button>
            );
          }
          return (
            <button
              key={tab.id}
              onClick={() => nav(tab.path)}
              className="flex flex-col items-center py-2 px-3 rounded-xl active:scale-95 transition-transform relative"
            >
              <span className={`text-xl ${active ? '' : 'grayscale opacity-50'}`} style={{ filter: active ? 'none' : undefined }}>
                {tab.emoji}
              </span>
              {active && <span className="text-[9px] font-bold mt-0.5" style={{ color: '#E11D48' }}>{tab.label}</span>}
              {!active && <span className="text-[9px] text-transparent font-bold mt-0.5">{tab.label}</span>}
              {tab.id === 'community' && communityBadge && (
                <span className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
