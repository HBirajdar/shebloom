// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useCycleStore } from '../stores/cycleStore';
import type { UserGoal } from '../stores/cycleStore';
import { cycleAPI, moodAPI, userAPI } from '../services/api';
import BottomNav from '../components/BottomNav';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════
   SHEBLOOM DASHBOARD — Enterprise Grade
   ═══════════════════════════════════════════════════════ */

const moods = [
  { key: 'GREAT', e: '🤩', l: 'Great', c: '#10B981' },
  { key: 'GOOD', e: '😊', l: 'Good', c: '#34D399' },
  { key: 'OKAY', e: '😐', l: 'Okay', c: '#FBBF24' },
  { key: 'LOW', e: '😔', l: 'Low', c: '#F97316' },
  { key: 'BAD', e: '😭', l: 'Bad', c: '#EF4444' },
];

const phaseThemes: Record<string, { color: string; gradient: string; bg: string; emoji: string; name: string; msg: string; hormoneE: string; hormoneP: string }> = {
  menstrual: { color: '#E11D48', gradient: 'linear-gradient(135deg,#BE123C,#E11D48,#F43F5E)', bg: '#FFF1F2', emoji: '🩸', name: 'Period', msg: 'Take it easy today. Your body is working hard.', hormoneE: 'Low', hormoneP: 'Low' },
  follicular: { color: '#059669', gradient: 'linear-gradient(135deg,#047857,#059669,#10B981)', bg: '#ECFDF5', emoji: '🌱', name: 'Follicular', msg: 'Energy rising! Great time for new beginnings.', hormoneE: 'Rising', hormoneP: 'Low' },
  ovulation: { color: '#7C3AED', gradient: 'linear-gradient(135deg,#6D28D9,#7C3AED,#8B5CF6)', bg: '#F5F3FF', emoji: '✨', name: 'Ovulation', msg: "Peak energy & confidence. You're glowing!", hormoneE: 'Peak', hormoneP: 'Rising' },
  luteal: { color: '#D97706', gradient: 'linear-gradient(135deg,#B45309,#D97706,#F59E0B)', bg: '#FFFBEB', emoji: '🍂', name: 'Luteal', msg: 'Winding down. Be gentle with yourself.', hormoneE: 'Declining', hormoneP: 'High' },
};

const phaseTips: Record<string, string[]> = {
  menstrual: ['🌡️ Warm compress relieves cramps', '🥬 Eat iron-rich foods (spinach, dates)', '😴 Extra rest is completely valid', '🫖 Ginger tea helps inflammation'],
  follicular: ['⚡ Best phase for intense workouts', '🚀 Start new projects now', '🥑 Load up on healthy fats', '💃 Your social energy is high'],
  ovulation: ['💜 Peak fertility window — 33% chance', '💧 Check egg-white cervical mucus', '🌸 Libido naturally peaks', '🔥 Try your highest workout intensity'],
  luteal: ['🌰 Magnesium reduces PMS (almonds)', '🍠 Complex carbs stabilize mood', '😴 Body needs extra sleep now', '🚫 Reduce caffeine and salt'],
};

