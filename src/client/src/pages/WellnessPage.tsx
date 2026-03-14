import { Helmet } from 'react-helmet-async';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCycleStore } from '../stores/cycleStore';
import { wellnessAPI } from '../services/api';
import BottomNav from '../components/BottomNav';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════
   VEDACLUE WELLNESS HUB — Enterprise Grade
   ═══════════════════════════════════════════════════════ */

// ─── Phase Content ────────────────────────────────────
const PHASE_DATA: Record<string, {
  color: string; bg: string; emoji: string; name: string;
  routine: { morning: string[]; afternoon: string[]; evening: string[] };
  yoga: { name: string; emoji: string; dur: string; benefit: string }[];
  tip: string;
}> = {
  menstrual: {
    color: '#E11D48', bg: '#FFF1F2', emoji: '🩸', name: 'Period',
    routine: {
      morning: ['🌅 Gentle stretch (5 min)', '🫖 Warm ginger tea', '🧘 Child\'s Pose yoga', '💊 Iron supplement (if doctor-recommended)', '🥬 Iron-rich breakfast (spinach, dates)'],
      afternoon: ['🌡️ Warm compress for cramps', '😴 10-min rest if needed', '🥣 Light, warm meal', '💧 Extra hydration (2.5L)'],
      evening: ['🛁 Warm bath with Epsom salt', '📖 Light journaling', '🫖 Chamomile tea', '🌙 Early bedtime — rest is healing'],
    },
    yoga: [
      { name: "Child's Pose", emoji: '🧎', dur: '3 min', benefit: 'Relieves cramps' },
      { name: 'Supine Twist', emoji: '🔄', dur: '2 min', benefit: 'Relaxes lower back' },
      { name: 'Butterfly Pose', emoji: '🦋', dur: '3 min', benefit: 'Opens hips' },
      { name: 'Legs Up Wall', emoji: '🦵', dur: '5 min', benefit: 'Reduces fatigue' },
    ],
    tip: 'Rest is your superpower right now. Your body is doing extraordinary work.',
  },
  follicular: {
    color: '#059669', bg: '#ECFDF5', emoji: '🌱', name: 'Follicular',
    routine: {
      morning: ['☀️ Sun salutations (10 min)', '🥑 Nutrient-dense breakfast', '🧠 Set weekly intentions', '💪 Start a new healthy habit', '🚀 Best time for bold decisions'],
      afternoon: ['🏃 Ideal for intense workout', '🥗 Antioxidant-rich lunch', '📚 Learn something new', '🤝 Connect with people'],
      evening: ['🧘 Energizing vinyasa flow', '📓 Journal progress', '😴 8h sleep for optimal recovery'],
    },
    yoga: [
      { name: 'Sun Salutation', emoji: '☀️', dur: '10 min', benefit: 'Energizes body' },
      { name: 'Warrior I & II', emoji: '💪', dur: '5 min', benefit: 'Builds strength' },
      { name: 'Dancer Pose', emoji: '💃', dur: '3 min', benefit: 'Balance & focus' },
      { name: 'Vinyasa Flow', emoji: '🌊', dur: '20 min', benefit: 'Full body energy' },
    ],
    tip: 'Your energy is rising! This is the best time to start new goals and challenges.',
  },
  ovulation: {
    color: '#7C3AED', bg: '#F5F3FF', emoji: '✨', name: 'Ovulation',
    routine: {
      morning: ['💜 High-intensity workout', '🥜 Protein-rich breakfast', '🤸 Challenge your body', '💧 Stay well hydrated today', '🌟 You\'re at peak confidence'],
      afternoon: ['🥗 Zinc & fiber-rich lunch', '👥 Social energy is high', '🎯 Tackle hardest tasks now', '💼 Best day for negotiations'],
      evening: ['🧘 Hip-opening yoga flow', '🛀 Luxurious self-care', '💜 Connect deeply with loved ones'],
    },
    yoga: [
      { name: 'Camel Pose', emoji: '🐪', dur: '3 min', benefit: 'Opens heart' },
      { name: 'Bridge Pose', emoji: '🌉', dur: '3 min', benefit: 'Hip flexors' },
      { name: 'Pigeon Pose', emoji: '🕊️', dur: '5 min', benefit: 'Hip release' },
      { name: 'Wheel Pose', emoji: '⭕', dur: '2 min', benefit: 'Peak energy' },
    ],
    tip: 'Peak fertility and confidence. You\'re literally glowing — use this energy wisely!',
  },
  luteal: {
    color: '#D97706', bg: '#FFFBEB', emoji: '🍂', name: 'Luteal',
    routine: {
      morning: ['🌅 Gentle yoga (15 min)', '🌰 Magnesium-rich breakfast', '😮‍💨 Box breathing (5 min)', '📓 Journal feelings — don\'t suppress'],
      afternoon: ['🥗 Complex carbs (sweet potato, oats)', '😴 Power nap if needed', '🚶 Slow walk in nature', '🚫 Limit caffeine'],
      evening: ['🛁 Calming lavender bath', '🫖 Ashwagandha or chamomile tea', '📵 No screens after 9pm', '🌙 Sleep by 10pm'],
    },
    yoga: [
      { name: 'Yin Yoga', emoji: '🌙', dur: '20 min', benefit: 'Deep tissue release' },
      { name: 'Forward Fold', emoji: '🙇', dur: '5 min', benefit: 'Calms nervous system' },
      { name: 'Spinal Twist', emoji: '🌀', dur: '3 min', benefit: 'Aids digestion & spinal mobility' },
      { name: 'Corpse Pose', emoji: '😴', dur: '10 min', benefit: 'Deep restoration' },
    ],
    tip: 'Progesterone peaks then drops — mood changes are real. Practice radical self-compassion.',
  },
};

