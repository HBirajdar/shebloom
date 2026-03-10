import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCycleStore } from '../stores/cycleStore';
import type { UserGoal } from '../stores/cycleStore';
import { cycleAPI, userAPI } from '../services/api';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════
   SHEBLOOM PREMIUM CYCLE TRACKER
   Inspired by Flo, Clue, Ovia — but uniquely ours
   ═══════════════════════════════════════════════════ */

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ─── Phase Database ──────────────────────────────
const PHASES: Record<string, {
  color: string; gradient: string; bgLight: string;
  emoji: string; title: string; subtitle: string;
  desc: string; tips: string[]; hormones: string;
}> = {
  menstrual: {
    color: '#E11D48', gradient: 'linear-gradient(135deg, #E11D48, #F43F5E)',
    bgLight: '#FFF1F2', emoji: '\u{1FA78}',
    title: 'Menstrual', subtitle: 'Period Days',
    desc: 'Your body sheds the uterine lining. Hormones are at their lowest — rest and nourish yourself.',
    tips: ['Apply warm compress for cramps', 'Eat iron-rich foods (spinach, dates)', 'Gentle walks help circulation', 'Track flow: light, medium, or heavy'],
    hormones: 'Estrogen & progesterone at lowest point'
  },
  follicular: {
    color: '#059669', gradient: 'linear-gradient(135deg, #059669, #10B981)',
    bgLight: '#ECFDF5', emoji: '\u{1F331}',
    title: 'Follicular', subtitle: 'Rising Energy',
    desc: 'Estrogen climbs, follicles mature. Your energy, creativity, and confidence are building up!',
    tips: ['Best phase for intense workouts', 'Start new projects & challenges', 'Skin tends to look its best', 'Social energy is naturally higher'],
    hormones: 'Estrogen rising steadily, FSH active'
  },
  ovulation: {
    color: '#7C3AED', gradient: 'linear-gradient(135deg, #7C3AED, #8B5CF6)',
    bgLight: '#F5F3FF', emoji: '\u{2728}',
    title: 'Ovulation', subtitle: 'Peak Fertility',
    desc: 'The egg is released! Peak estrogen gives you confidence, glow, and highest fertility.',
    tips: ['Peak fertility — highest conception chance', 'Check cervical mucus (egg-white texture)', 'You may feel a mild pelvic twinge', 'Libido naturally peaks now'],
    hormones: 'Estrogen peaks, LH surge triggers release'
  },
  luteal: {
    color: '#D97706', gradient: 'linear-gradient(135deg, #D97706, #F59E0B)',
    bgLight: '#FFFBEB', emoji: '\u{1F343}',
    title: 'Luteal', subtitle: 'Winding Down',
    desc: 'Progesterone rises to support possible implantation. PMS symptoms may gradually appear.',
    tips: ['Magnesium helps with mood & bloating', 'Complex carbs stabilize blood sugar', 'Extra sleep — your body needs it', 'Reduce salt to minimize water retention'],
    hormones: 'Progesterone dominant, estrogen secondary'
  },
};

// ─── Symptom Categories ──────────────────────────
const SYMPTOM_CATS: { cat: string; emoji: string; items: { n: string; e: string }[] }[] = [
  { cat: 'Flow', emoji: '\u{1FA78}', items: [
    { n: 'Light Flow', e: '\u{1F4A7}' }, { n: 'Medium Flow', e: '\u{1F4A7}\u{1F4A7}' },
    { n: 'Heavy Flow', e: '\u{1FA78}' }, { n: 'Spotting', e: '\u{1F534}' }]},
  { cat: 'Pain', emoji: '\u{1F915}', items: [
    { n: 'Cramps', e: '\u{1F625}' }, { n: 'Headache', e: '\u{1F915}' },
    { n: 'Back Pain', e: '\u{1F614}' }, { n: 'Breast Pain', e: '\u{1F494}' }]},
  { cat: 'Mood', emoji: '\u{1F60A}', items: [
    { n: 'Happy', e: '\u{1F60A}' }, { n: 'Calm', e: '\u{1F60C}' },
    { n: 'Anxious', e: '\u{1F630}' }, { n: 'Irritable', e: '\u{1F624}' },
    { n: 'Sad', e: '\u{1F622}' }, { n: 'Mood Swings', e: '\u{1F61E}' }]},
  { cat: 'Body', emoji: '\u{1F4AA}', items: [
    { n: 'Bloating', e: '\u{1F4A8}' }, { n: 'Fatigue', e: '\u{1F634}' },
    { n: 'Nausea', e: '\u{1F922}' }, { n: 'Acne', e: '\u{1F62C}' },
    { n: 'Cravings', e: '\u{1F36B}' }, { n: 'Insomnia', e: '\u{1F4A4}' }]},
  { cat: 'Intimate', emoji: '\u{1F495}', items: [
    { n: 'High Libido', e: '\u{1F525}' }, { n: 'Low Libido', e: '\u{2744}\uFE0F' },
    { n: 'Dry', e: '\u{1F335}' }, { n: 'Egg-white CM', e: '\u{1F95A}' },
    { n: 'Creamy CM', e: '\u{1F95B}' }, { n: 'Intercourse', e: '\u{1F495}' }]},
];

// ═══════════════════════════════════════════════════
// SVG COMPONENTS
// ═══════════════════════════════════════════════════