// ─── Animated SVG Cycle Ring ─────────────────────
const CycleHeroRing = ({ day, total, phase, periodLength }: { day: number; total: number; phase: string; periodLength: number }) => {
  const cx = 100, cy = 100, r = 78, sw = 14;
  const theme = phaseThemes[phase] || phaseThemes.follicular;
  const ov = total - 14;
  const fS = Math.max(1, ov - 5), fE = Math.min(total, ov + 1);
  const arcPath = (s: number, e: number) => {
    const sA = ((s - 1) / total) * 360 - 90, eA = (e / total) * 360 - 90;
    const sR = (sA * Math.PI) / 180, eR = (eA * Math.PI) / 180;
    return `M ${cx + r * Math.cos(sR)} ${cy + r * Math.sin(sR)} A ${r} ${r} 0 ${eA - sA > 180 ? 1 : 0} 1 ${cx + r * Math.cos(eR)} ${cy + r * Math.sin(eR)}`;
  };
  const dayA = ((day - 0.5) / total) * 360 - 90;
  const dR = (dayA * Math.PI) / 180;
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <defs>
        <linearGradient id="dg_per" x1="0%" y1="0%" x2="100%"><stop offset="0%" stopColor="#E11D48" /><stop offset="100%" stopColor="#FB7185" /></linearGradient>
        <linearGradient id="dg_fol" x1="0%" y1="0%" x2="100%"><stop offset="0%" stopColor="#059669" /><stop offset="100%" stopColor="#6EE7B7" /></linearGradient>
        <linearGradient id="dg_fer" x1="0%" y1="0%" x2="100%"><stop offset="0%" stopColor="#7C3AED" /><stop offset="100%" stopColor="#C084FC" /></linearGradient>
        <linearGradient id="dg_lut" x1="0%" y1="0%" x2="100%"><stop offset="0%" stopColor="#D97706" /><stop offset="100%" stopColor="#FDE68A" /></linearGradient>
        <filter id="dg_glow"><feGaussianBlur stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F1F5F9" strokeWidth={sw} />
      <path d={arcPath(1, periodLength)} fill="none" stroke="url(#dg_per)" strokeWidth={sw} strokeLinecap="round" />
      {periodLength + 1 < fS && <path d={arcPath(periodLength + 1, fS - 1)} fill="none" stroke="url(#dg_fol)" strokeWidth={sw} strokeLinecap="round" opacity="0.65" />}
      <path d={arcPath(fS, fE)} fill="none" stroke="url(#dg_fer)" strokeWidth={sw} strokeLinecap="round" />
      {fE + 1 <= total && <path d={arcPath(fE + 1, total)} fill="none" stroke="url(#dg_lut)" strokeWidth={sw} strokeLinecap="round" opacity="0.65" />}
      {(() => { const a = ((ov - 0.5) / total) * 360 - 90, rd = (a * Math.PI) / 180, ox = cx + r * Math.cos(rd), oy = cy + r * Math.sin(rd); return <polygon points={`${ox},${oy-5} ${ox+4},${oy} ${ox},${oy+5} ${ox-4},${oy}`} fill="#7C3AED" stroke="white" strokeWidth="1.5" />; })()}
      <g filter="url(#dg_glow)">
        <circle cx={cx + r * Math.cos(dR)} cy={cy + r * Math.sin(dR)} r={11} fill="white" stroke={theme.color} strokeWidth="2.5" />
        <text x={cx + r * Math.cos(dR)} y={cy + r * Math.sin(dR) + 1} textAnchor="middle" dominantBaseline="central" fill={theme.color} fontSize="8" fontWeight="800">{day}</text>
      </g>
    </svg>
  );
};

// ─── Pregnancy Ring ───────────────────────────────
const PregnancyRing = ({ week }: { week: number }) => {
  const r = 32, sw = 6, circ = 2 * Math.PI * r;
  return (
    <div className="relative w-20 h-20">
      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#F3E8FF" strokeWidth={sw} />
        <circle cx="40" cy="40" r={r} fill="none" stroke="#A855F7" strokeWidth={sw} strokeDasharray={circ} strokeDashoffset={circ * (1 - week / 40)} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs font-extrabold text-purple-700">{week}</span>
        <span className="text-[7px] text-purple-400">weeks</span>
      </div>
    </div>
  );
};

// ─── Skeleton ─────────────────────────────────────
const SkeletonCard = () => (
  <div className="bg-white rounded-3xl shadow-sm overflow-hidden animate-pulse">
    <div className="p-5 flex items-center gap-4">
      <div className="w-44 h-44 flex-shrink-0 bg-gray-100 rounded-full" />
      <div className="flex-1 space-y-3">
        <div className="h-4 bg-gray-100 rounded-lg w-3/4" /><div className="h-3 bg-gray-100 rounded-lg w-full" />
        <div className="h-8 bg-gray-100 rounded-lg w-full" /><div className="h-8 bg-gray-100 rounded-lg w-full" />
      </div>
    </div>
  </div>
);

