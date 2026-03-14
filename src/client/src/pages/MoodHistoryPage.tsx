// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { moodAPI } from '../services/api';

const MOOD_COLORS = { GREAT: '#10B981', GOOD: '#34D399', OKAY: '#FBBF24', LOW: '#F97316', BAD: '#EF4444' };
const MOOD_EMOJIS = { GREAT: '🤩', GOOD: '😊', OKAY: '😐', LOW: '😔', BAD: '😭' };
const MOOD_LABELS = { GREAT: 'Great', GOOD: 'Good', OKAY: 'Okay', LOW: 'Low', BAD: 'Bad' };
const MOOD_ORDER = ['GREAT', 'GOOD', 'OKAY', 'LOW', 'BAD'];
const DAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAYS_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDate(d: string) {
  const dt = new Date(d);
  return `${MONTHS_SHORT[dt.getMonth()]} ${dt.getDate()}, ${DAYS_FULL[dt.getDay()]}`;
}

export default function MoodHistoryPage() {
  const nav = useNavigate();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<7 | 30 | 90>(30);

  useEffect(() => {
    setLoading(true);
    moodAPI.history(period)
      .then(r => {
        const data = r.data?.data || r.data || [];
        setEntries(Array.isArray(data) ? data : []);
      })
      .catch(() => toast.error('Failed to load mood history'))
      .finally(() => setLoading(false));
  }, [period]);

  // Sort newest first
  const sorted = [...entries].sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());

  // Mood distribution
  const distribution = MOOD_ORDER.map(key => {
    const count = sorted.filter(e => (e.mood || e.value || '').toUpperCase() === key).length;
    return { key, count };
  });
  const maxCount = Math.max(1, ...distribution.map(d => d.count));

  // Last 7 days timeline
  const last7 = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    const dateStr = d.toISOString().slice(0, 10);
    const entry = sorted.find(e => {
      const eDate = new Date(e.createdAt || e.date);
      return eDate.toISOString().slice(0, 10) === dateStr;
    });
    return {
      day: DAYS_SHORT[d.getDay()],
      mood: entry ? (entry.mood || entry.value || '').toUpperCase() : null,
      date: d,
    };
  });

  return (
    <div className="min-h-screen pb-28 bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-white/80 border-b border-rose-100">
        <div className="px-5 py-3 flex items-center gap-3">
          <button onClick={() => nav(-1)}
            className="w-9 h-9 rounded-2xl bg-white/80 flex items-center justify-center text-sm active:scale-95 transition-all shadow-sm">
            ←
          </button>
          <div className="flex-1">
            <h1 className="text-base font-extrabold text-gray-900">Mood History</h1>
            <p className="text-[9px] text-gray-400">Track your emotional patterns</p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-4">

        {/* Period toggle */}
        <div className="bg-white rounded-3xl shadow-lg p-3">
          <div className="flex gap-2">
            {([7, 30, 90] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={'flex-1 py-2.5 rounded-2xl text-xs font-extrabold transition-all active:scale-95 ' +
                  (period === p
                    ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md'
                    : 'bg-gray-50 text-gray-500')}>
                {p}d
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl shadow-lg p-8 text-center">
            <div className="w-10 h-10 mx-auto border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
            <p className="text-xs text-gray-400 mt-3">Loading mood history...</p>
          </div>
        ) : sorted.length === 0 ? (
          /* Empty state */
          <div className="bg-white rounded-3xl shadow-lg p-8 text-center">
            <span className="text-5xl block mb-3">😊</span>
            <h2 className="text-base font-extrabold text-gray-900 mb-1">No mood logs yet</h2>
            <p className="text-xs text-gray-500 mb-4">Start logging from the Dashboard.</p>
            <button onClick={() => nav('/dashboard')}
              className="px-6 py-3 rounded-2xl text-white font-bold text-sm bg-gradient-to-r from-rose-500 to-pink-500 active:scale-95 transition-transform">
              Go to Dashboard →
            </button>
          </div>
        ) : (
          <>
            {/* Mood Distribution */}
            <div className="bg-white rounded-3xl shadow-lg p-4">
              <h3 className="text-xs font-extrabold text-gray-800 mb-3">Mood Distribution</h3>
              <div className="space-y-2.5">
                {distribution.map(d => (
                  <div key={d.key} className="flex items-center gap-2">
                    <span className="text-lg w-7 text-center">{MOOD_EMOJIS[d.key]}</span>
                    <span className="text-[10px] font-bold text-gray-600 w-10">{MOOD_LABELS[d.key]}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-3">
                      <div
                        className="h-3 rounded-full transition-all duration-500"
                        style={{
                          width: `${(d.count / maxCount) * 100}%`,
                          backgroundColor: MOOD_COLORS[d.key],
                          minWidth: d.count > 0 ? '8px' : '0',
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-extrabold text-gray-500 w-12 text-right">
                      {d.count} time{d.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 7-Day Timeline */}
            <div className="bg-white rounded-3xl shadow-lg p-4">
              <h3 className="text-xs font-extrabold text-gray-800 mb-3">Last 7 Days</h3>
              <div className="flex justify-between">
                {last7.map((d, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all"
                      style={{
                        borderColor: d.mood ? MOOD_COLORS[d.mood] : '#E5E7EB',
                        backgroundColor: d.mood ? MOOD_COLORS[d.mood] + '15' : '#F9FAFB',
                      }}
                    >
                      {d.mood ? MOOD_EMOJIS[d.mood] : '?'}
                    </div>
                    <span className="text-[9px] font-bold text-gray-400">{d.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mood Log List */}
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold text-gray-800 px-1">All Entries</h3>
              {sorted.map((entry, idx) => {
                const moodKey = (entry.mood || entry.value || 'OKAY').toUpperCase();
                const color = MOOD_COLORS[moodKey] || '#FBBF24';
                const emoji = MOOD_EMOJIS[moodKey] || '😐';
                const label = MOOD_LABELS[moodKey] || 'Okay';
                const date = entry.createdAt || entry.date;

                return (
                  <div
                    key={entry.id || entry.date || idx}
                    className="bg-white rounded-3xl shadow-lg p-4 border-l-4 transition-all"
                    style={{ borderLeftColor: color, backgroundColor: color + '08' }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{emoji}</span>
                        <span className="text-sm font-extrabold text-gray-900">{label}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-bold">{fmtDate(date)}</span>
                    </div>
                    {entry.notes && (
                      <p className="text-xs text-gray-600 mt-1">Notes: {entry.notes}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
