
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { cycleAPI } from '../services/api';

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function fmtDate(d: string) {
  const dt = new Date(d);
  return `${MONTHS_SHORT[dt.getMonth()]} ${dt.getDate()}`;
}

function fmtFullDate(d: string) {
  const dt = new Date(d);
  return `${MONTHS_SHORT[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
}

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export default function CycleHistoryPage() {
  const nav = useNavigate();
  const [cycles, setCycles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cycleAPI.list()
      .then(r => {
        const data = r.data?.data || r.data || [];
        setCycles(Array.isArray(data) ? data : []);
      })
      .catch(() => toast.error('Failed to load cycle history'))
      .finally(() => setLoading(false));
  }, []);

  // Sort newest first
  const sorted = [...cycles].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  // Stats
  const totalCycles = sorted.length;
  const avgCycleLength = totalCycles > 0
    ? Math.round(sorted.reduce((s, c) => s + (c.cycleLength || 28), 0) / totalCycles)
    : 0;
  const avgPeriodLength = totalCycles > 0
    ? Math.round(sorted.reduce((s, c) => s + (c.periodLength || 5), 0) / totalCycles)
    : 0;

  // Longest streak: consecutive months tracked
  const longestStreak = (() => {
    if (sorted.length === 0) return 0;
    const byDate = [...sorted].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    let maxStreak = 1, cur = 1;
    for (let i = 1; i < byDate.length; i++) {
      const prev = new Date(byDate[i - 1].startDate);
      const curr = new Date(byDate[i].startDate);
      const diffMonths = (curr.getFullYear() - prev.getFullYear()) * 12 + (curr.getMonth() - prev.getMonth());
      if (diffMonths === 1) { cur++; maxStreak = Math.max(maxStreak, cur); }
      else if (diffMonths > 1) cur = 1;
    }
    return maxStreak;
  })();

  // Last 6 cycles for chart (oldest to newest)
  const chartCycles = [...sorted].reverse().slice(-6);
  const maxBarLen = 45; // max cycle length for bar scaling

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
            <h1 className="text-base font-extrabold text-gray-900">Cycle History</h1>
            <p className="text-[9px] text-gray-400">Your period & cycle records</p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-4">

        {loading ? (
          <div className="bg-white rounded-3xl shadow-lg p-8 text-center">
            <div className="w-10 h-10 mx-auto border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
            <p className="text-xs text-gray-400 mt-3">Loading cycle history...</p>
          </div>
        ) : sorted.length === 0 ? (
          /* Empty state */
          <div className="bg-white rounded-3xl shadow-lg p-8 text-center">
            <span className="text-5xl block mb-3">🩸</span>
            <h2 className="text-base font-extrabold text-gray-900 mb-1">No cycles logged yet</h2>
            <p className="text-xs text-gray-500 mb-4">Log your first period in the Tracker</p>
            <button onClick={() => nav('/tracker')}
              className="px-6 py-3 rounded-2xl text-white font-bold text-sm bg-gradient-to-r from-rose-500 to-pink-500 active:scale-95 transition-transform">
              Go to Tracker →
            </button>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="bg-white rounded-3xl shadow-lg p-4">
              <h3 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-3 text-center">Summary</h3>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Total Cycles', value: totalCycles, emoji: '📊' },
                  { label: 'Avg Cycle', value: avgCycleLength + 'd', emoji: '🔄' },
                  { label: 'Avg Period', value: avgPeriodLength + 'd', emoji: '🩸' },
                  { label: 'Streak', value: longestStreak + 'mo', emoji: '🔥' },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <span className="text-lg block">{s.emoji}</span>
                    <p className="text-base font-extrabold text-gray-900">{s.value}</p>
                    <p className="text-[8px] text-gray-400 font-bold">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Cycle Length Chart */}
            {chartCycles.length > 1 && (
              <div className="bg-white rounded-3xl shadow-lg p-4">
                <h3 className="text-xs font-extrabold text-gray-800 mb-3">Cycle Length Trend</h3>
                <svg viewBox={`0 0 300 ${chartCycles.length * 40 + 20}`} className="w-full">
                  {/* Average line */}
                  <line
                    x1={avgCycleLength / maxBarLen * 240 + 50}
                    y1="0"
                    x2={avgCycleLength / maxBarLen * 240 + 50}
                    y2={chartCycles.length * 40 + 10}
                    stroke="#F9A8D4"
                    strokeWidth="1"
                    strokeDasharray="4,3"
                  />
                  <text
                    x={avgCycleLength / maxBarLen * 240 + 53}
                    y="10"
                    fill="#EC4899"
                    fontSize="8"
                    fontWeight="bold"
                  >
                    avg {avgCycleLength}d
                  </text>
                  {chartCycles.map((c, i) => {
                    const len = c.cycleLength || 28;
                    const barWidth = (len / maxBarLen) * 240;
                    const y = i * 40 + 20;
                    const dt = new Date(c.startDate);
                    const label = `${MONTHS_SHORT[dt.getMonth()]}`;
                    return (
                      <g key={c.id || i}>
                        <text x="0" y={y + 14} fill="#6B7280" fontSize="9" fontWeight="600">{label}</text>
                        <defs>
                          <linearGradient id={`bar-${i}`} x1="0%" y1="0%" x2="100%">
                            <stop offset="0%" stopColor="#F43F5E" />
                            <stop offset="100%" stopColor="#EC4899" />
                          </linearGradient>
                        </defs>
                        <rect x="50" y={y} width={barWidth} height="20" rx="10" fill={`url(#bar-${i})`} opacity="0.85" />
                        <text x={barWidth + 55} y={y + 14} fill="#6B7280" fontSize="9" fontWeight="bold">{len}d</text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}

            {/* Cycle List */}
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold text-gray-800 px-1">All Cycles</h3>
              {sorted.map((cycle, idx) => {
                const start = new Date(cycle.startDate);
                const periodLen = cycle.periodLength || 5;
                const cycleLen = cycle.cycleLength || 28;
                const endDate = cycle.endDate
                  ? new Date(cycle.endDate)
                  : new Date(start.getTime() + (periodLen - 1) * 86400000);
                const progressPct = Math.min(100, (cycleLen / 35) * 100);

                return (
                  <div key={cycle.id || idx} className="bg-white rounded-3xl shadow-lg p-4">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🩸</span>
                        <span className="text-xs font-extrabold text-gray-900">
                          {fmtDate(cycle.startDate)} – {fmtDate(endDate.toISOString())}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-500">{periodLen} days period</span>
                        {cycle.isPredicted ? (
                          <span className="text-[9px] font-bold bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-200">
                            📅 Predicted
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-200">
                            ✓ Logged
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-gray-500">Cycle length: {cycleLen} days</span>
                      <span className="text-[10px] text-gray-400">{fmtFullDate(cycle.startDate)}</span>
                    </div>
                    {cycle.notes && (
                      <p className="text-[10px] text-gray-500 mb-2 italic">{cycle.notes}</p>
                    )}
                    {/* Progress bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-rose-400 to-pink-500 transition-all"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-gray-400 font-bold">{cycleLen}/35</span>
                    </div>
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