const CHALLENGES = [
  { id: 'iron', title: '7-Day Iron Boost', emoji: '🌿', days: 7, desc: 'Eat iron-rich foods daily', color: '#E11D48', bg: '#FFF1F2', badge: '🏅' },
  { id: 'stress', title: '14-Day Stress-Free', emoji: '🧘', days: 14, desc: 'Meditate 5 minutes daily', color: '#7C3AED', bg: '#F5F3FF', badge: '🥇' },
  { id: 'sync', title: '21-Day Cycle Sync', emoji: '🌸', days: 21, desc: 'Phase-aligned living', color: '#EC4899', bg: '#FDF2F8', badge: '🏆' },
  { id: 'water', title: '8-Glass Water', emoji: '💧', days: 7, desc: '8 glasses every day', color: '#3B82F6', bg: '#EFF6FF', badge: '💎' },
];

const BREATHING_MODES = [
  { id: '478', label: '4-7-8 Breathing', desc: 'Calms anxiety effectively', timing: [4, 7, 8, 0], phases: ['Inhale', 'Hold', 'Exhale', ''] },
  { id: 'box', label: 'Box Breathing', desc: 'Reduces stress & focus', timing: [4, 4, 4, 4], phases: ['Inhale', 'Hold', 'Exhale', 'Hold'] },
  { id: 'belly', label: 'Belly Breathing', desc: 'Grounds & centers you', timing: [4, 0, 6, 0], phases: ['Inhale', '', 'Exhale', ''] },
];

// ─── Wellness Score Ring ──────────────────────────────
const ScoreRing = ({ score }: { score: number }) => {
  const r = 55, sw = 10, circ = 2 * Math.PI * r;
  const color = score >= 75 ? '#10B981' : score >= 50 ? '#F59E0B' : '#E11D48';
  const label = score >= 75 ? 'Excellent' : score >= 50 ? 'Good' : score >= 25 ? 'Fair' : 'Start!';
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 130 130" className="w-full h-full -rotate-90">
          <circle cx="65" cy="65" r={r} fill="none" stroke="#F1F5F9" strokeWidth={sw} />
          <circle cx="65" cy="65" r={r} fill="none" stroke={color} strokeWidth={sw}
            strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)}
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold" style={{ color }}>{score}</span>
          <span className="text-[9px] font-bold text-gray-400">/ 100</span>
        </div>
      </div>
      <span className="text-xs font-extrabold mt-1" style={{ color }}>{label} 🌟</span>
    </div>
  );
};

// ─── Water Glass ──────────────────────────────────────
const WaterGlass = ({ filled, onClick }: { filled: boolean; onClick: () => void }) => (
  <button onClick={onClick} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
    <div className={`w-8 h-10 rounded-b-xl rounded-t-sm border-2 flex flex-col justify-end overflow-hidden transition-all duration-300 ${filled ? 'border-blue-400' : 'border-gray-200'}`}
      style={{ backgroundColor: filled ? undefined : '#F9FAFB' }}>
      {filled && <div className="w-full h-full bg-gradient-to-t from-blue-500 to-blue-300" />}
    </div>
    <span className="text-[7px] text-gray-400">{filled ? '💧' : '○'}</span>
  </button>
);

