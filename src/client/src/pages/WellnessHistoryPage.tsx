// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { wellnessAPI } from '../services/api';

/* ═══════════════════════════════════════════════════════
   VEDACLUE WELLNESS HISTORY — Daily / Weekly / Monthly
   ═══════════════════════════════════════════════════════ */

interface DayRecord {
  date: string;
  dayLabel: string;
  water: { glasses: number; target: number; pct: number };
  sleep: { hours: number; logged: boolean };
  exercise: { done: boolean };
  mood: { value: string; emoji: string } | null;
  score: number;
  isToday: boolean;
}

const PERIODS = [
  { label: '7 Days', value: 7 },
  { label: '30 Days', value: 30 },
  { label: '90 Days', value: 90 },
];

const SHORT_DAY = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const scoreColor = (score: number) => {
  if (score >= 75) return '#10B981';
  if (score >= 50) return '#F59E0B';
  return '#FB7185';
};

const scoreDotClass = (score: number) => {
  if (score >= 75) return 'bg-emerald-400';
  if (score >= 50) return 'bg-amber-400';
  return 'bg-rose-300';
};

const scoreBg = (score: number) => {
  if (score >= 75) return '#D1FAE5';
  if (score >= 50) return '#FEF3C7';
  return '#FFE4E6';
};

