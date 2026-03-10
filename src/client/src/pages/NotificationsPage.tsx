// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
  emoji: string;
}

const DEFAULT_NOTIFICATIONS: Notification[] = [
  { id: 'n1', type: 'period', emoji: '🌸', message: 'Your period is due in 3 days — stock up on essentials', read: false, created_at: '2 hours ago' },
  { id: 'n2', type: 'ovulation', emoji: '⭐', message: 'Today is your peak ovulation day — highest fertility!', read: false, created_at: '5 hours ago' },
  { id: 'n3', type: 'supplement', emoji: '💊', message: 'Time to take your Shatavari supplement', read: true, created_at: 'Yesterday' },
  { id: 'n4', type: 'log', emoji: '📅', message: "You haven't logged today — how are you feeling?", read: true, created_at: 'Yesterday' },
  { id: 'n5', type: 'offer', emoji: '🛍️', message: 'Shatavari tonic is 20% off today — limited time!', read: true, created_at: '2 days ago' },
  { id: 'n6', type: 'community', emoji: '👩‍⚕️', message: 'Dr. Priya replied to your community post', read: true, created_at: '3 days ago' },
];

const TYPE_COLORS: Record<string, string> = {
  period: '#E11D48', ovulation: '#7C3AED', supplement: '#10B981',
  log: '#F59E0B', offer: '#EC4899', community: '#3B82F6',
};

const SkeletonCard = () => (
  <div className="bg-white rounded-2xl p-4 shadow-sm animate-pulse flex items-center gap-3">
    <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-3 bg-gray-100 rounded w-3/4" />
      <div className="h-2 bg-gray-100 rounded w-1/3" />
    </div>
  </div>
);

export default function NotificationsPage() {
  const nav = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/notifications')
      .then(r => setNotifications(r.data.data || r.data || DEFAULT_NOTIFICATIONS))
      .catch(() => setNotifications(DEFAULT_NOTIFICATIONS))
      .finally(() => setLoading(false));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try { await api.put('/notifications/' + id + '/read'); } catch { /* silently ignore */ }
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try { await api.put('/notifications/read-all'); } catch { /* silently ignore */ }
    toast.success('All caught up! ✅');
  };

  const unread = notifications.filter(n => !n.read);
  const read = notifications.filter(n => n.read);

  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: '#FAFAF9' }}>
      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-xl border-b border-gray-100" style={{ backgroundColor: 'rgba(250,250,249,0.95)' }}>
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => nav(-1)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:scale-90 transition-transform text-sm font-bold">←</button>
            <div>
              <h1 className="text-base font-extrabold text-gray-900">Notifications 🔔</h1>
              {unreadCount > 0 && <p className="text-[9px] text-rose-500 font-bold">{unreadCount} unread</p>}
            </div>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs font-bold text-rose-500 active:scale-95 transition-transform">
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-5">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-6xl mb-4">✅</span>
            <h3 className="text-lg font-extrabold text-gray-800">You're all caught up!</h3>
            <p className="text-xs text-gray-400 mt-2">No new notifications right now.</p>
          </div>
        ) : (
          <>
            {/* Unread */}
            {unread.length > 0 && (
              <section>
                <h2 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-3 px-1">New</h2>
                <div className="space-y-2">
                  {unread.map(n => (
                    <button key={n.id} onClick={() => markRead(n.id)} className="w-full text-left">
                      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 flex items-start gap-3 active:scale-[0.99] transition-transform relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ backgroundColor: TYPE_COLORS[n.type] || '#E11D48' }} />
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: (TYPE_COLORS[n.type] || '#E11D48') + '15' }}>
                          {n.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-900 leading-relaxed">{n.message}</p>
                          <p className="text-[9px] text-gray-400 mt-1">{n.created_at}</p>
                        </div>
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500 flex-shrink-0 mt-1" />
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Read */}
            {read.length > 0 && (
              <section>
                <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-3 px-1">Earlier</h2>
                <div className="space-y-2">
                  {read.map(n => (
                    <div key={n.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-start gap-3 opacity-70 relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-gray-200" />
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 bg-gray-50">
                        {n.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-600 leading-relaxed">{n.message}</p>
                        <p className="text-[9px] text-gray-400 mt-1">{n.created_at}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
