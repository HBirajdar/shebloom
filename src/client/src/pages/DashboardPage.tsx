import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useCycleStore } from '../stores/cycleStore';
import type { UserGoal } from '../stores/cycleStore';
import { cycleAPI, moodAPI } from '../services/api';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════
   SHEBLOOM DASHBOARD — Goal-Adaptive, Premium Design
   ═══════════════════════════════════════════════════════ */

const moods = [
  { key: 'GREAT', e: '\u{1F929}', l: 'Great', c: '#10B981' },
  { key: 'GOOD', e: '\u{1F60A}', l: 'Good', c: '#34D399' },
  { key: 'OKAY', e: '\u{1F610}', l: 'Okay', c: '#FBBF24' },
  { key: 'LOW', e: '\u{1F614}', l: 'Low', c: '#F97316' },
  { key: 'BAD', e: '\u{1F62D}', l: 'Bad', c: '#EF4444' },
];

const phaseThemes: Record<string, { color: string; gradient: string; bg: string; emoji: string; name: string; msg: string }> = {
  menstrual: { color: '#E11D48', gradient: 'linear-gradient(135deg, #BE123C, #E11D48, #F43F5E)', bg: '#FFF1F2', emoji: '\u{1FA78}', name: 'Period', msg: 'Take it easy today. Your body is working hard.' },
  follicular: { color: '#059669', gradient: 'linear-gradient(135deg, #047857, #059669, #10B981)', bg: '#ECFDF5', emoji: '\u{1F331}', name: 'Follicular', msg: 'Energy rising! Great time for new beginnings.' },
  ovulation: { color: '#7C3AED', gradient: 'linear-gradient(135deg, #6D28D9, #7C3AED, #8B5CF6)', bg: '#F5F3FF', emoji: '\u2728', name: 'Ovulation', msg: 'Peak energy & confidence. You\'re glowing!' },
  luteal: { color: '#D97706', gradient: 'linear-gradient(135deg, #B45309, #D97706, #F59E0B)', bg: '#FFFBEB', emoji: '\u{1F343}', name: 'Luteal', msg: 'Winding down. Be gentle with yourself.' },
};

// ─── Animated SVG Cycle Ring ─────────────────────
const CycleHeroRing = ({ day, total, phase, periodLength }: { day: number; total: number; phase: string; periodLength: number }) => {
  const cx = 100, cy = 100, r = 78, sw = 14;
  const theme = phaseThemes[phase] || phaseThemes.menstrual;
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
      {/* Ovulation diamond */}
      {(() => { const a = ((ov - 0.5) / total) * 360 - 90, rd = (a * Math.PI) / 180, ox = cx + r * Math.cos(rd), oy = cy + r * Math.sin(rd);
        return <polygon points={`${ox},${oy - 5} ${ox + 4},${oy} ${ox},${oy + 5} ${ox - 4},${oy}`} fill="#7C3AED" stroke="white" strokeWidth="1.5" />;
      })()}
      {/* Current day */}
      <g filter="url(#dg_glow)">
        <circle cx={cx + r * Math.cos(dR)} cy={cy + r * Math.sin(dR)} r={11} fill="white" stroke={theme.color} strokeWidth="2.5" />
        <text x={cx + r * Math.cos(dR)} y={cy + r * Math.sin(dR) + 1} textAnchor="middle" dominantBaseline="central" fill={theme.color} fontSize="8" fontWeight="800">{day}</text>
      </g>
    </svg>
  );
};