// ─── Skeleton Shimmer ─────────────────────────────
const Shimmer = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded-2xl ${className || ''}`} />
);

const LoadingSkeleton = () => (
  <div className="px-5 pt-4 space-y-4">
    <Shimmer className="h-24 w-full" />
    <Shimmer className="h-48 w-full" />
    <Shimmer className="h-20 w-full" />
    <Shimmer className="h-20 w-full" />
    <Shimmer className="h-20 w-full" />
  </div>
);

export default function WellnessHistoryPage() {
  const nav = useNavigate();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<DayRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    wellnessAPI.history(days)
      .then(r => {
        setData(r.data?.data || []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [days]);

  // ─── Computed stats ─────────────────────────────
  const hasData = data.length > 0 && data.some(d => d.score > 0);

  const avgScore = hasData
    ? Math.round(data.reduce((s, d) => s + d.score, 0) / data.length)
    : 0;

  const totalLogs = data.filter(d => d.score > 0).length;

  // Best streak (consecutive days score >= 50, sorted oldest first)
  const sorted = [...data].reverse();
  let bestStreak = 0;
  let currentStreak = 0;
  sorted.forEach(d => {
    if (d.score >= 50) {
      currentStreak++;
      if (currentStreak > bestStreak) bestStreak = currentStreak;
    } else {
      currentStreak = 0;
    }
  });

  // Best day of week
  const dayTotals: Record<string, { sum: number; count: number }> = {};
  data.forEach(d => {
    if (!dayTotals[d.dayLabel]) dayTotals[d.dayLabel] = { sum: 0, count: 0 };
    dayTotals[d.dayLabel].sum += d.score;
    dayTotals[d.dayLabel].count++;
  });
  let bestDay = '—';
  let bestDayAvg = 0;
  Object.entries(dayTotals).forEach(([day, { sum, count }]) => {
    const avg = count > 0 ? sum / count : 0;
    if (avg > bestDayAvg) { bestDayAvg = avg; bestDay = day; }
  });

  // Last 7 days for bar chart (oldest first)
  const last7 = [...data].slice(0, 7).reverse();

  // Calendar grid for 30d/90d
  const buildCalendarWeeks = () => {
    if (data.length === 0) return [];
    const dateMap: Record<string, DayRecord> = {};
    data.forEach(d => { dateMap[d.date] = d; });

    // Find first and last dates
    const allDates = [...data].reverse();
    const firstDate = new Date(allDates[0].date + 'T00:00:00');
    const lastDate = new Date(allDates[allDates.length - 1].date + 'T00:00:00');

    // Align to Monday
    const startOfWeek = new Date(firstDate);
    const dow = startOfWeek.getDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    startOfWeek.setDate(startOfWeek.getDate() + mondayOffset);

    const weeks: (DayRecord | null)[][] = [];
    const cursor = new Date(startOfWeek);

    while (cursor <= lastDate || weeks.length === 0) {
      const week: (DayRecord | null)[] = [];
      for (let i = 0; i < 7; i++) {
        const key = cursor.toISOString().slice(0, 10);
        if (cursor >= firstDate && cursor <= lastDate) {
          week.push(dateMap[key] || null);
        } else {
          week.push(null);
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }
    return weeks;
  };

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen pb-28 bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">

      {/* ─── Sticky Header ─── */}
      <div className="sticky top-0 z-20 backdrop-blur-xl border-b border-rose-100" style={{ backgroundColor: 'rgba(255,241,242,0.85)' }}>
        <div className="px-5 py-3 flex items-center gap-3">
          <button onClick={() => nav('/wellness')} className="w-9 h-9 rounded-2xl bg-white/80 flex items-center justify-center text-sm active:scale-95 transition-all shadow-sm">←</button>
          <h1 className="flex-1 text-base font-extrabold text-gray-900">Wellness History 📊</h1>
        </div>
        {/* Period toggle */}
        <div className="px-5 pb-3 flex gap-2">
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => setDays(p.value)}
              className={'flex-1 py-2 rounded-full text-xs font-extrabold transition-all active:scale-95 ' +
                (days === p.value ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-500')}
              style={days === p.value ? { background: 'linear-gradient(135deg,#E11D48,#EC4899)' } : {}}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Content ─── */}
      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="px-5 pt-16 text-center">
          <p className="text-3xl mb-3">😔</p>
          <p className="text-sm font-bold text-gray-600">Couldn't load history</p>
          <button onClick={() => setDays(days)} className="mt-4 px-6 py-2 rounded-full bg-rose-500 text-white text-xs font-bold active:scale-95 transition-transform">
            Retry
          </button>
        </div>
      ) : !hasData ? (
        /* Empty state */
        <div className="px-5 pt-16 text-center">
          <p className="text-5xl mb-4">📊</p>
          <p className="text-base font-extrabold text-gray-800 mb-2">No wellness data yet</p>
          <p className="text-xs text-gray-500 mb-6">Start logging today to see your history here</p>
          <button onClick={() => nav('/wellness')}
            className="px-6 py-3 rounded-full text-white text-sm font-extrabold active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg,#E11D48,#EC4899)' }}>
            Go to Wellness →
          </button>
        </div>
      ) : (
        <div className="px-5 pt-4 space-y-4">

          {/* ═══ Summary Stats Card ═══ */}
          <div className="bg-white rounded-3xl shadow-lg p-4">
            <h2 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-3">Summary</h2>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Avg Score', value: avgScore, emoji: '📈' },
                { label: 'Best Streak', value: bestStreak, emoji: '🔥' },
                { label: 'Best Day', value: bestDay, emoji: '⭐' },
                { label: 'Total Logs', value: totalLogs, emoji: '📝' },
              ].map(stat => (
                <div key={stat.label} className="text-center">
                  <p className="text-lg mb-0.5">{stat.emoji}</p>
                  <p className="text-base font-extrabold text-gray-900">{stat.value}</p>
                  <p className="text-[8px] text-gray-400 font-bold">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ═══ Weekly Bar Chart (always last 7 days) ═══ */}
          <div className="bg-white rounded-3xl shadow-lg p-4">
            <h2 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-3">Last 7 Days</h2>
            <div className="flex items-end justify-between gap-1.5" style={{ height: '140px' }}>
              {last7.map((d, i) => {
                const barHeight = Math.max(4, (d.score / 100) * 110);
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full">
                    <span className="text-[9px] font-extrabold mb-1" style={{ color: scoreColor(d.score) }}>
                      {d.score > 0 ? d.score : ''}
                    </span>
                    <div
                      className="w-full rounded-t-xl transition-all duration-500"
                      style={{
                        height: `${barHeight}px`,
                        backgroundColor: d.score > 0 ? scoreColor(d.score) : '#E5E7EB',
                        opacity: d.isToday ? 1 : 0.8,
                      }}
                    />
                    <span className={'text-[9px] font-bold mt-1.5 ' + (d.isToday ? 'text-rose-600' : 'text-gray-400')}>
                      {SHORT_DAY[(new Date(d.date + 'T00:00:00').getDay() + 6) % 7]}
                    </span>
                    {d.isToday && <div className="w-1 h-1 rounded-full bg-rose-500 mt-0.5" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ═══ Calendar Grid (30d/90d only) ═══ */}
          {days >= 30 && (() => {
            const weeks = buildCalendarWeeks();
            return (
              <div className="bg-white rounded-3xl shadow-lg p-4">
                <h2 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-3">Calendar Overview</h2>
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                    <div key={d} className="text-center text-[8px] font-bold text-gray-400">{d}</div>
                  ))}
                </div>
                {/* Week rows */}
                <div className="space-y-1">
                  {weeks.map((week, wi) => (
                    <div key={wi} className="grid grid-cols-7 gap-1">
                      {week.map((day, di) => {
                        if (!day) return <div key={di} className="h-9" />;
                        const dayNum = new Date(day.date + 'T00:00:00').getDate();
                        const isToday = day.date === todayStr;
                        return (
                          <div key={di}
                            className={'h-9 flex flex-col items-center justify-center rounded-lg transition-all ' +
                              (isToday ? 'border-2 border-rose-400' : '')}
                            style={{ backgroundColor: day.score > 0 ? scoreBg(day.score) : '#F9FAFB' }}>
                            <span className={'text-[9px] font-bold ' + (isToday ? 'text-rose-600' : 'text-gray-600')}>
                              {dayNum}
                            </span>
                            <div className={'w-1.5 h-1.5 rounded-full mt-0.5 ' +
                              (day.score > 0 ? scoreDotClass(day.score) : 'bg-gray-300')} />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
                {/* Legend */}
                <div className="flex items-center justify-center gap-4 mt-3">
                  {[
                    { label: '< 50', cls: 'bg-rose-300' },
                    { label: '50-74', cls: 'bg-amber-400' },
                    { label: '75+', cls: 'bg-emerald-400' },
                    { label: 'None', cls: 'bg-gray-300' },
                  ].map(l => (
                    <div key={l.label} className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${l.cls}`} />
                      <span className="text-[8px] text-gray-400 font-bold">{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* ═══ Daily Log List ═══ */}
          <div>
            <h2 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-3 px-1">Daily Logs</h2>
            <div className="space-y-3">
              {data.map(d => {
                const hasAny = d.score > 0;
                return (
                  <div key={d.date} className="bg-white rounded-3xl shadow-lg p-4">
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-gray-800">
                          {formatDateLabel(d.date)}
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold">{d.dayLabel}</span>
                        {d.isToday && (
                          <span className="text-[8px] font-bold bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">TODAY</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-extrabold" style={{ color: scoreColor(d.score) }}>
                          {d.score}
                        </span>
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: hasAny ? scoreColor(d.score) : '#D1D5DB' }} />
                      </div>
                    </div>

                    {hasAny ? (
                      <>
                        {/* Metric pills */}
                        <div className="flex flex-wrap gap-2 mb-2.5">
                          <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">
                            💧 {d.water.glasses}/{d.water.target}
                          </span>
                          {d.sleep.logged && (
                            <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-1 rounded-lg">
                              😴 {d.sleep.hours}h
                            </span>
                          )}
                          {d.exercise.done && (
                            <span className="text-[10px] font-bold bg-green-50 text-green-700 px-2 py-1 rounded-lg">
                              🏃 Done
                            </span>
                          )}
                          {d.mood && (
                            <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-1 rounded-lg">
                              {d.mood.emoji} {d.mood.value.charAt(0) + d.mood.value.slice(1).toLowerCase()}
                            </span>
                          )}
                        </div>

                        {/* Progress bar */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all duration-500"
                              style={{ width: `${d.score}%`, backgroundColor: scoreColor(d.score) }}
                            />
                          </div>
                          <span className="text-[9px] font-bold text-gray-400">{d.score}%</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-[10px] text-gray-400 italic">No data logged</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