// ─── Wellness Score Ring ──────────────────────────
const WellnessRing = ({ score }: { score: number }) => {
  const r = 28, sw = 6, circ = 2 * Math.PI * r;
  const color = score >= 75 ? '#10B981' : score >= 50 ? '#F59E0B' : '#E11D48';
  return (
    <div className="relative w-16 h-16">
      <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#F1F5F9" strokeWidth={sw} />
        <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth={sw} strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-extrabold" style={{ color }}>{score}</span>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════
export default function DashboardPage() {
  const nav = useNavigate();
  const user = useAuthStore(s => s.user);
  const { cycleDay, phase, daysUntilPeriod, cycleLength, periodLength, goal, pregnancyWeek, hasRealData } = useCycleStore();
  const set = useCycleStore(s => s.setCycleData);
  const setGoal = useCycleStore(s => s.setGoal);

  const [mood, setMood] = useState('');
  const [water, setWater] = useState(3);
  const [sleepHours, setSleepHours] = useState(0);
  const [exerciseDone, setExerciseDone] = useState(false);
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [showSleepPicker, setShowSleepPicker] = useState(false);
  const [notifCount, setNotifCount] = useState(3);
  const [dashLoading, setDashLoading] = useState(true);
  const [tipIdx, setTipIdx] = useState(0);

  const theme = phaseThemes[phase] || phaseThemes.follicular;
  const ovDay = cycleLength - 14;
  const fertStart = Math.max(1, ovDay - 5);
  const fertEnd = Math.min(cycleLength, ovDay + 1);
  const isFertile = cycleDay >= fertStart && cycleDay <= fertEnd;
  const isOvToday = cycleDay === ovDay;
  const daysToOv = ovDay > cycleDay ? ovDay - cycleDay : 0;
  const pmsStart = Math.max(1, cycleLength - 7);
  const daysToPMS = pmsStart > cycleDay ? pmsStart - cycleDay : 0;

  const conception = useMemo(() => {
    const diff = Math.abs(cycleDay - ovDay);
    if (diff === 0) return { pct: 33, label: 'Very High' };
    if (diff === 1) return { pct: 26, label: 'High' };
    if (diff === 2) return { pct: 18, label: 'Moderate' };
    if (diff === 3) return { pct: 10, label: 'Low' };
    if (diff <= 5) return { pct: 5, label: 'Very Low' };
    return { pct: 1, label: 'Minimal' };
  }, [cycleDay, ovDay]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  // Wellness score
  const wellnessScore = Math.round(
    (water / 8) * 25 + (mood ? 25 : 0) + (exerciseDone ? 25 : 0) + (sleepHours > 0 ? 25 : 0)
  );

  // Phase tip (rotating)
  const tips = phaseTips[phase] || phaseTips.follicular;
  useEffect(() => {
    const t = setInterval(() => setTipIdx(i => (i + 1) % tips.length), 4000);
    return () => clearInterval(t);
  }, [phase, tips.length]);

  useEffect(() => {
    userAPI.me().then(res => {
      const p = res.data.data || res.data;
      if (p && user) useAuthStore.getState().setUser({ ...user, fullName: p.fullName || user.fullName, email: p.email || user.email });
    }).catch(() => {});
    cycleAPI.predict().then(r => {
      const d = r.data.data;
      if (d && typeof d.cycleDay === 'number') {
        set({ cycleDay: d.cycleDay, phase: d.phase, daysUntilPeriod: d.daysUntilPeriod, cycleLength: d.cycleLength || 28, periodLength: d.periodLength || 5, hasRealData: true });
      } else { set({ hasRealData: false }); }
    }).catch(() => {}).finally(() => setDashLoading(false));
  }, []);

  const logMood = (key: string) => {
    setMood(key);
    moodAPI.log({ mood: key }).then(() => toast.success('Mood logged!')).catch(() => {});
  };

  const goalLabels: Record<UserGoal, { emoji: string; label: string; short: string }> = {
    periods: { emoji: '🌺', label: 'Period Tracking', short: 'Periods' },
    fertility: { emoji: '💜', label: 'Trying to Conceive', short: 'TTC' },
    pregnancy: { emoji: '🤰', label: 'Pregnancy', short: 'Pregnant' },
    wellness: { emoji: '🧘', label: 'Wellness & Health', short: 'Wellness' },
  };
  const curGoal = goalLabels[goal] || goalLabels.periods;

  const OnboardingCard = () => (
    <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
      <div className="p-6 text-center">
        <span className="text-5xl">🌸</span>
        <h2 className="text-lg font-extrabold text-gray-900 mt-3">Welcome to SheBloom!</h2>
        <p className="text-xs text-gray-500 mt-2 leading-relaxed">Log your first period to unlock personalized predictions, phase insights, and fertility tracking.</p>
        <div className="mt-4 bg-rose-50 rounded-2xl p-4 text-left">
          <p className="text-[11px] text-rose-700 font-bold mb-2">After logging your first period you'll see:</p>
          {['🩸 Current cycle day & phase', '✨ Ovulation predictions', '💜 Fertility window', '📅 Next period countdown'].map(i => (
            <p key={i} className="text-[10px] text-rose-600 mb-1">{i}</p>
          ))}
        </div>
        <button onClick={() => nav('/tracker')} className="w-full mt-4 py-3.5 rounded-2xl text-white font-bold text-sm active:scale-95 transition-transform" style={{ background: 'linear-gradient(135deg,#E11D48,#F43F5E)' }}>
          🩸 Log Your First Period
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-28" style={{ backgroundColor: '#FAFAF9' }}>
      {/* ─── Header ─── */}
      <div className="sticky top-0 z-20 backdrop-blur-xl border-b border-gray-100" style={{ backgroundColor: 'rgba(250,250,249,0.92)' }}>
        <div className="px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-extrabold text-sm shadow-md" style={{ background: theme.gradient }}>
              {user?.fullName?.charAt(0) || 'S'}
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-medium">{greeting}</p>
              <p className="text-sm font-extrabold text-gray-900">{user?.fullName?.split(' ')[0] || 'User'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowGoalPicker(true)} className="px-2.5 py-1 rounded-lg text-[9px] font-bold border border-gray-200 active:scale-95 transition-transform" style={{ color: theme.color, backgroundColor: theme.bg }}>
              {curGoal.emoji} {curGoal.short}
            </button>
            <button onClick={() => { setNotifCount(0); nav('/notifications'); }} className="relative w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center active:scale-95 transition-transform text-sm">
              🔔
              {notifCount > 0 && <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center"><span className="text-[7px] text-white font-extrabold">{notifCount}</span></div>}
            </button>
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-4">

        {/* ─── Quick Log Strip ─── */}
        <div className="bg-white rounded-2xl p-3 shadow-sm">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">Quick Log</p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { e: '💧', l: 'Water', val: water + '/8', action: () => setWater(w => Math.min(8, w + 1)), done: water >= 8 },
              { e: '😴', l: 'Sleep', val: sleepHours > 0 ? sleepHours + 'h' : 'Log', action: () => setShowSleepPicker(true), done: sleepHours > 0 },
              { e: '🏃', l: 'Exercise', val: exerciseDone ? 'Done ✓' : 'Log', action: () => { setExerciseDone(true); toast.success('Exercise logged! 💪'); }, done: exerciseDone },
              { e: '😊', l: 'Mood', val: mood ? '✓' : 'Log', action: () => {}, done: !!mood },
            ].map(item => (
              <button key={item.l} onClick={item.action}
                className={'flex flex-col items-center gap-1 py-2.5 rounded-xl active:scale-95 transition-transform ' + (item.done ? 'bg-emerald-50' : 'bg-gray-50')}>
                <span className="text-lg">{item.e}</span>
                <span className={'text-[8px] font-bold ' + (item.done ? 'text-emerald-600' : 'text-gray-500')}>{item.val}</span>
                <span className="text-[7px] text-gray-400">{item.l}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ─── Hero Card ─── */}
        {dashLoading ? <SkeletonCard /> : !hasRealData && goal !== 'pregnancy' ? <OnboardingCard /> : (
          <>
            {(goal === 'periods' || goal === 'wellness') && (
              <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
                <div className="p-5 flex items-center gap-4">
                  <div className="w-44 h-44 flex-shrink-0"><CycleHeroRing day={cycleDay} total={cycleLength} phase={phase} periodLength={periodLength} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-lg">{theme.emoji}</span>
                      <span className="text-xs font-extrabold uppercase tracking-wider" style={{ color: theme.color }}>{theme.name}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed mb-3">{theme.msg}</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between bg-gray-50 rounded-lg px-2.5 py-1.5">
                        <span className="text-[10px] text-gray-500">Next Period</span>
                        <span className="text-xs font-extrabold text-rose-600">{daysUntilPeriod}d</span>
                      </div>
                      <div className="flex items-center justify-between bg-gray-50 rounded-lg px-2.5 py-1.5">
                        <span className="text-[10px] text-gray-500">Cycle</span>
                        <span className="text-xs font-extrabold text-gray-700">Day {cycleDay}/{cycleLength}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-5 pb-4 flex justify-center gap-4">
                  {[{ c: '#E11D48', l: 'Period' }, { c: '#059669', l: 'Follicular' }, { c: '#7C3AED', l: 'Fertile' }, { c: '#D97706', l: 'Luteal' }].map(p => (
                    <div key={p.l} className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.c }} /><span className="text-[8px] text-gray-400 font-medium">{p.l}</span></div>
                  ))}
                </div>
              </div>
            )}
            {goal === 'fertility' && (
              <div className="rounded-3xl shadow-sm overflow-hidden" style={{ background: isFertile ? 'linear-gradient(135deg,#7C3AED,#EC4899)' : theme.gradient }}>
                <div className="p-5 text-white">
                  <div className="flex items-start justify-between">
                    <div><p className="text-white/60 text-[10px] uppercase tracking-widest font-bold">{isFertile ? 'Fertile Window Open' : theme.name + ' Phase'}</p><p className="text-4xl font-extrabold mt-1">Day {cycleDay}</p></div>
                    <div className="text-center bg-white/15 rounded-2xl px-4 py-3"><p className="text-3xl font-extrabold">{conception.pct}%</p><p className="text-[9px] text-white/70 font-bold">{conception.label}</p></div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {[{ l: 'Ovulation', v: daysToOv > 0 ? daysToOv + 'd' : isOvToday ? 'Today!' : 'Passed' }, { l: 'Next Period', v: daysUntilPeriod + 'd' }, { l: 'Fertile', v: 'Day ' + fertStart + '-' + fertEnd }].map(s => (
                      <div key={s.l} className="bg-white/15 rounded-xl px-3 py-2 text-center flex-1"><p className="text-[8px] text-white/50 uppercase">{s.l}</p><p className="text-sm font-extrabold">{s.v}</p></div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {goal === 'pregnancy' && (
          <div className="rounded-3xl shadow-sm overflow-hidden" style={{ background: 'linear-gradient(135deg,#7C3AED,#A855F7,#EC4899)' }}>
            <div className="p-5 text-white">
              <div className="flex items-center justify-between">
                <div><p className="text-white/60 text-[10px] uppercase tracking-widest font-bold">Pregnancy</p><p className="text-5xl font-extrabold mt-1">Week {pregnancyWeek}</p><p className="text-white/70 text-xs mt-1">of 40 · {Math.round(pregnancyWeek / 40 * 100)}% complete</p></div>
                <PregnancyRing week={pregnancyWeek} />
              </div>
              <div className="mt-3 w-full bg-white/20 rounded-full h-2"><div className="bg-white h-2 rounded-full" style={{ width: (pregnancyWeek / 40 * 100) + '%' }} /></div>
            </div>
          </div>
        )}

        {/* ─── Horizontal Scroll Prediction Cards ─── */}
        {hasRealData && goal !== 'pregnancy' && (
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {[
              { e: '🌸', l: 'Next Period', v: daysUntilPeriod + ' days', sub: 'away', g: 'linear-gradient(135deg,#E11D48,#F43F5E)' },
              { e: '⭐', l: 'Ovulation', v: daysToOv > 0 ? daysToOv + ' days' : isOvToday ? 'Today!' : 'Passed', sub: daysToOv > 0 ? 'away' : '', g: 'linear-gradient(135deg,#7C3AED,#8B5CF6)' },
              { e: '💚', l: 'Fertile Window', v: 'Day ' + fertStart, sub: '– Day ' + fertEnd, g: 'linear-gradient(135deg,#059669,#10B981)' },
              { e: '🌙', l: 'PMS Warning', v: daysToPMS > 0 ? daysToPMS + ' days' : 'Active', sub: daysToPMS > 0 ? 'away' : 'self-care time', g: 'linear-gradient(135deg,#D97706,#F59E0B)' },
            ].map(c => (
              <div key={c.l} className="flex-shrink-0 w-28 rounded-2xl p-3 text-white shadow-sm" style={{ background: c.g }}>
                <span className="text-lg block mb-1.5">{c.e}</span>
                <p className="text-[8px] text-white/70 font-bold uppercase">{c.l}</p>
                <p className="text-base font-extrabold leading-tight">{c.v}</p>
                {c.sub && <p className="text-[8px] text-white/70">{c.sub}</p>}
              </div>
            ))}
          </div>
        )}

        {/* ─── Quick Actions Row 1 ─── */}
        <div className="grid grid-cols-4 gap-2.5">
          {(goal === 'periods' || goal === 'wellness' ? [
            { l: 'Tracker', p: '/tracker', bg: '#FFF1F2', e: '📅', c: '#E11D48' },
            { l: 'Ayurveda', p: '/ayurveda', bg: '#ECFDF5', e: '🌿', c: '#059669' },
            { l: 'Coach', p: '/coach', bg: '#F5F3FF', e: '🤖', c: '#7C3AED' },
            { l: 'Articles', p: '/articles', bg: '#FFF7ED', e: '📰', c: '#EA580C' },
          ] : goal === 'fertility' ? [
            { l: 'Tracker', p: '/tracker', bg: '#F5F3FF', e: '💜', c: '#7C3AED' },
            { l: 'Ayurveda', p: '/ayurveda', bg: '#ECFDF5', e: '🌿', c: '#059669' },
            { l: 'Coach', p: '/coach', bg: '#FFF1F2', e: '🤖', c: '#E11D48' },
            { l: 'Doctors', p: '/doctors', bg: '#EFF6FF', e: '👩‍⚕️', c: '#2563EB' },
          ] : [
            { l: 'Pregnancy', p: '/pregnancy', bg: '#F5F3FF', e: '🤰', c: '#7C3AED' },
            { l: 'Doctors', p: '/doctors', bg: '#EFF6FF', e: '👩‍⚕️', c: '#2563EB' },
            { l: 'Coach', p: '/coach', bg: '#FFF1F2', e: '🤖', c: '#E11D48' },
            { l: 'Hospitals', p: '/hospitals', bg: '#FFF1F2', e: '🏥', c: '#E11D48' },
          ]).map(a => (
            <button key={a.l} onClick={() => nav(a.p)} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm" style={{ backgroundColor: a.bg }}>{a.e}</div>
              <span className="text-[10px] font-bold" style={{ color: a.c }}>{a.l}</span>
            </button>
          ))}
        </div>

        {/* ─── Quick Actions Row 2 ─── */}
        <div className="grid grid-cols-4 gap-2.5">
          {[
            { l: 'Community', p: '/community', bg: '#FDF2F8', e: '💬', c: '#DB2777' },
            { l: 'Programs', p: '/programs', bg: '#F5F3FF', e: '🎯', c: '#7C3AED' },
            { l: 'Wellness', p: '/wellness', bg: '#FEF3C7', e: '🧘', c: '#D97706' },
            { l: 'Doctors', p: '/doctors', bg: '#EFF6FF', e: '👩‍⚕️', c: '#2563EB' },
          ].map(a => (
            <button key={a.l} onClick={() => nav(a.p)} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm" style={{ backgroundColor: a.bg }}>{a.e}</div>
              <span className="text-[10px] font-bold" style={{ color: a.c }}>{a.l}</span>
            </button>
          ))}
        </div>

        {/* ─── Phase Insight + Daily Tip ─── */}
        {hasRealData && (goal === 'periods' || goal === 'wellness' || goal === 'fertility') && (
          <div className="rounded-2xl p-4 border" style={{ backgroundColor: theme.bg, borderColor: theme.color + '20' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{theme.emoji}</span>
              <h3 className="text-sm font-bold" style={{ color: theme.color }}>{theme.name} Phase</h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed mb-3">{theme.msg}</p>
            <div className="bg-white/70 rounded-xl p-3 min-h-[48px] transition-all">
              <p className="text-[11px] text-gray-700 leading-relaxed">💡 {tips[tipIdx]}</p>
            </div>
          </div>
        )}

        {/* ─── Your Body Today ─── */}
        {hasRealData && goal !== 'pregnancy' && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-xs font-extrabold text-gray-800 mb-3">🧬 Your Body Today</h3>
            {[
              {
                name: 'Estrogen', emoji: '💗',
                level: theme.hormoneE,
                pct: theme.hormoneE === 'Low' ? 15 : theme.hormoneE === 'Rising' ? 55 : theme.hormoneE === 'Peak' ? 90 : 35,
                color: '#EC4899',
              },
              {
                name: 'Progesterone', emoji: '🟡',
                level: theme.hormoneP,
                pct: theme.hormoneP === 'Low' ? 10 : theme.hormoneP === 'Rising' ? 40 : theme.hormoneP === 'High' ? 80 : 50,
                color: '#F59E0B',
              },
            ].map(h => (
              <div key={h.name} className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5"><span className="text-xs">{h.emoji}</span><span className="text-[10px] font-bold text-gray-700">{h.name}</span></div>
                  <span className="text-[9px] font-extrabold uppercase" style={{ color: h.color }}>{h.level}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="h-2 rounded-full transition-all duration-700" style={{ width: h.pct + '%', backgroundColor: h.color }} />
                </div>
              </div>
            ))}
            <p className="text-[9px] text-gray-400 mt-1">Based on average cycle patterns for {phase} phase</p>
          </div>
        )}

        {/* ─── Fertility Insight ─── */}
        {hasRealData && goal === 'fertility' && isFertile && (
          <div className="bg-gradient-to-r from-purple-600 to-pink-500 rounded-2xl p-4 text-white">
            <h3 className="text-sm font-extrabold mb-1">💎 Conception Window Active</h3>
            <p className="text-[11px] text-white/80 leading-relaxed">{isOvToday ? 'Today is ovulation day — your egg lives only 12-24 hours. Peak chance!' : `Ovulation in ${daysToOv} day${daysToOv > 1 ? 's' : ''}. Sperm survives 5 days — conception chance now: ${conception.pct}%.`}</p>
            <button onClick={() => nav('/tracker')} className="mt-2 bg-white/20 px-4 py-2 rounded-xl text-[10px] font-bold active:scale-95 transition-transform">Open Fertility Tracker →</button>
          </div>
        )}

        {goal === 'pregnancy' && (
          <div className="bg-gradient-to-r from-violet-50 to-pink-50 rounded-2xl p-4 border border-violet-100">
            <h3 className="text-sm font-bold text-purple-800 mb-2">📋 This Week</h3>
            <p className="text-xs text-gray-600 leading-relaxed">{pregnancyWeek <= 12 ? "First trimester — your baby's organs are forming. Take prenatal vitamins daily." : pregnancyWeek <= 26 ? 'Second trimester — you may start feeling kicks! Energy levels improve.' : 'Third trimester — almost there! Pack your hospital bag.'}</p>
            <button onClick={() => nav('/pregnancy')} className="mt-2 text-purple-600 text-xs font-bold active:scale-95 transition-transform">See full details →</button>
          </div>
        )}

        {/* ─── Mood Logger ─── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-xs font-bold text-gray-800 mb-3">How are you feeling? 💭</h3>
          <div className="flex justify-between">
            {moods.map(m => (
              <button key={m.key} onClick={() => logMood(m.key)}
                className={'flex flex-col items-center gap-1 px-1.5 py-2 rounded-xl transition-all ' + (mood === m.key ? 'scale-110 shadow-sm' : 'active:scale-95')}
                style={mood === m.key ? { backgroundColor: m.c + '15' } : {}}>
                <span className="text-2xl">{m.e}</span>
                <span className="text-[9px] font-bold text-gray-500">{m.l}</span>
                {mood === m.key && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: m.c }} />}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Water Tracker ─── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-bold text-gray-800">💧 Hydration</h3>
            <div className="flex items-center gap-1.5"><span className="text-xs font-extrabold text-blue-600">{water}</span><span className="text-[10px] text-gray-400">/ 8 glasses</span></div>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <button key={i} onClick={() => setWater(i < water ? i : i + 1)}
                className={'flex-1 h-10 rounded-lg flex items-center justify-center transition-all active:scale-90 ' + (i < water ? '' : 'bg-gray-100')}
                style={i < water ? { backgroundColor: `rgba(59,130,246,${0.15 + (i / 8) * 0.4})` } : {}}>
                <span className={'text-sm ' + (i < water ? 'text-blue-600' : 'text-gray-300')}>💧</span>
              </button>
            ))}
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2.5"><div className="bg-gradient-to-r from-blue-400 to-blue-600 h-1.5 rounded-full transition-all" style={{ width: (water / 8 * 100) + '%' }} /></div>
        </div>

        {/* ─── Wellness Score ─── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-xs font-bold text-gray-800 mb-3">⚡ Today's Wellness Score</h3>
          <div className="flex items-center gap-4">
            <WellnessRing score={wellnessScore} />
            <div className="flex-1 space-y-1.5">
              {[
                { e: '💧', l: 'Water', done: water >= 6, v: water + '/8' },
                { e: '😊', l: 'Mood', done: !!mood, v: mood || 'Not logged' },
                { e: '🏃', l: 'Exercise', done: exerciseDone, v: exerciseDone ? 'Done' : 'Not done' },
                { e: '😴', l: 'Sleep', done: sleepHours > 0, v: sleepHours > 0 ? sleepHours + 'h' : 'Not logged' },
              ].map(item => (
                <div key={item.l} className="flex items-center gap-2">
                  <span className="text-xs">{item.e}</span>
                  <span className="text-[10px] text-gray-500 flex-1">{item.l}</span>
                  <span className={'text-[9px] font-bold ' + (item.done ? 'text-emerald-500' : 'text-gray-400')}>{item.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Daily Tip ─── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-xs font-bold text-gray-800 mb-2">💡 Daily Tip</h3>
          <p className="text-[11px] text-gray-600 leading-relaxed">
            {!hasRealData && goal !== 'pregnancy' ? 'Log your first period to get personalized phase-based tips tailored to your body.' :
             goal === 'pregnancy' ? "Stay consistent with prenatal vitamins. Your baby needs 600μg of folate daily. Also ensure you're getting enough Vitamin D — 15 minutes of morning sunlight helps!" :
             tips[tipIdx]}
          </p>
        </div>
      </div>

      {/* ─── Sleep Picker Modal ─── */}
      {showSleepPicker && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowSleepPicker(false)}>
          <div className="bg-white w-full max-w-[430px] rounded-t-3xl p-6" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <h3 className="text-base font-extrabold text-gray-900 mb-4">😴 How many hours did you sleep?</h3>
            <div className="grid grid-cols-4 gap-3">
              {[5, 6, 7, 8, 9, 10].map(h => (
                <button key={h} onClick={() => { setSleepHours(h); setShowSleepPicker(false); toast.success(`${h}h sleep logged! 😴`); }}
                  className={'py-3 rounded-xl font-extrabold text-sm active:scale-95 transition-transform border-2 ' + (sleepHours === h ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-200 bg-gray-50 text-gray-700')}>
                  {h}h
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Goal Picker Modal ─── */}
      {showGoalPicker && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowGoalPicker(false)}>
          <div className="bg-white w-full max-w-[430px] rounded-t-3xl p-6" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <h3 className="text-lg font-extrabold text-gray-900 mb-1">I'm using SheBloom to...</h3>
            <p className="text-xs text-gray-400 mb-4">This changes what you see on your dashboard</p>
            <div className="grid grid-cols-2 gap-3">
              {(Object.entries(goalLabels) as [UserGoal, typeof goalLabels[UserGoal]][]).map(([key, val]) => (
                <button key={key} onClick={() => { setGoal(key); setShowGoalPicker(false); toast.success('Switched to ' + val.label); }}
                  className={'p-4 rounded-2xl border-2 text-left transition-all active:scale-95 ' + (goal === key ? 'border-rose-400 bg-rose-50 shadow-md' : 'border-gray-200 bg-white')}>
                  <span className="text-3xl block">{val.emoji}</span>
                  <p className="text-xs font-bold text-gray-800 mt-2">{val.label}</p>
                  {goal === key && <span className="text-[9px] font-bold text-rose-500 mt-0.5 block">Active</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