// ─── Pregnancy Mini Ring ─────────────────────────
const PregnancyRing = ({ week }: { week: number }) => {
  const r = 32, sw = 6, circ = 2 * Math.PI * r;
  const pct = week / 40;
  return (
    <div className="relative w-20 h-20">
      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#F3E8FF" strokeWidth={sw} />
        <circle cx="40" cy="40" r={r} fill="none" stroke="#A855F7" strokeWidth={sw} strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs font-extrabold text-purple-700">{week}</span>
        <span className="text-[7px] text-purple-400">weeks</span>
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
  const { cycleDay, phase, daysUntilPeriod, cycleLength, periodLength, goal, pregnancyWeek } = useCycleStore();
  const set = useCycleStore(s => s.setCycleData);
  const setGoal = useCycleStore(s => s.setGoal);
  const [mood, setMood] = useState('');
  const [water, setWater] = useState(3);
  const [tab, setTab] = useState('home');
  const [showGoalPicker, setShowGoalPicker] = useState(false);

  const theme = phaseThemes[phase] || phaseThemes.menstrual;
  const ovDay = cycleLength - 14;
  const fertStart = Math.max(1, ovDay - 5);
  const fertEnd = Math.min(cycleLength, ovDay + 1);
  const isFertile = cycleDay >= fertStart && cycleDay <= fertEnd;
  const isOvToday = cycleDay === ovDay;
  const daysToOv = ovDay > cycleDay ? ovDay - cycleDay : 0;

  const conception = useMemo(() => {
    const diff = Math.abs(cycleDay - ovDay);
    if (diff === 0) return { pct: 33, label: 'Very High' };
    if (diff === 1) return { pct: 26, label: 'High' };
    if (diff === 2) return { pct: 18, label: 'Moderate' };
    if (diff === 3) return { pct: 10, label: 'Low' };
    if (diff <= 5) return { pct: 5, label: 'Very Low' };
    return { pct: 1, label: 'Minimal' };
  }, [cycleDay, ovDay]);

  // Time-based greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  useEffect(() => {
    cycleAPI.predict().then(r => { if (r.data.data?.cycleDay) set(r.data.data); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === 'wellness') { nav('/wellness'); setTab('home'); }
    if (tab === 'articles') { nav('/articles'); setTab('home'); }
    if (tab === 'profile') { nav('/profile'); setTab('home'); }
  }, [tab]);

  const logMood = (key: string) => {
    setMood(key);
    moodAPI.log({ mood: key }).then(() => toast.success('Mood logged!')).catch(() => {});
  };

  const goalLabels: Record<UserGoal, { emoji: string; label: string; short: string }> = {
    periods: { emoji: '\u{1F33A}', label: 'Period Tracking', short: 'Periods' },
    fertility: { emoji: '\u{1F495}', label: 'Trying to Conceive', short: 'TTC' },
    pregnancy: { emoji: '\u{1F930}', label: 'Pregnancy', short: 'Pregnant' },
    wellness: { emoji: '\u{1F9D8}', label: 'Wellness & Health', short: 'Wellness' },
  };

  const curGoal = goalLabels[goal] || goalLabels.periods;

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#FAFAF9' }}>
      {/* ─── Premium Header ─── */}
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
            <button onClick={() => nav('/appointments')} className="relative w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center active:scale-95 transition-transform text-sm">
              {'\u{1F514}'}
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-4">

        {/* ═══════════════════════════════════════
            HERO CARD — Adapts to Goal
           ═══════════════════════════════════════ */}

        {/* PERIOD / WELLNESS Mode */}
        {(goal === 'periods' || goal === 'wellness') && (
          <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
            <div className="p-5 flex items-center gap-4">
              <div className="w-44 h-44 flex-shrink-0">
                <CycleHeroRing day={cycleDay} total={cycleLength} phase={phase} periodLength={periodLength} />
              </div>
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
            {/* Phase legend */}
            <div className="px-5 pb-4 flex justify-center gap-4">
              {[{ c: '#E11D48', l: 'Period' }, { c: '#059669', l: 'Follicular' }, { c: '#7C3AED', l: 'Fertile' }, { c: '#D97706', l: 'Luteal' }].map(p => (
                <div key={p.l} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.c }} />
                  <span className="text-[8px] text-gray-400 font-medium">{p.l}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FERTILITY / TTC Mode */}
        {goal === 'fertility' && (
          <div className="rounded-3xl shadow-sm overflow-hidden" style={{ background: isFertile ? 'linear-gradient(135deg, #7C3AED, #EC4899)' : theme.gradient }}>
            <div className="p-5 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white/60 text-[10px] uppercase tracking-widest font-bold">{isFertile ? 'Fertile Window Open' : theme.name + ' Phase'}</p>
                  <p className="text-4xl font-extrabold mt-1">Day {cycleDay}</p>
                </div>
                <div className="text-center bg-white/15 rounded-2xl px-4 py-3 backdrop-blur-sm">
                  <p className="text-3xl font-extrabold">{conception.pct}%</p>
                  <p className="text-[9px] text-white/70 font-bold">{conception.label}</p>
                </div>
              </div>
              {isFertile ? (
                <div className="mt-3 bg-white/15 rounded-xl p-3 backdrop-blur-sm">
                  <p className="text-xs font-bold">{isOvToday ? '\u{1F31F} Ovulation Day — Peak Fertility!' : '\u2728 You\'re in your fertile window!'}</p>
                  <p className="text-[10px] text-white/70 mt-0.5">{isOvToday ? 'Highest chance of conception today.' : `Ovulation in ${daysToOv} day${daysToOv > 1 ? 's' : ''}. Great time to try!`}</p>
                </div>
              ) : daysToOv > 0 && daysToOv <= 7 ? (
                <div className="mt-3 bg-white/15 rounded-xl p-3 backdrop-blur-sm">
                  <p className="text-xs font-bold">{'\u{1F4C5}'} Fertile window in {fertStart - cycleDay} day{fertStart - cycleDay > 1 ? 's' : ''}</p>
                  <p className="text-[10px] text-white/70 mt-0.5">Ovulation expected Day {ovDay}. Best days: {ovDay - 2}\u2013{ovDay}.</p>
                </div>
              ) : (
                <p className="mt-3 text-xs text-white/70">{theme.msg}</p>
              )}
              <div className="flex gap-2 mt-3">
                <div className="bg-white/15 rounded-xl px-3 py-2 text-center flex-1">
                  <p className="text-[8px] text-white/50 uppercase">Ovulation</p>
                  <p className="text-sm font-extrabold">{daysToOv > 0 ? daysToOv + 'd' : isOvToday ? 'Today' : 'Done'}</p>
                </div>
                <div className="bg-white/15 rounded-xl px-3 py-2 text-center flex-1">
                  <p className="text-[8px] text-white/50 uppercase">Next Period</p>
                  <p className="text-sm font-extrabold">{daysUntilPeriod}d</p>
                </div>
                <div className="bg-white/15 rounded-xl px-3 py-2 text-center flex-1">
                  <p className="text-[8px] text-white/50 uppercase">Fertile</p>
                  <p className="text-sm font-extrabold">Day {fertStart}\u2013{fertEnd}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PREGNANCY Mode */}
        {goal === 'pregnancy' && (
          <div className="rounded-3xl shadow-sm overflow-hidden" style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7, #EC4899)' }}>
            <div className="p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-[10px] uppercase tracking-widest font-bold">Pregnancy</p>
                  <p className="text-5xl font-extrabold mt-1">Week {pregnancyWeek}</p>
                  <p className="text-white/70 text-xs mt-1">of 40 \u2022 {Math.round((pregnancyWeek / 40) * 100)}% complete</p>
                </div>
                <PregnancyRing week={pregnancyWeek} />
              </div>
              <div className="mt-3 w-full bg-white/20 rounded-full h-2">
                <div className="bg-white h-2 rounded-full transition-all" style={{ width: (pregnancyWeek / 40 * 100) + '%' }} />
              </div>
              <div className="flex gap-2 mt-3">
                <div className="bg-white/15 rounded-xl px-3 py-2 text-center flex-1">
                  <p className="text-[8px] text-white/50 uppercase">Trimester</p>
                  <p className="text-sm font-extrabold">{pregnancyWeek <= 12 ? '1st' : pregnancyWeek <= 26 ? '2nd' : '3rd'}</p>
                </div>
                <div className="bg-white/15 rounded-xl px-3 py-2 text-center flex-1">
                  <p className="text-[8px] text-white/50 uppercase">Days Left</p>
                  <p className="text-sm font-extrabold">{(40 - pregnancyWeek) * 7}d</p>
                </div>
                <div className="bg-white/15 rounded-xl px-3 py-2 text-center flex-1">
                  <p className="text-[8px] text-white/50 uppercase">Due Date</p>
                  <p className="text-sm font-extrabold">{(() => { const d = new Date(); d.setDate(d.getDate() + (40 - pregnancyWeek) * 7); return d.toLocaleDateString('en', { month: 'short', day: 'numeric' }); })()}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Quick Actions (Goal-Adaptive) ─── */}
        <div className="grid grid-cols-4 gap-2.5">
          {(goal === 'periods' || goal === 'wellness' ? [
            { l: 'Tracker', p: '/tracker', bg: '#FFF1F2', e: '\u{1F4C5}', c: '#E11D48' },
            { l: 'Wellness', p: '/wellness', bg: '#ECFDF5', e: '\u{1F9D8}', c: '#059669' },
            { l: 'Doctors', p: '/doctors', bg: '#EFF6FF', e: '\u{1F469}\u200D\u2695\uFE0F', c: '#2563EB' },
            { l: 'Articles', p: '/articles', bg: '#FFF7ED', e: '\u{1F4F0}', c: '#EA580C' },
          ] : goal === 'fertility' ? [
            { l: 'Tracker', p: '/tracker', bg: '#F5F3FF', e: '\u{1F495}', c: '#7C3AED' },
            { l: 'Ovulation', p: '/tracker', bg: '#FDF4FF', e: '\u2728', c: '#A855F7' },
            { l: 'Doctors', p: '/doctors', bg: '#EFF6FF', e: '\u{1F469}\u200D\u2695\uFE0F', c: '#2563EB' },
            { l: 'Articles', p: '/articles', bg: '#FFF7ED', e: '\u{1F4F0}', c: '#EA580C' },
          ] : [
            { l: 'Pregnancy', p: '/pregnancy', bg: '#F5F3FF', e: '\u{1F930}', c: '#7C3AED' },
            { l: 'Wellness', p: '/wellness', bg: '#ECFDF5', e: '\u{1F9D8}', c: '#059669' },
            { l: 'Doctors', p: '/doctors', bg: '#EFF6FF', e: '\u{1F469}\u200D\u2695\uFE0F', c: '#2563EB' },
            { l: 'Hospitals', p: '/hospitals', bg: '#FFF1F2', e: '\u{1F3E5}', c: '#E11D48' },
          ]).map(a => (
            <button key={a.l} onClick={() => nav(a.p)} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm" style={{ backgroundColor: a.bg }}>
                {a.e}
              </div>
              <span className="text-[10px] font-bold" style={{ color: a.c }}>{a.l}</span>
            </button>
          ))}
        </div>

        {/* ─── Insights Card (Goal-Specific) ─── */}
        {goal === 'fertility' && isFertile && (
          <div className="bg-gradient-to-r from-purple-600 to-pink-500 rounded-2xl p-4 text-white relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-20 h-20 bg-white/10 rounded-full" />
            <h3 className="text-sm font-extrabold mb-1">{'\u{1F48E}'} Conception Window Active</h3>
            <p className="text-[11px] text-white/80 leading-relaxed">
              {isOvToday ? 'Today is ovulation day \u2014 your egg lives only 12\u201324 hours. Peak chance!' : 
              `Ovulation in ${daysToOv} day${daysToOv > 1 ? 's' : ''}. Sperm can live up to 5 days, so intercourse now has a ${conception.pct}% chance.`}
            </p>
            <button onClick={() => nav('/tracker')} className="mt-2 bg-white/20 px-4 py-2 rounded-xl text-[10px] font-bold active:scale-95 transition-transform">
              Open Fertility Tracker {'\u2192'}
            </button>
          </div>
        )}

        {goal === 'pregnancy' && (
          <div className="bg-gradient-to-r from-violet-50 to-pink-50 rounded-2xl p-4 border border-violet-100">
            <h3 className="text-sm font-bold text-purple-800 mb-2">{'\u{1F4CB}'} This Week</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              {pregnancyWeek <= 12 ? 'First trimester \u2014 your baby\'s organs are forming. Take prenatal vitamins daily and rest when tired.' :
               pregnancyWeek <= 26 ? 'Second trimester \u2014 you may start feeling kicks! Energy levels improve. Stay active with gentle exercise.' :
               'Third trimester \u2014 almost there! Pack your hospital bag and practice breathing exercises.'}
            </p>
            <button onClick={() => nav('/pregnancy')} className="mt-2 text-purple-600 text-xs font-bold">See full details {'\u2192'}</button>
          </div>
        )}

        {(goal === 'periods' || goal === 'wellness') && (
          <div className="rounded-2xl p-4 border" style={{ backgroundColor: theme.bg, borderColor: theme.color + '20' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{theme.emoji}</span>
              <h3 className="text-sm font-bold" style={{ color: theme.color }}>{theme.name} Phase Insight</h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">{theme.msg}</p>
            {phase === 'menstrual' && <p className="text-[10px] text-gray-500 mt-1">{'\u{1F4A1}'} Iron-rich foods and warm compresses help with discomfort.</p>}
            {phase === 'follicular' && <p className="text-[10px] text-gray-500 mt-1">{'\u{1F4A1}'} Best time for intense workouts and starting new projects!</p>}
            {phase === 'ovulation' && <p className="text-[10px] text-gray-500 mt-1">{'\u{1F4A1}'} You may notice clear, stretchy cervical mucus today.</p>}
            {phase === 'luteal' && <p className="text-[10px] text-gray-500 mt-1">{'\u{1F4A1}'} Magnesium and complex carbs can help with PMS symptoms.</p>}
          </div>
        )}

        {/* ─── Mood Logger ─── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-xs font-bold text-gray-800 mb-3">How are you feeling?</h3>
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
            <h3 className="text-xs font-bold text-gray-800">{'\u{1F4A7}'} Hydration</h3>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-extrabold text-blue-600">{water}</span>
              <span className="text-[10px] text-gray-400">/ 8 glasses</span>
            </div>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <button key={i} onClick={() => setWater(i < water ? i : i + 1)}
                className={'flex-1 h-10 rounded-lg flex items-center justify-center transition-all active:scale-90 ' + (i < water ? '' : 'bg-gray-100')}
                style={i < water ? { backgroundColor: `rgba(59, 130, 246, ${0.15 + (i / 8) * 0.4})` } : {}}>
                <span className={'text-sm ' + (i < water ? 'text-blue-600' : 'text-gray-300')}>{'\u{1F4A7}'}</span>
              </button>
            ))}
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2.5">
            <div className="bg-gradient-to-r from-blue-400 to-blue-600 h-1.5 rounded-full transition-all" style={{ width: (water / 8 * 100) + '%' }} />
          </div>
        </div>

        {/* ─── Daily Tip ─── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-xs font-bold text-gray-800 mb-2">{'\u{1F4A1}'} Daily Tip</h3>
          <p className="text-[11px] text-gray-600 leading-relaxed">
            {phase === 'menstrual' && goal !== 'pregnancy' && 'During your period, your body loses iron. Include leafy greens, lentils, and red meat in your diet. Dark chocolate (70%+) is also a great source of magnesium!'}
            {phase === 'follicular' && 'Your body is preparing for ovulation. This is when estrogen starts climbing \u2014 you\'ll notice better skin, more energy, and sharper thinking. Best time to meal prep healthy options!'}
            {phase === 'ovulation' && goal === 'fertility' && 'Track your cervical mucus: clear, stretchy mucus that resembles raw egg whites indicates peak fertility. Basal body temperature rises 0.2\u00B0C after ovulation.'}
            {phase === 'ovulation' && goal !== 'fertility' && 'You\'re at your social best! Estrogen peaks make you more verbal, confident, and radiant. Great day for important meetings or conversations.'}
            {phase === 'luteal' && 'Progesterone is dominant now. Cravings are real \u2014 opt for complex carbs (sweet potatoes, oats) over simple sugars. Magnesium-rich foods like almonds and bananas reduce bloating.'}
            {goal === 'pregnancy' && 'Stay consistent with prenatal vitamins. Your baby needs 600\u00B5g of folate daily. Also ensure you\'re getting enough Vitamin D \u2014 15 minutes of morning sunlight helps!'}
          </p>
        </div>
      </div>

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

      {/* ─── Bottom Nav ─── */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white/95 backdrop-blur-lg border-t border-gray-100 px-2 py-2 flex justify-around z-30">
        {[
          { id: 'home', e: '\u{1F3E0}', l: 'Home' },
          { id: 'wellness', e: '\u{1F33F}', l: 'Wellness' },
          { id: 'articles', e: '\u{1F4F0}', l: 'Articles' },
          { id: 'profile', e: '\u{1F464}', l: 'Profile' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={'flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-all ' + (tab === t.id ? '' : 'text-gray-400')}
            style={tab === t.id ? { color: theme.color } : {}}>
            <span className="text-xl">{t.e}</span>
            <span className="text-[9px] font-bold">{t.l}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