export default function WellnessPage() {
  const nav = useNavigate();
  const { phase, cycleDay, goal, hasRealData } = useCycleStore();
  const safePhase = (PHASE_DATA[phase] ? phase : 'follicular') as keyof typeof PHASE_DATA;
  const pd = PHASE_DATA[safePhase];

  // ─── API yoga/breathing content ───────────────────────
  const [apiYoga, setApiYoga] = useState<any[]>([]);
  const [apiBreathing, setApiBreathing] = useState<any[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<any>(null);
  const [playingAudio, setPlayingAudio] = useState<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch wellness activities from API
  useEffect(() => {
    setContentLoading(true);
    Promise.all([
      wellnessAPI.list({ category: 'yoga' }).catch(() => ({ data: { data: [] } })),
      wellnessAPI.list({ category: 'breathing' }).catch(() => ({ data: { data: [] } })),
    ]).then(([yogaRes, breathRes]) => {
      setApiYoga(yogaRes.data?.data || []);
      setApiBreathing(breathRes.data?.data || []);
    }).finally(() => setContentLoading(false));
  }, []);

  // ─── State ────────────────────────────────────────────
  const [tab, setTab] = useState<'today' | 'routine' | 'yoga' | 'breathe'>('today');
  const [water, setWater] = useState(0);
  const [sleepHours, setSleepHours] = useState(0);
  const [routineDone, setRoutineDone] = useState<Set<string>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('sb_routine_done') || '{}');
      // Reset daily: if saved date differs from today, start fresh
      const today = new Date().toISOString().slice(0, 10);
      if (saved.date === today && Array.isArray(saved.items)) return new Set(saved.items);
      // Clear stale routine data
      localStorage.setItem('sb_routine_done', JSON.stringify({ date: today, items: [] }));
      return new Set();
    } catch { return new Set(); }
  });
  const [streak, setStreak] = useState(() => Number(localStorage.getItem('sb_streak') || '0'));
  const [challengeProgress, setChallengeProgress] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem('sb_challenges') || '{}'); } catch { return {}; }
  });
  const [joinedChallenges, setJoinedChallenges] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('sb_joined_challenges') || '[]')); } catch { return new Set(); }
  });
  const [yogaDur, setYogaDur] = useState<5 | 15 | 30>(15);
  const [activeYoga, setActiveYoga] = useState<string | null>(null);
  const [yogaTimer, setYogaTimer] = useState(0);
  const yogaRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showSleepPicker, setShowSleepPicker] = useState(false);

  // ─── UX: Collapsible state ─────────────────────────
  const currentTimeOfDay = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening';
  const [expandedRoutine, setExpandedRoutine] = useState<'morning' | 'afternoon' | 'evening' | null>(currentTimeOfDay);
  const [showAllYoga, setShowAllYoga] = useState(false);
  const [showAllBreathBenefits, setShowAllBreathBenefits] = useState(false);

  // ─── Breathing state ──────────────────────────────────
  const [breathMode, setBreathMode] = useState('478');
  const [breathActive, setBreathActive] = useState(false);
  const [breathPhaseIdx, setBreathPhaseIdx] = useState(0);
  const [breathCount, setBreathCount] = useState(0);
  const [breathSeconds, setBreathSeconds] = useState(0);
  const [breathRounds, setBreathRounds] = useState(0);
  const breathRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bMode = BREATHING_MODES.find(b => b.id === breathMode)!;

  // Load today's wellness data from API on mount
  useEffect(() => {
    wellnessAPI.dailyScore().then(r => {
      const d = r.data?.data;
      if (d?.components?.water?.glasses !== undefined) setWater(d.components.water.glasses);
      if (d?.components?.sleep?.logged && d.components.sleep.hours) setSleepHours(d.components.sleep.hours);
    }).catch(() => {}); // Non-critical — defaults to zero
  }, []);

  // ─── Wellness score ───────────────────────────────────
  const wellnessScore = Math.round(
    (water / 8) * 25 + (sleepHours >= 7 ? 25 : sleepHours > 0 ? 15 : 0) +
    (routineDone.size >= 3 ? 25 : routineDone.size * 8) +
    (Object.keys(challengeProgress).length > 0 ? 25 : 0)
  );

  // ─── Routine helpers ──────────────────────────────────
  const toggleRoutine = (key: string) => {
    const next = new Set(routineDone);
    if (next.has(key)) next.delete(key); else { next.add(key); toast.success('✅ Done!'); }
    setRoutineDone(next);
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem('sb_routine_done', JSON.stringify({ date: today, items: [...next] }));
    if (next.size === 5 && !routineDone.has(key)) {
      const s = streak + 1; setStreak(s); localStorage.setItem('sb_streak', String(s));
      toast.success(`🔥 ${s}-day streak!`);
    }
  };

  // ─── Challenge helpers ────────────────────────────────
  const joinChallenge = (id: string) => {
    const next = new Set(joinedChallenges);
    if (next.has(id)) { next.delete(id); toast('Challenge removed'); } else {
      next.add(id); toast.success('Challenge joined! 🎯');
      setChallengeProgress(prev => ({ ...prev, [id]: (prev[id] || 0) }));
    }
    setJoinedChallenges(next);
    localStorage.setItem('sb_joined_challenges', JSON.stringify([...next]));
  };
  const logChallengeDay = (id: string) => {
    const c = CHALLENGES.find(x => x.id === id)!;
    const curr = challengeProgress[id] || 0;
    if (curr >= c.days) { toast('Already completed! 🎉'); return; }
    const next = { ...challengeProgress, [id]: curr + 1 };
    setChallengeProgress(next);
    localStorage.setItem('sb_challenges', JSON.stringify(next));
    if (curr + 1 >= c.days) toast.success(`${c.badge} Challenge completed!`);
    else toast.success(`Day ${curr + 1}/${c.days} logged!`);
  };

  // ─── Yoga timer ───────────────────────────────────────
  const startYoga = (poseName: string) => {
    setActiveYoga(poseName);
    setYogaTimer(yogaDur * 60);
    if (yogaRef.current) clearInterval(yogaRef.current);
    yogaRef.current = setInterval(() => {
      setYogaTimer(t => {
        if (t <= 1) {
          clearInterval(yogaRef.current!);
          setActiveYoga(null);
          toast.success('🧘 Practice complete!');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };
  const stopYoga = () => {
    if (yogaRef.current) clearInterval(yogaRef.current);
    setActiveYoga(null); setYogaTimer(0);
  };
  useEffect(() => () => { if (yogaRef.current) clearInterval(yogaRef.current); }, []);

  const fmtTimer = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // ─── Breathing logic ──────────────────────────────────
  useEffect(() => {
    if (!breathActive) { if (breathRef.current) clearInterval(breathRef.current); return; }
    const timing = bMode.timing;
    let phaseIdx = breathPhaseIdx, secs = breathSeconds;
    breathRef.current = setInterval(() => {
      secs++;
      const dur = timing[phaseIdx];
      if (dur > 0 && secs >= dur) {
        secs = 0;
        phaseIdx = (phaseIdx + 1) % 4;
        // Skip 0-duration phases
        while (timing[phaseIdx] === 0) phaseIdx = (phaseIdx + 1) % 4;
        setBreathPhaseIdx(phaseIdx);
        if (phaseIdx === 0) setBreathRounds(r => r + 1);
      }
      setBreathSeconds(secs);
      setBreathCount(c => c + 1);
    }, 1000);
    return () => { if (breathRef.current) clearInterval(breathRef.current); };
  }, [breathActive, breathMode]);

  const toggleBreath = () => {
    if (breathActive) {
      setBreathActive(false);
      toast.success(`🌬️ ${breathRounds} round${breathRounds !== 1 ? 's' : ''} complete!`);
    } else {
      setBreathPhaseIdx(0); setBreathSeconds(0); setBreathRounds(0); setBreathCount(0);
      setBreathActive(true);
    }
  };

  const breathPhaseName = bMode.phases[breathPhaseIdx] || bMode.phases[0];
  const breathDur = bMode.timing[breathPhaseIdx] || 4;
  const breathProgress = breathDur > 0 ? breathSeconds / breathDur : 0;
  const circleScale = breathPhaseName === 'Inhale' ? 0.7 + breathProgress * 0.3
    : breathPhaseName === 'Exhale' ? 1 - breathProgress * 0.3 : 1;

  const timeOfDay = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening';

  return (
    <div className="min-h-screen pb-28 bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      <Helmet>
        <title>Wellness Tracker | VedaClue</title>
        <meta name="description" content="Track your mood, water intake, sleep, and daily wellness score" />
      </Helmet>

      {/* ─── Header ─── */}
      <div className="sticky top-0 z-20 backdrop-blur-xl border-b border-rose-100" style={{ backgroundColor: 'rgba(255,241,242,0.85)' }}>
        <div className="px-5 py-3 flex items-center gap-3">
          <button onClick={() => nav('/dashboard')} className="w-9 h-9 rounded-2xl bg-white/80 flex items-center justify-center text-sm active:scale-95 transition-all shadow-sm">←</button>
          <div className="flex-1">
            <h1 className="text-base font-extrabold text-gray-900">Wellness Hub 🧘</h1>
            <p className="text-[9px] text-gray-400">{pd.emoji} {pd.name} phase · Day {cycleDay}</p>
          </div>
          <button onClick={() => nav('/wellness/history')}
            className="flex items-center gap-1 bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-100 active:scale-95 transition-transform">
            <span className="text-xs">📊</span>
            <span className="text-[10px] font-extrabold text-rose-600">History</span>
          </button>
          {streak > 0 && (
            <div className="flex items-center gap-1 bg-orange-50 px-2.5 py-1 rounded-xl border border-orange-100">
              <span className="text-xs">🔥</span>
              <span className="text-xs font-extrabold text-orange-600">{streak}</span>
            </div>
          )}
        </div>
        {/* Tabs */}
        <div className="px-4 pb-2 flex gap-1.5">
          {[
            { id: 'today', label: '📊 Today', },
            { id: 'routine', label: '☀️ Routine' },
            { id: 'yoga', label: '🧘 Yoga' },
            { id: 'breathe', label: '💨 Breathe' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={'px-3 py-1.5 rounded-full text-[10px] font-bold transition-all whitespace-nowrap ' + (tab === t.id ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-500')}
              style={tab === t.id ? { backgroundColor: pd.color } : {}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-4 space-y-4">

        {/* ══════════ TODAY TAB ══════════ */}
        {tab === 'today' && (<>

          {/* Wellness Score */}
          <div className="bg-white rounded-3xl shadow-lg p-5">
            <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-4 text-center">Today's Wellness Score</h2>
            <div className="flex items-center justify-around">
              <ScoreRing score={wellnessScore} />
              <div className="space-y-2.5">
                {[
                  { e: '💧', l: 'Water', v: `${water}/8`, done: water >= 6 },
                  { e: '😴', l: 'Sleep', v: sleepHours > 0 ? `${sleepHours}h` : '—', done: sleepHours >= 7 },
                  { e: '🧘', l: 'Routine', v: `${routineDone.size} done`, done: routineDone.size >= 3 },
                  { e: '🎯', l: 'Challenge', v: joinedChallenges.size > 0 ? 'Active' : '—', done: joinedChallenges.size > 0 },
                ].map(item => (
                  <div key={item.l} className="flex items-center gap-2">
                    <span className="text-base">{item.e}</span>
                    <span className="text-[10px] text-gray-500 w-14">{item.l}</span>
                    <span className={`text-[10px] font-extrabold ${item.done ? 'text-emerald-500' : 'text-gray-400'}`}>{item.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Phase Banner */}
          <div className="rounded-2xl p-4" style={{ backgroundColor: pd.bg, border: `1px solid ${pd.color}20` }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{pd.emoji}</span>
              <h3 className="text-sm font-extrabold" style={{ color: pd.color }}>{pd.name} Phase Tips</h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">{pd.tip}</p>
          </div>

          {/* Water Tracker */}
          <div className="bg-white rounded-3xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-extrabold text-gray-800">💧 Water Tracker</h3>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold text-blue-600">{water}</span>
                <span className="text-[10px] text-gray-400">/ 8 glasses</span>
                {water >= 8 && <span className="text-xs">✅</span>}
              </div>
            </div>
            <div className="flex gap-2 justify-center">
              {Array.from({ length: 8 }).map((_, i) => (
                <WaterGlass key={i} filled={i < water} onClick={() => {
                  const next = i < water ? i : i + 1;
                  setWater(next);
                  wellnessAPI.log({ type: 'water', value: next }).catch(() => {});
                  if (next === 8) toast.success('💧 Hydration goal reached!');
                }} />
              ))}
            </div>
            <div className="mt-3 flex justify-between items-center">
              <button onClick={() => { const next = Math.max(0, water - 1); setWater(next); wellnessAPI.log({ type: 'water', value: next }).catch(() => {}); }}
                className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 font-extrabold text-lg active:scale-90 transition-transform">−</button>
              <div className="flex-1 mx-3 bg-gray-100 rounded-full h-2">
                <div className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${(water / 8) * 100}%` }} />
              </div>
              <button onClick={() => { const next = Math.min(8, water + 1); setWater(next); wellnessAPI.log({ type: 'water', value: next }).catch(() => {}); if (next === 8) toast.success('💧 Goal reached!'); }}
                className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 font-extrabold text-lg active:scale-90 transition-transform">+</button>
            </div>
          </div>

          {/* Sleep Tracker */}
          <div className="bg-white rounded-3xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-extrabold text-gray-800">😴 Sleep Tracker</h3>
              {sleepHours > 0 && <span className="text-xs font-extrabold text-purple-600">{sleepHours}h {sleepHours >= 7 ? '✅' : '😔'}</span>}
            </div>
            {sleepHours > 0 ? (
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-100 rounded-full h-3">
                    <div className="h-3 rounded-full transition-all" style={{ width: `${Math.min(100, (sleepHours / 9) * 100)}%`, background: 'linear-gradient(90deg,#7C3AED,#A78BFA)' }} />
                  </div>
                  <span className="text-xs text-gray-500">/9h</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">{sleepHours >= 8 ? '🌟 Excellent sleep!' : sleepHours >= 7 ? '✅ Good sleep!' : sleepHours >= 6 ? '⚠️ Slightly low' : '😴 Rest more tonight'}</p>
                <button onClick={() => setShowSleepPicker(true)} className="text-[10px] text-purple-500 font-bold mt-1 active:scale-95 transition-transform">Edit →</button>
              </div>
            ) : (
              <button onClick={() => setShowSleepPicker(true)}
                className="w-full py-2.5 rounded-xl bg-purple-50 text-purple-700 font-bold text-xs active:scale-95 transition-transform border border-purple-100">
                + Log Last Night's Sleep
              </button>
            )}
          </div>

          {/* Active Challenges */}
          {joinedChallenges.size > 0 && (
            <div className="bg-white rounded-3xl p-4 shadow-lg">
              <h3 className="text-xs font-extrabold text-gray-800 mb-3">🎯 Your Challenges</h3>
              <div className="space-y-3">
                {CHALLENGES.filter(c => joinedChallenges.has(c.id)).map(c => {
                  const prog = challengeProgress[c.id] || 0;
                  const pct = Math.round((prog / c.days) * 100);
                  const done = prog >= c.days;
                  return (
                    <div key={c.id} className="rounded-xl p-3" style={{ backgroundColor: c.bg }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{c.emoji}</span>
                          <div>
                            <p className="text-[10px] font-extrabold text-gray-800">{c.title}</p>
                            <p className="text-[8px] text-gray-500">{prog}/{c.days} days {done ? c.badge : ''}</p>
                          </div>
                        </div>
                        {!done && (
                          <button onClick={() => logChallengeDay(c.id)}
                            className="px-3 py-1 rounded-full text-white text-[9px] font-bold active:scale-95 transition-transform"
                            style={{ backgroundColor: c.color }}>
                            Log Day
                          </button>
                        )}
                        {done && <span className="text-lg">{c.badge}</span>}
                      </div>
                      <div className="w-full bg-white/60 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: c.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* All Challenges */}
          <div className="bg-white rounded-3xl p-4 shadow-lg">
            <h3 className="text-xs font-extrabold text-gray-800 mb-3">🏆 Wellness Challenges</h3>
            <div className="space-y-3">
              {CHALLENGES.filter(c => !joinedChallenges.has(c.id)).map(c => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                  <span className="text-2xl">{c.emoji}</span>
                  <div className="flex-1">
                    <p className="text-xs font-extrabold text-gray-800">{c.title}</p>
                    <p className="text-[9px] text-gray-500">{c.desc} · {c.days} days</p>
                  </div>
                  <button onClick={() => joinChallenge(c.id)}
                    className="px-3 py-1.5 rounded-full text-white text-[9px] font-bold active:scale-95 transition-transform"
                    style={{ backgroundColor: c.color }}>
                    Join
                  </button>
                </div>
              ))}
              {CHALLENGES.every(c => joinedChallenges.has(c.id)) && (
                <div className="text-center py-4">
                  <span className="text-3xl">🏆</span>
                  <p className="text-xs font-bold text-gray-600 mt-2">You're on all challenges!</p>
                </div>
              )}
            </div>
          </div>

        </>)}

        {/* ══════════ ROUTINE TAB ══════════ */}
        {tab === 'routine' && (<>
          {/* Streak banner */}
          {streak > 0 && (
            <div className="bg-gradient-to-r from-orange-400 to-rose-500 rounded-2xl p-4 text-white text-center">
              <p className="text-3xl font-extrabold">🔥 {streak}</p>
              <p className="text-sm font-bold">Day Streak!</p>
              <p className="text-xs text-white/70 mt-1">Complete today's routine to keep it going</p>
            </div>
          )}

          {/* Phase insight */}
          <div className="rounded-2xl p-4" style={{ backgroundColor: pd.bg }}>
            <p className="text-[10px] font-extrabold uppercase tracking-wider mb-1" style={{ color: pd.color }}>{pd.emoji} {pd.name} Phase Routine</p>
            <p className="text-xs text-gray-600">These tasks are tailored to your current phase for maximum benefit.</p>
          </div>

          {(['morning', 'afternoon', 'evening'] as const).map(time => {
            const timeEmoji = time === 'morning' ? '🌅' : time === 'afternoon' ? '☀️' : '🌙';
            const tasks = pd.routine[time];
            const doneTasks = tasks.filter(t => routineDone.has(`${time}_${t}`));
            const isExpanded = expandedRoutine === time;
            return (
              <div key={time} className="bg-white rounded-3xl shadow-lg overflow-hidden">
                <button
                  onClick={() => setExpandedRoutine(isExpanded ? null : time)}
                  className="w-full px-4 py-3 flex items-center justify-between border-b border-gray-50 active:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{timeEmoji}</span>
                    <h3 className="text-sm font-extrabold text-gray-800 capitalize">{time}</h3>
                    {time === timeOfDay && <span className="text-[8px] font-bold bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">NOW</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400">{doneTasks.length}/{tasks.length}</span>
                    <span className="text-xs text-gray-300 transition-transform" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                  </div>
                </button>
                {isExpanded && (
                  <div className="divide-y divide-gray-50">
                    {tasks.map(task => {
                      const key = `${time}_${task}`;
                      const done = routineDone.has(key);
                      return (
                        <button key={key} onClick={() => toggleRoutine(key)}
                          className={'w-full flex items-center gap-3 px-4 py-3 text-left active:bg-gray-50 transition-colors ' + (done ? 'opacity-60' : '')}>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${done ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`}>
                            {done && <span className="text-white text-xs font-bold">✓</span>}
                          </div>
                          <span className={'text-xs ' + (done ? 'line-through text-gray-400' : 'text-gray-700')}>{task}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </>)}

        {/* Video Player Modal (shared between Yoga & Breathe tabs) */}
        {playingVideo && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPlayingVideo(null)}>
            <div className="w-full max-w-[430px] bg-black rounded-3xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 bg-gray-900">
                <div>
                  <p className="text-sm font-extrabold text-white">{playingVideo.title}</p>
                  <p className="text-[10px] text-gray-400">{playingVideo.durationMinutes} min · {playingVideo.difficulty}</p>
                </div>
                <button onClick={() => setPlayingVideo(null)} className="text-white/60 text-xl active:scale-90">✕</button>
              </div>
              <video src={playingVideo.videoUrl} controls autoPlay playsInline
                className="w-full aspect-video bg-black" />
              {playingVideo.instructions && Array.isArray(playingVideo.instructions) && (
                <div className="p-4 bg-gray-900 space-y-2">
                  <p className="text-[10px] font-bold text-purple-400 uppercase">Instructions</p>
                  {playingVideo.instructions.map((s: string, i: number) => (
                    <p key={i} className="text-xs text-gray-300 flex gap-2"><span className="text-purple-400 font-bold">{i + 1}.</span>{s}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════ YOGA TAB ══════════ */}
        {tab === 'yoga' && (<>
          {/* Active timer */}
          {activeYoga && (
            <div className="rounded-3xl p-6 text-white text-center" style={{ background: `linear-gradient(135deg, ${pd.color}, ${pd.color}99)` }}>
              <p className="text-xs text-white/70 font-bold uppercase mb-1">{activeYoga}</p>
              <p className="text-5xl font-extrabold">{fmtTimer(yogaTimer)}</p>
              <p className="text-xs text-white/70 mt-1">remaining</p>
              <button onClick={stopYoga} className="mt-3 bg-white/20 px-5 py-2 rounded-xl text-xs font-bold active:scale-95 transition-transform">
                Stop Practice
              </button>
            </div>
          )}

          {/* API Yoga Content (video/audio) */}
          {apiYoga.length > 0 && (
            <>
              <div className="flex items-center gap-2 px-1">
                <span className="text-lg">🎬</span>
                <h3 className="text-sm font-extrabold text-gray-800">Guided Yoga Sessions</h3>
              </div>
              <div className="space-y-3">
                {apiYoga.map(a => (
                  <div key={a.id} className="bg-white rounded-3xl shadow-lg overflow-hidden">
                    <div className="relative">
                      {a.imageUrl ? (
                        <img src={a.imageUrl} alt={a.title} className="w-full h-40 object-cover" />
                      ) : (
                        <div className="w-full h-40 bg-gradient-to-br from-purple-100 to-rose-100 flex items-center justify-center text-5xl">🧘</div>
                      )}
                      {a.videoUrl && (
                        <button onClick={() => setPlayingVideo(a)}
                          className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-all">
                          <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                            <span className="text-2xl ml-1">▶</span>
                          </div>
                        </button>
                      )}
                      <div className="absolute bottom-2 left-2 flex gap-1">
                        <span className="text-[8px] font-bold bg-black/60 text-white px-2 py-0.5 rounded-full">{a.durationMinutes} min</span>
                        <span className="text-[8px] font-bold bg-black/60 text-white px-2 py-0.5 rounded-full">{a.difficulty}</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-sm font-extrabold text-gray-900">{a.title}</p>
                      {a.description && <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">{a.description}</p>}
                      <div className="flex gap-2 mt-3">
                        {a.videoUrl && (
                          <button onClick={() => setPlayingVideo(a)}
                            className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold active:scale-95 transition-transform"
                            style={{ background: `linear-gradient(135deg, ${pd.color}, ${pd.color}99)` }}>
                            🎬 Watch Video
                          </button>
                        )}
                        {!a.videoUrl && (
                          <button onClick={() => startYoga(a.title)}
                            className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold active:scale-95 transition-transform"
                            style={{ backgroundColor: pd.color }}>
                            Start Timer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Duration picker */}
          <div className="bg-white rounded-3xl p-4 shadow-lg">
            <h3 className="text-xs font-extrabold text-gray-800 mb-3">Session Duration</h3>
            <div className="flex gap-2">
              {([5, 15, 30] as const).map(d => (
                <button key={d} onClick={() => setYogaDur(d)}
                  className={'flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all active:scale-95 border-2 ' + (yogaDur === d ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 bg-gray-50')}
                  style={yogaDur === d ? { backgroundColor: pd.color, borderColor: pd.color } : {}}>
                  {d} min
                </button>
              ))}
            </div>
          </div>

          {/* Phase yoga heading */}
          <div className="flex items-center gap-2 px-1">
            <span className="text-lg">{pd.emoji}</span>
            <h3 className="text-sm font-extrabold text-gray-800">{pd.name} Phase Yoga</h3>
          </div>

          {/* Poses grid */}
          <div className="grid grid-cols-2 gap-3">
            {(showAllYoga ? pd.yoga : pd.yoga.slice(0, 2)).map(pose => (
              <div key={pose.name} className="bg-white rounded-3xl shadow-lg overflow-hidden">
                <div className="h-24 flex items-center justify-center text-5xl" style={{ backgroundColor: pd.bg }}>{pose.emoji}</div>
                <div className="p-3">
                  <p className="text-xs font-extrabold text-gray-800">{pose.name}</p>
                  <p className="text-[9px] text-gray-400 mt-0.5">{pose.benefit}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[9px] font-bold text-gray-400">{pose.dur}</span>
                    <button onClick={() => startYoga(pose.name)}
                      className="px-3 py-1 rounded-full text-white text-[9px] font-bold active:scale-95 transition-transform"
                      style={{ backgroundColor: pd.color }}>
                      Start
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {pd.yoga.length > 2 && !showAllYoga && (
            <button onClick={() => setShowAllYoga(true)}
              className="w-full py-2.5 text-center text-xs font-bold active:scale-95 transition-transform rounded-xl border border-gray-200 bg-white"
              style={{ color: pd.color }}>
              Show all {pd.yoga.length} yoga poses →
            </button>
          )}
          {showAllYoga && pd.yoga.length > 2 && (
            <button onClick={() => setShowAllYoga(false)}
              className="w-full py-2 text-center text-[10px] font-bold text-gray-400 active:scale-95 transition-transform">
              Show fewer
            </button>
          )}

          {/* Phase yoga tips */}
          <div className="rounded-2xl p-4" style={{ backgroundColor: pd.bg }}>
            <p className="text-[10px] font-extrabold uppercase tracking-wider mb-2" style={{ color: pd.color }}>💡 {pd.name} Phase Yoga Tip</p>
            <p className="text-xs text-gray-600 leading-relaxed">{pd.tip}</p>
          </div>
        </>)}

        {/* ══════════ BREATHE TAB ══════════ */}
        {tab === 'breathe' && (<>

          {/* Audio Player (hidden) */}
          <audio ref={audioRef} />

          {/* API Guided Breathing Sessions */}
          {apiBreathing.length > 0 && (
            <>
              <div className="flex items-center gap-2 px-1">
                <span className="text-lg">🎵</span>
                <h3 className="text-sm font-extrabold text-gray-800">Guided Breathing Sessions</h3>
              </div>
              <div className="space-y-3">
                {apiBreathing.map(a => (
                  <div key={a.id} className="bg-white rounded-3xl shadow-lg p-4">
                    <div className="flex items-center gap-3">
                      {a.imageUrl ? (
                        <img src={a.imageUrl} alt={a.title} className="w-16 h-16 rounded-2xl object-cover" />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center text-3xl">💨</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-extrabold text-gray-900 truncate">{a.title}</p>
                        {a.description && <p className="text-[10px] text-gray-500 mt-0.5">{a.description}</p>}
                        <div className="flex gap-1 mt-1">
                          <span className="text-[8px] font-bold bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{a.durationMinutes} min</span>
                          <span className="text-[8px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{a.difficulty}</span>
                        </div>
                      </div>
                    </div>
                    {/* Audio/Video controls */}
                    <div className="flex gap-2 mt-3">
                      {a.audioUrl && (
                        <button onClick={() => {
                          if (playingAudio?.id === a.id) {
                            audioRef.current?.pause();
                            setPlayingAudio(null);
                          } else {
                            if (audioRef.current) {
                              audioRef.current.src = a.audioUrl;
                              audioRef.current.play().catch(() => {});
                            }
                            setPlayingAudio(a);
                          }
                        }}
                          className={'flex-1 py-2.5 rounded-xl text-xs font-bold active:scale-95 transition-transform ' + (playingAudio?.id === a.id ? 'bg-rose-500 text-white' : 'bg-purple-500 text-white')}>
                          {playingAudio?.id === a.id ? '⏹ Stop Audio' : '🎵 Play Audio'}
                        </button>
                      )}
                      {a.videoUrl && (
                        <button onClick={() => setPlayingVideo(a)}
                          className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white text-xs font-bold active:scale-95 transition-transform">
                          🎬 Watch Video
                        </button>
                      )}
                      {!a.audioUrl && !a.videoUrl && (
                        <button onClick={toggleBreath}
                          className="flex-1 py-2.5 rounded-xl bg-purple-500 text-white text-xs font-bold active:scale-95 transition-transform">
                          ▶ Start Guided
                        </button>
                      )}
                    </div>
                    {/* Instructions */}
                    {a.instructions && Array.isArray(a.instructions) && playingAudio?.id === a.id && (
                      <div className="mt-3 bg-purple-50 rounded-xl p-3 space-y-1">
                        {a.instructions.map((s: string, i: number) => (
                          <p key={i} className="text-[10px] text-purple-700"><span className="font-bold">{i + 1}.</span> {s}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="h-px bg-gray-200 my-2" />
            </>
          )}

          {/* Mode selector */}
          <div className="space-y-2">
            {BREATHING_MODES.map(m => (
              <button key={m.id} onClick={() => { setBreathMode(m.id); setBreathActive(false); setBreathPhaseIdx(0); setBreathRounds(0); setBreathSeconds(0); }}
                className={'w-full text-left p-4 rounded-2xl border-2 transition-all active:scale-[0.99] ' + (breathMode === m.id ? 'border-purple-400 bg-purple-50 shadow-sm' : 'border-gray-200 bg-white')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-extrabold text-gray-900">{m.label}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{m.desc}</p>
                    <div className="flex gap-1 mt-1.5">
                      {m.timing.filter(t => t > 0).map((t, i) => (
                        <span key={i} className="text-[8px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                          {m.phases.filter((p, pi) => m.timing[pi] > 0)[i]}: {t}s
                        </span>
                      ))}
                    </div>
                  </div>
                  {breathMode === m.id && <span className="text-purple-500 font-bold">✓</span>}
                </div>
              </button>
            ))}
          </div>

          {/* Breathing animation */}
          <div className="bg-white rounded-3xl shadow-lg p-8 flex flex-col items-center">
            <div className="relative w-48 h-48 flex items-center justify-center mb-6">
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border-2 border-purple-100" />
              {/* Animated circle */}
              <div
                className="w-32 h-32 rounded-full flex items-center justify-center transition-all duration-1000"
                style={{
                  transform: `scale(${breathActive ? circleScale : 1})`,
                  background: breathActive
                    ? (breathPhaseName === 'Inhale' ? 'linear-gradient(135deg,#7C3AED,#A78BFA)' :
                       breathPhaseName === 'Exhale' ? 'linear-gradient(135deg,#059669,#6EE7B7)' :
                       'linear-gradient(135deg,#D97706,#FDE68A)')
                    : 'linear-gradient(135deg,#E5E7EB,#F3F4F6)',
                  boxShadow: breathActive ? '0 0 30px rgba(124,58,237,0.3)' : 'none',
                }}
              >
                <div className="text-center text-white">
                  {breathActive ? (
                    <>
                      <p className="text-base font-extrabold">{breathPhaseName}</p>
                      <p className="text-2xl font-extrabold">{breathDur - breathSeconds}</p>
                    </>
                  ) : (
                    <p className="text-xs font-bold text-gray-400">Tap Start</p>
                  )}
                </div>
              </div>
            </div>

            {breathActive && (
              <p className="text-xs text-gray-500 mb-4 text-center">
                Round {breathRounds + 1} · {breathPhaseName || 'Breathe'}
              </p>
            )}

            <button onClick={toggleBreath}
              className="w-full py-4 rounded-2xl text-white font-extrabold text-sm active:scale-95 transition-transform"
              style={{ background: breathActive ? 'linear-gradient(135deg,#E11D48,#F43F5E)' : 'linear-gradient(135deg,#7C3AED,#A78BFA)' }}>
              {breathActive ? '⏹ Stop Session' : '▶ Start Breathing'}
            </button>

            {breathRounds > 0 && !breathActive && (
              <div className="mt-4 bg-purple-50 rounded-2xl p-3 text-center w-full">
                <p className="text-sm font-extrabold text-purple-700">🌬️ {breathRounds} round{breathRounds > 1 ? 's' : ''} complete!</p>
                <p className="text-[10px] text-purple-500 mt-1">Great job — keep it up!</p>
              </div>
            )}
          </div>

          {/* Breathwork benefits */}
          <div className="bg-white rounded-3xl p-4 shadow-lg">
            <h3 className="text-xs font-extrabold text-gray-800 mb-3">🧪 Why breathwork works</h3>
            {(() => {
              const benefits = [
                { e: '🧠', t: 'Calms your nervous system' },
                { e: '❤️', t: 'Lowers heart rate & blood pressure' },
                { e: '😌', t: 'Reduces stress hormones' },
                { e: '💜', t: 'Helps with PMS anxiety & mood swings' },
              ];
              const visible = showAllBreathBenefits ? benefits : benefits.slice(0, 2);
              return (
                <>
                  {visible.map(b => (
                    <div key={b.t} className="flex items-start gap-2 mb-2">
                      <span className="text-sm">{b.e}</span>
                      <p className="text-xs text-gray-600 leading-relaxed">{b.t}</p>
                    </div>
                  ))}
                  {!showAllBreathBenefits && benefits.length > 2 && (
                    <button onClick={() => setShowAllBreathBenefits(true)}
                      className="text-[10px] font-bold text-purple-500 mt-1 active:scale-95 transition-transform">
                      More tips →
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        </>)}

      </div>

      {/* ─── Sleep Picker Modal ─── */}
      {showSleepPicker && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowSleepPicker(false)}>
          <div className="bg-white w-full max-w-[430px] rounded-t-3xl p-6" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <h3 className="text-base font-extrabold text-gray-900 mb-4">😴 How many hours did you sleep?</h3>
            <div className="grid grid-cols-4 gap-3">
              {[4, 5, 6, 7, 7.5, 8, 9, 10].map(h => (
                <button key={h} onClick={() => { setSleepHours(h); setShowSleepPicker(false); wellnessAPI.log({ type: 'sleep', value: h }).catch(() => {}); toast.success(`${h}h sleep logged! 😴`); }}
                  className={'py-3 rounded-xl font-extrabold text-sm active:scale-95 transition-transform border-2 ' + (sleepHours === h ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-200 bg-gray-50 text-gray-700')}>
                  {h}h
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