// ─── Premium Radial Cycle Wheel ──────────────────
const CycleWheel = ({ cycleDay, cycleLength, periodLength, phase }: {
  cycleDay: number; cycleLength: number; periodLength: number; phase: string;
}) => {
  const cx = 130, cy = 130, r = 98, sw = 24;
  const ov = cycleLength - 14;
  const fS = Math.max(1, ov - 5), fE = Math.min(cycleLength, ov + 1);
  const phaseCol = PHASES[phase]?.color || '#E11D48';

  const arcPath = (startDay: number, endDay: number) => {
    const sA = ((startDay - 1) / cycleLength) * 360 - 90;
    const eA = (endDay / cycleLength) * 360 - 90;
    const sR = (sA * Math.PI) / 180, eR = (eA * Math.PI) / 180;
    const x1 = cx + r * Math.cos(sR), y1 = cy + r * Math.sin(sR);
    const x2 = cx + r * Math.cos(eR), y2 = cy + r * Math.sin(eR);
    return `M ${x1} ${y1} A ${r} ${r} 0 ${eA - sA > 180 ? 1 : 0} 1 ${x2} ${y2}`;
  };

  // Current day position
  const dayA = ((cycleDay - 0.5) / cycleLength) * 360 - 90;
  const dR = (dayA * Math.PI) / 180;
  const dx = cx + r * Math.cos(dR), dy = cy + r * Math.sin(dR);

  // Ovulation position
  const ovA = ((ov - 0.5) / cycleLength) * 360 - 90;
  const ovR = (ovA * Math.PI) / 180;
  const ovx = cx + r * Math.cos(ovR), ovy = cy + r * Math.sin(ovR);

  return (
    <div className="relative" style={{ width: 260, height: 260, margin: '0 auto' }}>
      <svg viewBox="0 0 260 260" className="w-full h-full">
        <defs>
          <linearGradient id="periodG" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#BE123C" /><stop offset="100%" stopColor="#FB7185" /></linearGradient>
          <linearGradient id="follicG" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#10B981" /><stop offset="100%" stopColor="#6EE7B7" /></linearGradient>
          <linearGradient id="fertileG" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#7C3AED" /><stop offset="100%" stopColor="#A78BFA" /></linearGradient>
          <linearGradient id="lutealG" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#D97706" /><stop offset="100%" stopColor="#FCD34D" /></linearGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id="softShadow"><feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" /></filter>
        </defs>
        {/* Background track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F1F5F9" strokeWidth={sw} />
        {/* Phase arcs */}
        <path d={arcPath(1, periodLength)} fill="none" stroke="url(#periodG)" strokeWidth={sw} strokeLinecap="round" />
        {periodLength + 1 < fS && <path d={arcPath(periodLength + 1, fS - 1)} fill="none" stroke="url(#follicG)" strokeWidth={sw} strokeLinecap="round" opacity="0.8" />}
        <path d={arcPath(fS, fE)} fill="none" stroke="url(#fertileG)" strokeWidth={sw} strokeLinecap="round" />
        {fE + 1 <= cycleLength && <path d={arcPath(fE + 1, cycleLength)} fill="none" stroke="url(#lutealG)" strokeWidth={sw} strokeLinecap="round" opacity="0.8" />}
        {/* Tick marks for each day */}
        {Array.from({ length: cycleLength }).map((_, i) => {
          const a = ((i + 0.5) / cycleLength) * 360 - 90;
          const rad = (a * Math.PI) / 180;
          const inner = r - sw / 2 - 2, outer = r - sw / 2 + 2;
          return <line key={i} x1={cx + inner * Math.cos(rad)} y1={cy + inner * Math.sin(rad)}
            x2={cx + outer * Math.cos(rad)} y2={cy + outer * Math.sin(rad)} stroke="white" strokeWidth="0.8" opacity="0.5" />;
        })}
        {/* Ovulation diamond */}
        <g filter="url(#glow)">
          <polygon points={`${ovx},${ovy - 6} ${ovx + 5},${ovy} ${ovx},${ovy + 6} ${ovx - 5},${ovy}`} fill="#7C3AED" stroke="white" strokeWidth="1.5" />
        </g>
        {/* Current day marker */}
        <g filter="url(#glow)">
          <circle cx={dx} cy={dy} r={15} fill="white" stroke={phaseCol} strokeWidth="3" />
          <text x={dx} y={dy + 1} textAnchor="middle" dominantBaseline="central" fill={phaseCol} fontSize="10" fontWeight="800">{cycleDay}</text>
        </g>
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ pointerEvents: 'none' }}>
        <span className="text-3xl">{PHASES[phase]?.emoji || '\u{1FA78}'}</span>
        <span className="text-[22px] font-extrabold text-gray-900 mt-0.5 leading-none">Day {cycleDay}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider mt-1" style={{ color: phaseCol }}>{PHASES[phase]?.title || 'Cycle'}</span>
      </div>
    </div>
  );
};

// ─── Hormone Curve Visualization ─────────────────
const HormoneCurve = ({ cycleLength, cycleDay, periodLength }: { cycleLength: number; cycleDay: number; periodLength: number }) => {
  const w = 320, h = 80, pad = 10;
  const ov = cycleLength - 14;

  // Estrogen curve: low during period, rises in follicular, peaks at ovulation, dips, minor peak in luteal
  const estrogen = (d: number) => {
    const x = d / cycleLength;
    if (x < periodLength / cycleLength) return 15 + x * 80;
    if (d <= ov) return 15 + ((d - 1) / (ov - 1)) * 60;
    if (d <= ov + 2) return 75 - (d - ov) * 25;
    return 25 + Math.sin(((d - ov) / (cycleLength - ov)) * Math.PI) * 20;
  };

  // Progesterone: flat until ovulation, then rises and falls
  const progesterone = (d: number) => {
    if (d <= ov) return 10;
    const t = (d - ov) / (cycleLength - ov);
    return 10 + Math.sin(t * Math.PI) * 55;
  };

  // LH surge near ovulation
  const lh = (d: number) => {
    const diff = Math.abs(d - ov);
    if (diff > 2) return 5;
    return 5 + (1 - diff / 2) * 70;
  };

  const toX = (d: number) => pad + ((d - 1) / (cycleLength - 1)) * (w - 2 * pad);
  const toY = (val: number) => h - pad - (val / 80) * (h - 2 * pad);

  const makePath = (fn: (d: number) => number) => {
    const pts = Array.from({ length: cycleLength }, (_, i) => i + 1);
    return pts.map((d, i) => (i === 0 ? 'M' : 'L') + ` ${toX(d)} ${toY(fn(d))}`).join(' ');
  };

  const curX = toX(cycleDay);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 80 }}>
      <defs>
        <linearGradient id="estrogenFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#EC4899" stopOpacity="0.2" /><stop offset="100%" stopColor="#EC4899" stopOpacity="0" /></linearGradient>
        <linearGradient id="progFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F59E0B" stopOpacity="0.15" /><stop offset="100%" stopColor="#F59E0B" stopOpacity="0" /></linearGradient>
      </defs>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map(y => (
        <line key={y} x1={pad} y1={h * y} x2={w - pad} y2={h * y} stroke="#E5E7EB" strokeWidth="0.5" strokeDasharray="3,3" />
      ))}
      {/* Fertile zone highlight */}
      <rect x={toX(ov - 5)} y={pad} width={toX(ov + 1) - toX(ov - 5)} height={h - 2 * pad} fill="#7C3AED" opacity="0.06" rx="4" />
      {/* Estrogen curve */}
      <path d={makePath(estrogen)} fill="none" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" />
      {/* Progesterone curve */}
      <path d={makePath(progesterone)} fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeDasharray="4,2" />
      {/* LH surge */}
      <path d={makePath(lh)} fill="none" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" opacity="0.75" />
      {/* Current day line */}
      <line x1={curX} y1={pad} x2={curX} y2={h - pad} stroke="#1F2937" strokeWidth="1.5" strokeDasharray="2,2" opacity="0.4" />
      <circle cx={curX} cy={toY(estrogen(cycleDay))} r="3" fill="#EC4899" stroke="white" strokeWidth="1.5" />
      <circle cx={curX} cy={toY(progesterone(cycleDay))} r="3" fill="#F59E0B" stroke="white" strokeWidth="1.5" />
    </svg>
  );
};

