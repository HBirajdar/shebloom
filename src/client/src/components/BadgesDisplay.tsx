import { useState, useEffect } from 'react';
import { api } from '../services/api';

interface Badge {
  badge: string;
  name: string;
  earned: boolean;
  earnedAt?: string;
  hint?: string;
}

const BADGE_ICONS: Record<string, string> = {
  first_cycle: '🌸',
  streak_7: '🔥',
  streak_30: '💪',
  community_contributor: '💬',
  wellness_warrior: '🧘',
  dosha_explorer: '🔮',
  social_butterfly: '🦋',
  early_adopter: '⭐',
  mood_tracker: '😊',
  hydration_hero: '💧',
};

export default function BadgesDisplay() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  useEffect(() => {
    fetchBadges();
  }, []);

  const fetchBadges = async () => {
    try {
      const res = await api.get('/referrals/badges/all');
      setBadges(res.data.data?.badges || res.data.badges || []);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  };

  const earnedCount = badges.filter((b) => b.earned).length;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-rose-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🏆</span>
          <h3 className="font-semibold text-gray-700">Badges</h3>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className="w-12 h-12 rounded-full bg-gray-100 animate-pulse" />
              <div className="w-10 h-2 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-rose-100 p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏆</span>
            <h3 className="font-semibold text-gray-700">Badges</h3>
          </div>
          <span className="text-xs font-semibold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full">
            {earnedCount}/{badges.length} earned
          </span>
        </div>

        {/* Badge Grid */}
        <div className="grid grid-cols-5 gap-3">
          {badges.map((badge) => {
            const icon = BADGE_ICONS[badge.badge] || '🏅';
            return (
              <button
                key={badge.badge}
                onClick={() => setSelectedBadge(badge)}
                className="flex flex-col items-center gap-1.5 group transition-transform active:scale-95"
              >
                <div
                  className={`relative w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all duration-200 ${
                    badge.earned
                      ? 'bg-gradient-to-br from-amber-100 to-yellow-200 shadow-[0_0_12px_rgba(251,191,36,0.4)] group-hover:shadow-[0_0_18px_rgba(251,191,36,0.6)]'
                      : 'bg-gray-100 grayscale opacity-50 group-hover:opacity-70'
                  }`}
                >
                  <span className={badge.earned ? '' : 'grayscale'}>{icon}</span>
                  {badge.earned && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
                <span
                  className={`text-[10px] leading-tight text-center font-medium line-clamp-2 ${
                    badge.earned ? 'text-gray-700' : 'text-gray-400'
                  }`}
                >
                  {badge.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
          onClick={() => setSelectedBadge(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-[320px] text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-3 ${
                selectedBadge.earned
                  ? 'bg-gradient-to-br from-amber-100 to-yellow-200 shadow-[0_0_20px_rgba(251,191,36,0.4)]'
                  : 'bg-gray-100'
              }`}
            >
              <span className={selectedBadge.earned ? '' : 'grayscale opacity-50'}>
                {BADGE_ICONS[selectedBadge.badge] || '🏅'}
              </span>
            </div>

            <h4 className="font-bold text-gray-800 text-lg mb-1">{selectedBadge.name}</h4>

            {selectedBadge.earned ? (
              <div>
                <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full mb-2">
                  Earned!
                </span>
                {selectedBadge.earnedAt && (
                  <p className="text-gray-400 text-xs">
                    Earned on {new Date(selectedBadge.earnedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <span className="inline-block bg-gray-100 text-gray-500 text-xs font-semibold px-3 py-1 rounded-full mb-2">
                  Locked
                </span>
                {selectedBadge.hint && (
                  <p className="text-gray-500 text-xs mt-1">{selectedBadge.hint}</p>
                )}
              </div>
            )}

            <button
              onClick={() => setSelectedBadge(null)}
              className="mt-4 px-6 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full text-sm font-semibold hover:from-rose-600 hover:to-pink-600 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