// ─── Fertility Heatmap ───────────────────────────
const FertilityHeatmap = ({ cycleDay, cycleLength }: { cycleDay: number; cycleLength: number }) => {
  const ov = cycleLength - 14;
  const getProb = (d: number) => {
    const diff = Math.abs(d - ov);
    if (diff === 0) return { pct: 33, color: '#7C3AED' };
    if (diff === 1) return { pct: 26, color: '#8B5CF6' };
    if (diff === 2) return { pct: 18, color: '#A78BFA' };
    if (diff === 3) return { pct: 10, color: '#C4B5FD' };
    if (diff <= 5) return { pct: 5, color: '#DDD6FE' };
    return { pct: 0, color: 'transparent' };
  };

  return (
    <div className="overflow-x-auto -mx-4 px-4 pb-1">
      <div className="flex gap-[3px] min-w-max">
        {Array.from({ length: cycleLength }, (_, i) => {
          const d = i + 1;
          const { pct, color } = getProb(d);
          const isCur = d === cycleDay;
          const isOv = d === ov;
          return (
            <div key={d} className="flex flex-col items-center" style={{ width: 20 }}>
              <div className="relative w-4 rounded-sm" style={{ height: 32, backgroundColor: '#F1F5F9' }}>
                <div className="absolute bottom-0 w-full rounded-sm transition-all" style={{ height: `${(pct / 33) * 100}%`, backgroundColor: color }} />
                {isOv && <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-purple-600 rounded-full" />}
              </div>
              <span className={'mt-1 leading-none ' + (isCur ? 'text-[9px] font-extrabold text-rose-600' : isOv ? 'text-[8px] font-bold text-purple-600' : 'text-[7px] text-gray-400')}>
                {d}
              </span>
              {isCur && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-0.5" />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Conception Gauge ────────────────────────────
const ConceptionGauge = ({ chance, label }: { chance: number; label: string }) => {
  const r = 50, sw = 10;
  const circ = Math.PI * r; // half circle
  const offset = circ * (1 - chance / 100);
  const gaugeColor = chance > 25 ? '#7C3AED' : chance > 10 ? '#A78BFA' : chance > 0 ? '#DDD6FE' : '#E5E7EB';

  return (
    <div className="relative mx-auto" style={{ width: 140, height: 80 }}>
      <svg viewBox="0 0 130 75" className="w-full h-full">
        <path d={`M 15 65 A ${r} ${r} 0 0 1 115 65`} fill="none" stroke="#F1F5F9" strokeWidth={sw} strokeLinecap="round" />
        <path d={`M 15 65 A ${r} ${r} 0 0 1 115 65`} fill="none" stroke={gaugeColor} strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div className="absolute bottom-0 left-0 right-0 text-center">
        <span className="text-2xl font-extrabold" style={{ color: gaugeColor }}>{chance}%</span>
        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════
export default function TrackerPage() {
  const nav = useNavigate();
  const { cycleDay, phase, periodLength, cycleLength, daysUntilPeriod, goal } = useCycleStore();
  const setCycle = useCycleStore(s => s.setCycleData);
  const now = new Date();

  // State
  const [view, setView] = useState<'today' | 'calendar' | 'fertility' | 'log'>('today');
  const [mo, setMo] = useState(now.getMonth());
  const [yr, setYr] = useState(now.getFullYear());
  const [selDay, setSelDay] = useState<number | null>(now.getDate());
  const [sym, setSym] = useState<string[]>([]);
  const [symCat, setSymCat] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showConceive, setShowConceive] = useState(false);
  const [showLogPeriod, setShowLogPeriod] = useState(false);
  const [periodStartDate, setPeriodStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [tmpCycle, setTmpCycle] = useState(cycleLength);
  const [tmpPeriod, setTmpPeriod] = useState(periodLength);
  const [loggedIntercourse, setLoggedIntercourse] = useState<number[]>([]);

  // FIX: Fetch real predictions from backend on mount
  useEffect(() => {
    cycleAPI.predict().then(r => {
      const d = r.data.data;
      if (d && d.cycleDay) {
        setCycle({ cycleDay: d.cycleDay, phase: d.phase, daysUntilPeriod: d.daysUntilPeriod, cycleLength: d.cycleLength, periodLength: d.periodLength });
      }
    }).catch(() => {});
  }, []);

  const fd = new Date(yr, mo, 1).getDay();
  const dim = new Date(yr, mo + 1, 0).getDate();
  const td = now.getDate();
  const isCurMo = mo === now.getMonth() && yr === now.getFullYear();

  // Fertility calculations
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

  const curPhase = PHASES[phase] || PHASES.menstrual;

  const getDayPhase = (d: number) => {
    if (!isCurMo) return 'none';
    const diff = d - td + cycleDay;
    if (diff >= 1 && diff <= periodLength) return 'period';
    if (diff === ovDay) return 'ovulation';
    if (diff >= fertStart && diff <= fertEnd) return 'fertile';
    if (diff > periodLength && diff < fertStart) return 'follicular';
    if (diff > fertEnd) return 'luteal';
    return 'none';
  };

  const tog = (s: string) => setSym(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const save = async () => {
    try { await cycleAPI.logSymptoms({ symptoms: sym }); toast.success('Logged successfully!'); setSym([]); }
    catch { toast.error('Failed to save'); }
  };

  // FIX: Save cycle settings to BACKEND so they persist
  const saveCycleSettings = async () => {
    setCycle({ cycleLength: tmpCycle, periodLength: tmpPeriod });
    try {
      await userAPI.updateProfile({ cycleLength: tmpCycle, periodLength: tmpPeriod });
    } catch { /* local update still works */ }
    setShowSettings(false);
    toast.success('Settings updated!');
  };

  // FIX: Log period start date to backend - THIS IS THE CRITICAL MISSING PIECE
  const logPeriodStart = async () => {
    if (!periodStartDate) { toast.error('Select a date'); return; }
    try {
      await cycleAPI.log({ startDate: periodStartDate });
      toast.success('Period logged! Predictions will update.');
      setShowLogPeriod(false);
      // Refetch predictions with new data
      const res = await cycleAPI.predict();
      const d = res.data.data;
      if (d && d.cycleDay) {
        setCycle({ cycleDay: d.cycleDay, phase: d.phase, daysUntilPeriod: d.daysUntilPeriod, cycleLength: d.cycleLength, periodLength: d.periodLength });
      }
    } catch {
      toast.error('Failed to log period');
    }
  };

  const logIntercourse = () => {
    if (loggedIntercourse.includes(cycleDay)) {
      setLoggedIntercourse(loggedIntercourse.filter(d => d !== cycleDay));
    } else {
      setLoggedIntercourse([...loggedIntercourse, cycleDay]);
      toast.success('Logged for Day ' + cycleDay);
    }
  };

  const tabs = goal === 'fertility' ? [
    { id: 'today' as const, label: 'Today', icon: '\u{1F3AF}' },
    { id: 'fertility' as const, label: 'Fertility', icon: '\u{1F495}' },
    { id: 'calendar' as const, label: 'Calendar', icon: '\u{1F4C5}' },
    { id: 'log' as const, label: 'Log', icon: '\u{1F4DD}' },
  ] : [
    { id: 'today' as const, label: 'Today', icon: '\u{1F3AF}' },
    { id: 'calendar' as const, label: 'Calendar', icon: '\u{1F4C5}' },
    { id: 'fertility' as const, label: 'Insights', icon: '\u{1F4CA}' },
    { id: 'log' as const, label: 'Log', icon: '\u{1F4DD}' },
  ];

  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: '#FAFAF9' }}>
      {/* ─── Header ─── */}
      <div className="sticky top-0 z-20 backdrop-blur-xl px-5 py-3 flex items-center justify-between border-b border-gray-100" style={{ backgroundColor: 'rgba(250,250,249,0.9)' }}>
        <div className="flex items-center gap-2.5">
          <button onClick={() => nav('/dashboard')} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm active:scale-90 transition-transform">{'\u2190'}</button>
          <div>
            <h1 className="text-base font-extrabold text-gray-900">Cycle Tracker</h1>
            <p className="text-[10px] text-gray-400 -mt-0.5">Day {cycleDay} of {cycleLength}</p>
          </div>
        </div>
        <button onClick={() => setShowSettings(true)} className="px-3 py-1.5 rounded-full text-[10px] font-bold active:scale-95 transition-transform" style={{ backgroundColor: curPhase.bgLight, color: curPhase.color }}>
          {'\u2699\uFE0F'} Settings
        </button>
      </div>

      {/* ─── Tab Bar ─── */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex rounded-2xl p-1" style={{ backgroundColor: '#F1F0EE' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setView(t.id)}
              className={'flex-1 py-2 rounded-xl text-[10px] font-bold transition-all ' + (view === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400')}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-3 space-y-4">

        {/* ═══════════════════════════════════════
            TODAY TAB
           ═══════════════════════════════════════ */}
        {view === 'today' && (<>
          {/* Cycle Wheel Hero */}
          <div className="bg-white rounded-3xl p-4 shadow-sm overflow-hidden relative">
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full opacity-5" style={{ background: curPhase.gradient }} />
            <CycleWheel cycleDay={cycleDay} cycleLength={cycleLength} periodLength={periodLength} phase={phase} />

            {/* Phase legend under wheel */}
            <div className="flex justify-center gap-3 mt-2">
              {[
                { c: '#E11D48', l: 'Period' }, { c: '#10B981', l: 'Follicular' },
                { c: '#7C3AED', l: 'Fertile' }, { c: '#D97706', l: 'Luteal' },
              ].map(p => (
                <div key={p.l} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.c }} />
                  <span className="text-[9px] text-gray-500 font-medium">{p.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* LOG PERIOD BUTTON - Critical for real data */}
          <button onClick={() => setShowLogPeriod(true)}
            className="w-full py-3.5 rounded-2xl font-bold text-sm active:scale-95 transition-transform text-white" style={{ background: 'linear-gradient(135deg, #E11D48, #F43F5E)' }}>
            {'\u{1FA78}'} Log Period Start Date
          </button>

          {/* Hormone Curves */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-gray-800">Hormone Levels</h3>
              <div className="flex gap-3">
                {[{ c: '#EC4899', l: 'Estrogen' }, { c: '#F59E0B', l: 'Progesterone' }, { c: '#7C3AED', l: 'LH' }].map(h => (
                  <div key={h.l} className="flex items-center gap-1">
                    <span className="w-2 h-0.5 rounded" style={{ backgroundColor: h.c }} />
                    <span className="text-[8px] text-gray-400">{h.l}</span>
                  </div>
                ))}
              </div>
            </div>
            <HormoneCurve cycleLength={cycleLength} cycleDay={cycleDay} periodLength={periodLength} />
            <p className="text-[10px] text-gray-400 mt-1 text-center">{curPhase.hormones}</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
              <p className="text-[9px] text-gray-400 font-medium uppercase">Next Period</p>
              <p className="text-xl font-extrabold text-rose-600 mt-0.5">{daysUntilPeriod}d</p>
            </div>
            <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
              <p className="text-[9px] text-gray-400 font-medium uppercase">Ovulation</p>
              <p className="text-xl font-extrabold text-purple-600 mt-0.5">{daysToOv > 0 ? daysToOv + 'd' : isOvToday ? '\u2605' : '\u2713'}</p>
            </div>
            <button onClick={() => setShowConceive(true)} className="rounded-2xl p-3 shadow-sm text-center active:scale-95 transition-transform" style={{ background: curPhase.gradient }}>
              <p className="text-[9px] text-white/70 font-medium uppercase">Conceive</p>
              <p className="text-xl font-extrabold text-white mt-0.5">{conception.pct}%</p>
            </button>
          </div>

          {/* Fertility Alert */}
          {isFertile && (
            <div className="rounded-2xl p-4 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}>
              <div className="absolute -right-8 -top-8 w-24 h-24 bg-white/10 rounded-full" />
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{isOvToday ? '\u{1F31F}' : '\u2728'}</span>
                <h3 className="font-bold text-sm">{isOvToday ? 'Ovulation Day!' : 'Fertile Window Active'}</h3>
              </div>
              <p className="text-xs text-white/80">
                {isOvToday ? 'Peak fertility! Highest chance of conception today.' : `Ovulation in ${daysToOv} day${daysToOv > 1 ? 's' : ''}. This is a great time to try if planning to conceive.`}
              </p>
              <button onClick={logIntercourse} className="mt-3 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 active:scale-95 transition-transform">
                {loggedIntercourse.includes(cycleDay) ? '\u2705 Logged Intercourse Today' : '\u{1F495} Log Intercourse'}
              </button>
            </div>
          )}

          {/* Phase Card */}
          <div className="rounded-2xl p-4 border" style={{ backgroundColor: curPhase.bgLight, borderColor: curPhase.color + '20' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{curPhase.emoji}</span>
              <div>
                <h3 className="text-sm font-bold" style={{ color: curPhase.color }}>{curPhase.title} Phase</h3>
                <p className="text-[10px] text-gray-500">{curPhase.subtitle}</p>
              </div>
            </div>
            <p className="text-xs text-gray-600 mb-3">{curPhase.desc}</p>
            <div className="space-y-1.5">
              {curPhase.tips.map((t, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0" style={{ background: curPhase.gradient }}>{i + 1}</span>
                  <p className="text-[11px] text-gray-600 leading-relaxed">{t}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Log */}
          <button onClick={() => setView('log')} className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 text-sm font-bold text-gray-400 active:scale-98 transition-transform">
            + Log Today's Symptoms
          </button>
        </>)}

        {/* ═══════════════════════════════════════
            CALENDAR TAB
           ═══════════════════════════════════════ */}
        {view === 'calendar' && (<>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <button onClick={() => { if (mo === 0) { setMo(11); setYr(yr - 1); } else setMo(mo - 1); setSelDay(null); }}
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 active:scale-90 text-xs font-bold">{'\u25C0'}</button>
              <div className="text-center">
                <h3 className="font-extrabold text-gray-800">{MONTHS[mo]}</h3>
                <p className="text-[10px] text-gray-400">{yr}</p>
              </div>
              <button onClick={() => { if (mo === 11) { setMo(0); setYr(yr + 1); } else setMo(mo + 1); setSelDay(null); }}
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 active:scale-90 text-xs font-bold">{'\u25B6'}</button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="text-center text-[9px] font-bold text-gray-400">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: fd }).map((_, i) => <div key={'e' + i} />)}
              {Array.from({ length: dim }).map((_, i) => {
                const d = i + 1;
                const isToday = isCurMo && d === td;
                const isSel = d === selDay;
                const p = getDayPhase(d);
                const colors: Record<string, { bg: string; text: string; dot: string }> = {
                  period: { bg: 'bg-rose-100', text: 'text-rose-700', dot: '#E11D48' },
                  ovulation: { bg: 'bg-purple-200', text: 'text-purple-700', dot: '#7C3AED' },
                  fertile: { bg: 'bg-violet-50', text: 'text-violet-600', dot: '#8B5CF6' },
                  follicular: { bg: '', text: 'text-emerald-600', dot: '#10B981' },
                  luteal: { bg: '', text: 'text-amber-600', dot: '#D97706' },
                  none: { bg: '', text: 'text-gray-600', dot: '' },
                };
                const c = colors[p] || colors.none;
                const hasIntercourse = loggedIntercourse.includes(d - td + cycleDay);

                return (
                  <button key={d} onClick={() => setSelDay(d)}
                    className={'w-10 h-10 rounded-xl flex flex-col items-center justify-center text-xs mx-auto transition-all active:scale-90 relative ' +
                      (isSel ? 'bg-gray-900 text-white shadow-lg' : c.bg + ' ' + c.text) +
                      (isToday && !isSel ? ' ring-2 ring-rose-400' : '')}>
                    <span className={isSel || isToday ? 'font-extrabold' : 'font-medium'}>{d}</span>
                    {c.dot && !isSel && <span className="w-1.5 h-1.5 rounded-full -mt-0.5" style={{ backgroundColor: c.dot }} />}
                    {hasIntercourse && <span className="absolute -top-0.5 -right-0.5 text-[8px]">{'\u{1F495}'}</span>}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3 mt-4 justify-center flex-wrap">
              {[{ c: '#E11D48', l: 'Period' }, { c: '#10B981', l: 'Follicular' }, { c: '#8B5CF6', l: 'Fertile' }, { c: '#7C3AED', l: 'Ovulation' }, { c: '#D97706', l: 'Luteal' }].map(x => (
                <div key={x.l} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: x.c }} />
                  <span className="text-[9px] text-gray-500">{x.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Day */}
          {selDay && isCurMo && (() => {
            const projected = cycleDay + (selDay - td);
            const p = getDayPhase(selDay);
            const ph = p === 'period' ? 'menstrual' : p === 'fertile' || p === 'ovulation' ? 'ovulation' : p;
            const phData = PHASES[ph];
            const prob = (() => {
              if (!phData || projected < 1 || projected > cycleLength) return 0;
              const diff = Math.abs(projected - ovDay);
              if (diff === 0) return 33; if (diff === 1) return 26; if (diff === 2) return 18;
              if (diff === 3) return 10; if (diff <= 5) return 5; return 0;
            })();
            const selDate = new Date(yr, mo, selDay);
            return (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">{selDate.toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}</h3>
                    {projected >= 1 && projected <= cycleLength && <p className="text-[10px] text-gray-400">Cycle Day {projected}</p>}
                  </div>
                  {phData && <span className="text-2xl">{phData.emoji}</span>}
                </div>
                {phData && (
                  <>
                    <div className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold mb-2" style={{ backgroundColor: phData.bgLight, color: phData.color }}>
                      {phData.title} Phase
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{phData.desc}</p>
                    {prob > 0 && (
                      <div className="rounded-xl p-3" style={{ backgroundColor: '#F5F3FF' }}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold text-purple-700">{'\u{1F495}'} Conception Chance</span>
                          <span className="text-sm font-extrabold text-purple-600">{prob}%</span>
                        </div>
                        <div className="w-full bg-purple-100 rounded-full h-2">
                          <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: Math.min(prob * 3, 100) + '%' }} />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })()}
        </>)}

        {/* ═══════════════════════════════════════
            FERTILITY TAB
           ═══════════════════════════════════════ */}
        {view === 'fertility' && (<>
          {/* Conception Gauge Hero */}
          <div className="bg-white rounded-3xl p-5 shadow-sm text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Today's Conception Probability</p>
            <ConceptionGauge chance={conception.pct} label={conception.label} />
            {isFertile && <p className="text-xs font-bold text-purple-600 mt-1">{'\u2728'} Fertile window is open!</p>}
          </div>

          {/* Fertility Heatmap */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs font-bold text-gray-800">Fertility Map</h3>
              <span className="text-[9px] text-purple-500 font-bold">Day {ovDay} = Ovulation</span>
            </div>
            <FertilityHeatmap cycleDay={cycleDay} cycleLength={cycleLength} />
          </div>

          {/* Best Days to Try */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-xs font-bold text-gray-800 mb-3">{'\u{1F495}'} Best Days for Conception</h3>
            <div className="space-y-2">
              {[
                { d: ovDay - 2, chance: 33, label: '2 days before ovulation', star: true },
                { d: ovDay - 1, chance: 36, label: '1 day before (BEST DAY)', star: true },
                { d: ovDay, chance: 33, label: 'Ovulation day', star: true },
                { d: ovDay - 3, chance: 18, label: '3 days before ovulation', star: false },
                { d: ovDay + 1, chance: 10, label: '1 day after ovulation', star: false },
              ].map((row, i) => {
                const isPast = row.d < cycleDay;
                const isToday = row.d === cycleDay;
                return (
                  <div key={i} className={'flex items-center gap-3 p-2.5 rounded-xl transition-all ' + (isToday ? 'bg-purple-50 ring-1 ring-purple-200' : 'bg-gray-50')}>
                    <div className={'w-10 h-10 rounded-lg flex items-center justify-center text-xs font-extrabold ' + (isToday ? 'bg-purple-500 text-white' : isPast ? 'bg-gray-200 text-gray-400' : 'bg-white text-gray-700 border border-gray-200')}>
                      D{row.d}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        {row.star && <span className="text-[10px]">{'\u2B50'}</span>}
                        <p className={'text-[11px] font-bold ' + (isToday ? 'text-purple-700' : 'text-gray-700')}>{row.label}</p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div className="h-1.5 rounded-full transition-all" style={{ width: row.chance + '%', backgroundColor: row.chance > 30 ? '#7C3AED' : row.chance > 15 ? '#A78BFA' : '#DDD6FE' }} />
                      </div>
                    </div>
                    <span className={'text-xs font-extrabold ' + (isToday ? 'text-purple-600' : 'text-gray-500')}>{row.chance}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Key Dates Timeline */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-xs font-bold text-gray-800 mb-3">{'\u{1F4C5}'} Cycle Timeline</h3>
            <div className="space-y-0">
              {[
                { emoji: '\u{1FA78}', label: 'Period', range: `Day 1–${periodLength}`, done: cycleDay > periodLength },
                { emoji: '\u{1F331}', label: 'Follicular Phase', range: `Day ${periodLength + 1}–${fertStart - 1}`, done: cycleDay >= fertStart },
                { emoji: '\u{1F48E}', label: 'Fertile Window', range: `Day ${fertStart}–${fertEnd}`, done: cycleDay > fertEnd },
                { emoji: '\u2728', label: 'Ovulation', range: `Day ${ovDay}`, done: cycleDay > ovDay },
                { emoji: '\u{1F343}', label: 'Luteal Phase', range: `Day ${fertEnd + 1}–${cycleLength}`, done: false },
                { emoji: '\u{1F4C5}', label: 'Next Period', range: `in ${daysUntilPeriod} days`, done: false },
              ].map((item, i) => {
                const isNow = (
                  (item.label === 'Period' && cycleDay <= periodLength) ||
                  (item.label === 'Follicular Phase' && cycleDay > periodLength && cycleDay < fertStart) ||
                  (item.label === 'Fertile Window' && cycleDay >= fertStart && cycleDay <= fertEnd) ||
                  (item.label === 'Ovulation' && isOvToday) ||
                  (item.label === 'Luteal Phase' && cycleDay > fertEnd)
                );
                return (
                  <div key={i} className="flex items-start gap-3 relative">
                    {i < 5 && <div className="absolute left-[15px] top-8 w-0.5 h-6 bg-gray-200" />}
                    <div className={'w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ' + (isNow ? 'ring-2 ring-purple-400 bg-purple-50' : item.done ? 'bg-gray-100' : 'bg-gray-50')}>
                      {item.emoji}
                    </div>
                    <div className="pb-4">
                      <p className={'text-xs font-bold ' + (isNow ? 'text-purple-700' : item.done ? 'text-gray-400' : 'text-gray-700')}>{item.label}</p>
                      <p className="text-[10px] text-gray-400">{item.range}</p>
                    </div>
                    {isNow && <span className="text-[8px] font-extrabold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded-full ml-auto self-center">NOW</span>}
                    {item.done && !isNow && <span className="text-[8px] text-gray-400 ml-auto self-center">{'\u2713'}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sperm & Egg Science */}
          <div className="bg-gradient-to-br from-violet-50 to-pink-50 rounded-2xl p-4 border border-violet-100">
            <h3 className="text-xs font-bold text-violet-800 mb-3">{'\u{1F52C}'} Understanding Conception</h3>
            <div className="space-y-3">
              {[
                { q: 'How long can sperm survive?', a: 'Sperm can live up to 5 days inside the reproductive tract. That\'s why having intercourse BEFORE ovulation gives excellent chances.' },
                { q: 'How long does the egg live?', a: 'After release, the egg survives only 12–24 hours. This is why timing around ovulation is critical.' },
                { q: 'What about cervical mucus?', a: 'Clear, stretchy, egg-white cervical mucus (EWCM) indicates peak fertility. This mucus helps sperm travel to the egg.' },
                { q: 'When to take a pregnancy test?', a: 'Wait until your period is at least 1 day late (about 15 days post-ovulation) for the most accurate result.' },
                { q: 'Signs of implantation?', a: 'Light spotting, mild cramping, breast tenderness 6–12 days after ovulation could indicate implantation.' },
              ].map((item, i) => (
                <details key={i} className="group bg-white rounded-xl">
                  <summary className="text-[11px] font-bold text-gray-700 cursor-pointer p-3 flex items-center justify-between">
                    {item.q}
                    <span className="text-gray-400 text-[10px] group-open:rotate-180 transition-transform">{'\u25BC'}</span>
                  </summary>
                  <p className="text-[11px] text-gray-500 px-3 pb-3 leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </>)}

        {/* ═══════════════════════════════════════
            LOG TAB
           ═══════════════════════════════════════ */}
        {view === 'log' && (<>
          {/* Quick Log Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            <button onClick={logIntercourse}
              className={'p-4 rounded-2xl border-2 text-center transition-all active:scale-95 ' + (loggedIntercourse.includes(cycleDay) ? 'border-pink-400 bg-pink-50' : 'border-gray-200 bg-white')}>
              <span className="text-2xl block">{'\u{1F495}'}</span>
              <p className={'text-xs font-bold mt-1 ' + (loggedIntercourse.includes(cycleDay) ? 'text-pink-600' : 'text-gray-700')}>
                {loggedIntercourse.includes(cycleDay) ? 'Logged!' : 'Log Intercourse'}
              </p>
            </button>
            <div className="p-4 rounded-2xl bg-white border-2 border-gray-200 text-center">
              <span className="text-2xl block">{PHASES[phase]?.emoji || '\u{1FA78}'}</span>
              <p className="text-xs font-bold text-gray-700 mt-1">Day {cycleDay} • {PHASES[phase]?.title}</p>
            </div>
          </div>

          {/* Symptom Logger */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Log Symptoms</h3>
            <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 mb-3">
              {SYMPTOM_CATS.map((cat, ci) => (
                <button key={cat.cat} onClick={() => setSymCat(ci)}
                  className={'flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all flex-shrink-0 ' +
                    (symCat === ci ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-500')}
                  style={symCat === ci ? { background: curPhase.gradient } : {}}>
                  {cat.emoji} {cat.cat}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SYMPTOM_CATS[symCat].items.map(s => (
                <button key={s.n} onClick={() => tog(s.n)}
                  className={'p-3 rounded-xl border-2 flex items-center gap-2.5 transition-all active:scale-95 ' +
                    (sym.includes(s.n) ? 'border-rose-400 bg-rose-50 shadow-sm' : 'border-gray-100 bg-gray-50')}>
                  <span className="text-xl flex-shrink-0">{s.e}</span>
                  <span className={'text-xs font-semibold ' + (sym.includes(s.n) ? 'text-rose-600' : 'text-gray-600')}>{s.n}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Summary */}
          {sym.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase">Selected ({sym.length})</h3>
                <button onClick={() => setSym([])} className="text-[10px] text-gray-400 font-bold">Clear All</button>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {sym.map(s => {
                  const found = SYMPTOM_CATS.flatMap(c => c.items).find(x => x.n === s);
                  return (
                    <div key={s} className="flex items-center gap-1 bg-rose-50 px-2.5 py-1.5 rounded-xl border border-rose-200">
                      <span className="text-sm">{found?.e || ''}</span>
                      <span className="text-[10px] font-bold text-rose-600">{s}</span>
                      <button onClick={() => tog(s)} className="text-rose-300 ml-0.5 text-xs">{'\u2715'}</button>
                    </div>
                  );
                })}
              </div>
              <button onClick={save} className="w-full py-3.5 rounded-2xl text-sm font-bold text-white active:scale-95 transition-transform shadow-lg" style={{ background: curPhase.gradient }}>
                Save {sym.length} Symptom{sym.length > 1 ? 's' : ''}
              </button>
            </div>
          )}

          {/* Phase Note */}
          <div className="rounded-2xl p-4 border" style={{ backgroundColor: curPhase.bgLight, borderColor: curPhase.color + '15' }}>
            <h3 className="text-xs font-bold mb-1" style={{ color: curPhase.color }}>Common During {curPhase.title} Phase</h3>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              {phase === 'menstrual' && 'Cramps, fatigue, heavy flow, and lower back pain are most common. Tracking severity helps you predict and prepare for future cycles.'}
              {phase === 'follicular' && 'Energy improves and symptoms ease. Some experience increased appetite, clearer skin, and positive mood as estrogen rises.'}
              {phase === 'ovulation' && 'Mild pelvic pain (mittelschmerz), clear stretchy mucus, breast sensitivity, and higher libido are typical ovulation signs.'}
              {phase === 'luteal' && 'PMS shows up: mood swings, bloating, breast tenderness, cravings, and irritability. Tracking patterns helps you prepare.'}
            </p>
          </div>
        </>)}
      </div>

      {/* ═══ CYCLE SETTINGS MODAL ═══ */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowSettings(false)}>
          <div className="bg-white w-full max-w-[430px] rounded-t-3xl p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto" />
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-extrabold">Cycle Settings</h3>
              <button onClick={() => setShowSettings(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">{'\u2715'}</button>
            </div>
            {[
              { l: 'Cycle Length', v: tmpCycle, s: setTmpCycle, mn: 21, mx: 45, desc: 'First day to first day of next period' },
              { l: 'Period Length', v: tmpPeriod, s: setTmpPeriod, mn: 2, mx: 10, desc: 'Days of active bleeding' },
            ].map(x => (
              <div key={x.l} className="bg-gray-50 rounded-2xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <div><p className="text-sm font-bold text-gray-800">{x.l}</p><p className="text-[10px] text-gray-400">{x.desc}</p></div>
                  <div className="text-right"><span className="text-2xl font-extrabold text-gray-900">{x.v}</span><span className="text-xs text-gray-400 ml-0.5">days</span></div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => x.s(Math.max(x.mn, x.v - 1))} className="w-9 h-9 rounded-full bg-white border border-gray-200 text-gray-600 font-bold active:scale-90 shadow-sm">{'\u2212'}</button>
                  <input type="range" min={x.mn} max={x.mx} value={x.v} onChange={e => x.s(Number(e.target.value))} className="flex-1 accent-rose-500 h-2" />
                  <button onClick={() => x.s(Math.min(x.mx, x.v + 1))} className="w-9 h-9 rounded-full bg-white border border-gray-200 text-gray-600 font-bold active:scale-90 shadow-sm">+</button>
                </div>
              </div>
            ))}
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <p className="text-xs text-purple-700 font-bold">{'\u{1F52E}'} Predicted: Ovulation Day {tmpCycle - 14} • Fertile Days {tmpCycle - 19}–{tmpCycle - 13}</p>
            </div>
            <button onClick={saveCycleSettings} className="w-full py-3.5 rounded-2xl text-white font-bold active:scale-95 transition-transform" style={{ background: 'linear-gradient(135deg, #E11D48, #EC4899)' }}>
              Save Settings
            </button>
          </div>
        </div>
      )}

      {/* ═══ CONCEPTION GUIDE MODAL ═══ */}
      {showConceive && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowConceive(false)}>
          <div className="bg-white w-full max-w-[430px] rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <h3 className="text-lg font-extrabold text-center">{'\u{1F495}'} Conception Guide</h3>

            <div className="mt-4 text-center rounded-2xl p-5" style={{ backgroundColor: '#F5F3FF' }}>
              <p className="text-[10px] text-purple-500 uppercase tracking-wider font-bold">Today's Probability</p>
              <p className="text-5xl font-extrabold text-purple-600 mt-1">{conception.pct}%</p>
              <p className="text-sm text-purple-500 font-bold">{conception.label}</p>
            </div>

            <div className="mt-4 space-y-2.5 text-xs">
              <h4 className="font-extrabold text-gray-800 text-sm">Your Cycle at a Glance</h4>
              {[
                { l: 'Cycle Length', v: cycleLength + ' days' },
                { l: 'Period', v: `Day 1–${periodLength}` },
                { l: 'Fertile Window', v: `Day ${fertStart}–${fertEnd}` },
                { l: 'Ovulation', v: `Day ${ovDay}` },
                { l: 'Best Days to Try', v: `Day ${ovDay - 2}–${ovDay}` },
                { l: 'Next Period', v: `in ${daysUntilPeriod} days` },
              ].map(r => (
                <div key={r.l} className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">{r.l}</span>
                  <span className="font-bold text-gray-800">{r.v}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 bg-emerald-50 rounded-2xl p-4 text-xs text-emerald-800 space-y-1.5">
              <h4 className="font-extrabold text-sm">{'\u{1F4A1}'} Tips for Conceiving</h4>
              <p>{'\u2022'} Have intercourse every 1–2 days during your fertile window</p>
              <p>{'\u2022'} The day before ovulation has the highest success rate</p>
              <p>{'\u2022'} Lie still for 10–15 minutes afterward</p>
              <p>{'\u2022'} Both partners: take folic acid & eat whole foods</p>
              <p>{'\u2022'} Reduce stress — it can delay ovulation</p>
              <p>{'\u2022'} Avoid lubricants that harm sperm motility</p>
              <p>{'\u2022'} Track cervical mucus for extra accuracy</p>
            </div>

            <button onClick={() => setShowConceive(false)} className="w-full py-3.5 bg-gray-100 rounded-2xl font-bold text-gray-600 mt-4 active:scale-95">Close</button>
          </div>
        </div>
      )}

      {/* LOG PERIOD MODAL - sends data to backend */}
      {showLogPeriod && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowLogPeriod(false)}>
          <div className="bg-white w-full max-w-[430px] rounded-t-3xl p-6" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <div className="text-center mb-5">
              <span className="text-4xl">{'\u{1FA78}'}</span>
              <h3 className="text-lg font-extrabold text-gray-900 mt-2">Log Period Start</h3>
              <p className="text-xs text-gray-500 mt-1">When did your last period start? This helps us predict your cycle accurately.</p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">Period Start Date</label>
              <input type="date" value={periodStartDate} onChange={e => setPeriodStartDate(e.target.value)}
                className="w-full mt-1 px-4 py-3.5 border-2 border-gray-200 rounded-xl text-sm focus:border-rose-400 focus:outline-none" />
            </div>
            <button onClick={logPeriodStart}
              className="w-full mt-5 py-3.5 rounded-2xl text-white font-bold text-sm active:scale-95 transition-transform" style={{ background: 'linear-gradient(135deg, #E11D48, #EC4899)' }}>
              Save Period Date
            </button>
            <p className="text-[9px] text-gray-400 text-center mt-2">Your cycle predictions will update based on this date</p>
          </div>
        </div>
      )}
    </div>
  );
}
