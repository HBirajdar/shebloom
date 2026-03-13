// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useCycleStore } from '../stores/cycleStore';
import type { UserGoal } from '../stores/cycleStore';
import { cycleAPI, moodAPI, userAPI, wellnessAPI, notificationAPI, doctorAPI, articleAPI, weatherAPI } from '../services/api';
import BottomNav from '../components/BottomNav';
import DoctorCarousel from '../components/DoctorCarousel';
import type { Doctor as CarouselDoctor } from '../components/DoctorCarousel';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════
   VEDACLUE DASHBOARD — Enterprise Grade
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

// Period-only tips (no fertility references)
const periodTips: Record<string, string[]> = {
  menstrual: ['🌡️ Warm compress relieves cramps', '🥬 Eat iron-rich foods (spinach, dates)', '😴 Extra rest is completely valid', '🫖 Ginger tea helps inflammation'],
  follicular: ['⚡ Best phase for intense workouts', '🚀 Start new projects now', '🥑 Load up on healthy fats', '💃 Your social energy is high'],
  ovulation: ['🌸 You may feel more confident today', '🔥 Peak energy — try intense workouts', '💧 Stay extra hydrated', '🧘 Great time for challenging goals'],
  luteal: ['🌰 Magnesium reduces PMS (almonds)', '🍠 Complex carbs stabilize mood', '😴 Body needs extra sleep now', '🚫 Reduce caffeine and salt'],
};

// Wellness-focused tips (daily health, not cycle-specific)
const wellnessTips = [
  '💧 Aim for 8 glasses of water — your skin and energy will thank you',
  '🧘 Even 5 minutes of deep breathing reduces cortisol by 25%',
  '😴 Blue light before bed delays melatonin — try reading instead',
  '🏃 A 20-minute walk boosts mood for up to 12 hours',
  '🥗 Eating greens at lunch prevents the 3pm energy crash',
  '🌅 Morning sunlight for 10 min resets your circadian rhythm',
  '📵 Screen breaks every 45 min reduce eye strain and stress',
  '🫖 Herbal tea before bed improves sleep quality by 20%',
];

// ─── Animated SVG Cycle Ring ─────────────────────
const CycleHeroRing = ({ day, total, phase, periodLength, luteal, showFertility = true }: { day: number; total: number; phase: string; periodLength: number; luteal?: number; showFertility?: boolean }) => {
  const cx = 120, cy = 120, r = 100, sw = 18;
  const theme = phaseThemes[phase] || phaseThemes.follicular;
  const ov = total - (luteal || 13); // Use individual luteal phase (Lenton 1984)
  const fS = Math.max(1, ov - 5), fE = Math.min(total, ov + 1);
  const arcPath = (s: number, e: number) => {
    const sA = ((s - 1) / total) * 360 - 90, eA = (e / total) * 360 - 90;
    const sR = (sA * Math.PI) / 180, eR = (eA * Math.PI) / 180;
    return `M ${cx + r * Math.cos(sR)} ${cy + r * Math.sin(sR)} A ${r} ${r} 0 ${eA - sA > 180 ? 1 : 0} 1 ${cx + r * Math.cos(eR)} ${cy + r * Math.sin(eR)}`;
  };
  const dayA = ((day - 0.5) / total) * 360 - 90;
  const dR = (dayA * Math.PI) / 180;
  return (
    <svg viewBox="0 0 240 240" className="w-full h-full">
      <defs>
        <linearGradient id="dg_per" x1="0%" y1="0%" x2="100%"><stop offset="0%" stopColor="#BE123C" /><stop offset="100%" stopColor="#F43F5E" /></linearGradient>
        <linearGradient id="dg_fol" x1="0%" y1="0%" x2="100%"><stop offset="0%" stopColor="#059669" /><stop offset="100%" stopColor="#34D399" /></linearGradient>
        <linearGradient id="dg_fer" x1="0%" y1="0%" x2="100%"><stop offset="0%" stopColor="#6D28D9" /><stop offset="100%" stopColor="#C084FC" /></linearGradient>
        <linearGradient id="dg_lut" x1="0%" y1="0%" x2="100%"><stop offset="0%" stopColor="#B45309" /><stop offset="100%" stopColor="#FDE68A" /></linearGradient>
        <filter id="dg_glow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="dg_shadow"><feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#00000020" /></filter>
      </defs>
      {/* Background track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F1F5F9" strokeWidth={sw} />
      {/* Inner depth ring */}
      <circle cx={cx} cy={cy} r={r - 12} fill="none" stroke="#F8FAFC" strokeWidth={4} />
      {/* Phase arcs */}
      <path d={arcPath(1, periodLength)} fill="none" stroke="url(#dg_per)" strokeWidth={sw} strokeLinecap="round" />
      {showFertility ? (
        <>
          {periodLength + 1 < fS && <path d={arcPath(periodLength + 1, fS - 1)} fill="none" stroke="url(#dg_fol)" strokeWidth={sw} strokeLinecap="round" opacity="0.7" />}
          <path d={arcPath(fS, fE)} fill="none" stroke="url(#dg_fer)" strokeWidth={sw + 2} strokeLinecap="round" />
          {fE + 1 <= total && <path d={arcPath(fE + 1, total)} fill="none" stroke="url(#dg_lut)" strokeWidth={sw} strokeLinecap="round" opacity="0.7" />}
          {/* Ovulation diamond marker */}
          {(() => { const a = ((ov - 0.5) / total) * 360 - 90, rd = (a * Math.PI) / 180, ox = cx + r * Math.cos(rd), oy = cy + r * Math.sin(rd); return <polygon points={`${ox},${oy-6} ${ox+5},${oy} ${ox},${oy+6} ${ox-5},${oy}`} fill="#7C3AED" stroke="white" strokeWidth="1.5" />; })()}
        </>
      ) : (
        <>
          {/* Periods-only: 3 phases without fertile window highlight */}
          {periodLength + 1 < total - (luteal || 13) && <path d={arcPath(periodLength + 1, total - (luteal || 13))} fill="none" stroke="url(#dg_fol)" strokeWidth={sw} strokeLinecap="round" opacity="0.7" />}
          {total - (luteal || 13) + 1 <= total && <path d={arcPath(total - (luteal || 13) + 1, total)} fill="none" stroke="url(#dg_lut)" strokeWidth={sw} strokeLinecap="round" opacity="0.7" />}
        </>
      )}
      {/* Day position dot */}
      <g filter="url(#dg_shadow)">
        <circle cx={cx + r * Math.cos(dR)} cy={cy + r * Math.sin(dR)} r={13} fill="white" stroke={theme.color} strokeWidth="3" />
        <text x={cx + r * Math.cos(dR)} y={cy + r * Math.sin(dR) + 1} textAnchor="middle" dominantBaseline="central" fill={theme.color} fontSize="9" fontWeight="800">{day}</text>
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
  <div className="bg-white rounded-3xl shadow-lg overflow-hidden animate-pulse">
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
  const [water, setWater] = useState(0);
  const [sleepHours, setSleepHours] = useState(0);
  const [exerciseDone, setExerciseDone] = useState(false);
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [showSleepPicker, setShowSleepPicker] = useState(false);
  const [showMoodSheet, setShowMoodSheet] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [dashLoading, setDashLoading] = useState(true);
  const [tipIdx, setTipIdx] = useState(0);
  const [carouselDoctors, setCarouselDoctors] = useState<CarouselDoctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [predictionData, setPredictionData] = useState<any>(null);
  const [ayurvedaData, setAyurvedaData] = useState<any>(null);

  const theme = phaseThemes[phase] || phaseThemes.follicular;
  // Use individual luteal phase from API (Lenton 1984), fallback to old estimate
  const lutealPhase = predictionData?.lutealPhase || 13;
  const ovDay = predictionData?.ovulationDay || (cycleLength - lutealPhase);
  const fertStart = Math.max(1, ovDay - 5);
  const fertEnd = Math.min(cycleLength, ovDay + 1);
  const isFertile = cycleDay >= fertStart && cycleDay <= fertEnd;
  const isOvToday = cycleDay === ovDay;
  const daysToOv = ovDay > cycleDay ? ovDay - cycleDay : 0;
  const pmsStart = Math.max(1, cycleLength - 7);
  const daysToPMS = pmsStart > cycleDay ? pmsStart - cycleDay : 0;

  // Use Wilcox et al. 1995 day-specific rates from API when available
  const conception = useMemo(() => {
    if (predictionData?.fertilityScore !== undefined) {
      const score = predictionData.fertilityScore;
      const status = predictionData.fertilityStatus;
      return {
        pct: score,
        label: status === 'peak' ? 'Peak' : status === 'high' ? 'High' : status === 'moderate' ? 'Moderate' : score <= 5 ? 'Very Low' : 'Low',
      };
    }
    // Fallback to local calculation
    const diff = Math.abs(cycleDay - ovDay);
    if (diff === 0) return { pct: 33, label: 'Very High' };
    if (diff === 1) return { pct: 26, label: 'High' };
    if (diff === 2) return { pct: 18, label: 'Moderate' };
    if (diff === 3) return { pct: 10, label: 'Low' };
    if (diff <= 5) return { pct: 5, label: 'Very Low' };
    return { pct: 1, label: 'Minimal' };
  }, [cycleDay, ovDay, predictionData]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  // Wellness score
  const wellnessScore = Math.round(
    (water / 8) * 25 + (mood ? 25 : 0) + (exerciseDone ? 25 : 0) + (sleepHours > 0 ? 25 : 0)
  );

  // Phase tip (rotating) — goal-aware: periods get no fertility refs, wellness gets health tips
  const tips = goal === 'wellness' ? wellnessTips : goal === 'periods' ? (periodTips[phase] || periodTips.follicular) : (phaseTips[phase] || phaseTips.follicular);
  useEffect(() => {
    const t = setInterval(() => setTipIdx(i => (i + 1) % tips.length), 4000);
    return () => clearInterval(t);
  }, [phase, tips.length, goal]);

  useEffect(() => {
    userAPI.me().then(res => {
      const p = res.data.data || res.data;
      if (p && user) useAuthStore.getState().setUser({ ...user, fullName: p.fullName || user.fullName, email: p.email || user.email, role: p.role || user.role, avatarUrl: p.avatarUrl || user.avatarUrl, phone: p.phone || user.phone });
    }).catch(() => {});
    cycleAPI.predict().then(r => {
      const d = r.data.data;
      if (d && typeof d.cycleDay === 'number') {
        set({ cycleDay: d.cycleDay, phase: d.phase, daysUntilPeriod: d.daysUntilPeriod, cycleLength: d.cycleLength || 28, periodLength: d.periodLength || 5, hasRealData: true });
        setPredictionData(d); // Store full prediction for advanced features
      } else { set({ hasRealData: false }); }
    }).catch(() => {}).finally(() => setDashLoading(false));
    // Load Ayurvedic insights for personalized dashboard
    cycleAPI.getAyurvedicInsights().then(r => {
      setAyurvedaData(r?.data?.data || null);
    }).catch(() => {});
    // Auto-detect location for weather-based Ayurvedic adjustments
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          weatherAPI.saveLocation(pos.coords.latitude, pos.coords.longitude).catch(() => {});
        },
        () => {}, // User denied — silently skip, will use seasonal fallback
        { timeout: 5000, maximumAge: 30 * 60 * 1000 }
      );
    }
    // Load today's wellness data — restore all logged items after refresh
    wellnessAPI.dailyScore().then(r => {
      const d = r?.data?.data || r?.data;
      if (d?.components?.water?.glasses !== undefined) setWater(d.components.water.glasses);
      if (d?.components?.mood?.logged && d.components.mood.value) setMood(d.components.mood.value);
      if (d?.components?.sleep?.logged) setSleepHours(d.components.sleep.hours || 7);
      if (d?.components?.exercise?.logged) setExerciseDone(true);
    }).catch(() => {});
    // Load real notification count
    notificationAPI.list().then(r => {
      setNotifCount(r.data.unreadCount || 0);
    }).catch(() => {});
    // Load top doctors for carousel
    doctorAPI.search({ isPublished: true, limit: 10 }).then(r => {
      const raw = r?.data?.data || r?.data?.doctors || r?.data || [];
      const items = Array.isArray(raw) ? raw : [];
      const mapped: CarouselDoctor[] = items.map((d: any) => ({
        id: d._id || d.id,
        fullName: d.fullName || d.name || '',
        specialization: d.specialization || '',
        rating: d.rating || 0,
        totalReviews: d.totalReviews || d.reviews || 0,
        experienceYears: d.experienceYears || d.experience || 0,
        avatarUrl: d.avatarUrl || d.photoUrl || undefined,
        photoUrl: d.photoUrl || d.avatarUrl || undefined,
        hospitalName: d.hospitalName || d.city || undefined,
        consultationFee: d.consultationFee || d.fee || undefined,
        isVerified: d.isVerified ?? d.isAvailable !== false,
        isChief: d.isChief || false,
      }));
      setCarouselDoctors(mapped);
    }).catch(() => {}).finally(() => setDoctorsLoading(false));
  }, [user]);

  const logMood = (key: string) => {
    setMood(key);
    setShowMoodSheet(false);
    moodAPI.log({ mood: key }).then(() => toast.success('Mood logged! 😊')).catch(() => {});
  };

  const logWater = (glasses: number) => {
    setWater(glasses);
    wellnessAPI.log({ type: 'water', value: glasses }).catch(() => {});
  };

  const logSleep = (hours: number) => {
    setSleepHours(hours);
    setShowSleepPicker(false);
    wellnessAPI.log({ type: 'sleep', value: hours }).then(() => toast.success(`${hours}h sleep logged! 😴`)).catch(() => {});
  };

  const logExercise = () => {
    setExerciseDone(true);
    wellnessAPI.log({ type: 'exercise', value: 1 }).then(() => toast.success('Exercise logged! 💪')).catch(() => {});
  };

  const goalLabels: Record<UserGoal, { emoji: string; label: string; short: string }> = {
    periods: { emoji: '🌺', label: 'Period Tracking', short: 'Periods' },
    fertility: { emoji: '💜', label: 'Trying to Conceive', short: 'TTC' },
    pregnancy: { emoji: '🤰', label: 'Pregnancy', short: 'Pregnant' },
    wellness: { emoji: '🧘', label: 'Wellness & Health', short: 'Wellness' },
  };
  const curGoal = goalLabels[goal] || goalLabels.periods;

  const onboardingContent: Record<string, { emoji: string; desc: string; features: string[]; btnLabel: string; btnPath: string; bg: string; accent: string; gradient: string }> = {
    periods: { emoji: '🌸', desc: 'Log your first period to unlock personalized predictions and phase insights.', features: ['🩸 Current cycle day & phase', '🌙 PMS alerts & reminders', '📅 Next period countdown', '🧬 Hormone insights'], btnLabel: '🩸 Log Your First Period', btnPath: '/tracker', bg: 'bg-rose-50', accent: 'text-rose-700', gradient: 'linear-gradient(135deg,#E11D48,#F43F5E)' },
    fertility: { emoji: '💜', desc: 'Log your first period to unlock ovulation predictions and fertility tracking.', features: ['✨ Ovulation predictions', '💜 Fertile window tracking', '🧬 LH & FSH hormone levels', '📅 Conception chance %'], btnLabel: '💜 Start Fertility Tracking', btnPath: '/tracker', bg: 'bg-purple-50', accent: 'text-purple-700', gradient: 'linear-gradient(135deg,#7C3AED,#8B5CF6)' },
    wellness: { emoji: '🧘', desc: 'Log your first period to get cycle-aware wellness insights tailored to your body.', features: ['💧 Daily hydration tracking', '😴 Sleep & energy insights', '🧘 Personalized wellness score', '🌿 Ayurvedic recommendations'], btnLabel: '🧘 Get Started', btnPath: '/tracker', bg: 'bg-emerald-50', accent: 'text-emerald-700', gradient: 'linear-gradient(135deg,#059669,#10B981)' },
    pregnancy: { emoji: '🤰', desc: 'Track your pregnancy journey with weekly updates.', features: ['🤰 Weekly pregnancy updates', '📋 Trimester milestones', '👩‍⚕️ Doctor appointments', '🏥 Hospital planning'], btnLabel: '🤰 Start Pregnancy Tracking', btnPath: '/pregnancy', bg: 'bg-violet-50', accent: 'text-violet-700', gradient: 'linear-gradient(135deg,#7C3AED,#EC4899)' },
  };
  const onb = onboardingContent[goal] || onboardingContent.periods;

  const OnboardingCard = () => (
    <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
      <div className="p-6 text-center">
        <span className="text-5xl">{onb.emoji}</span>
        <h2 className="text-lg font-extrabold text-gray-900 mt-3">Welcome to VedaClue!</h2>
        <p className="text-xs text-gray-500 mt-2 leading-relaxed">{onb.desc}</p>
        <div className={`mt-4 ${onb.bg} rounded-2xl p-4 text-left`}>
          <p className={`text-[11px] ${onb.accent} font-bold mb-2`}>After getting started you'll see:</p>
          {onb.features.map(i => (
            <p key={i} className={`text-[10px] ${onb.accent.replace('700', '600')} mb-1`}>{i}</p>
          ))}
        </div>
        <button onClick={() => nav(onb.btnPath)} className="w-full mt-4 py-3.5 rounded-2xl text-white font-bold text-sm active:scale-95 transition-transform" style={{ background: onb.gradient }}>
          {onb.btnLabel}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-28 bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      {/* ─── Header ─── */}
      <div className="sticky top-0 z-20 backdrop-blur-xl border-b border-rose-100" style={{ backgroundColor: 'rgba(255,241,242,0.85)' }}>
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
            <button onClick={() => nav('/notifications')} className="relative w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center active:scale-95 transition-transform text-sm">
              🔔
              {notifCount > 0 && <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center"><span className="text-[7px] text-white font-extrabold">{notifCount}</span></div>}
            </button>
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-4">

        {/* ─── Quick Log Strip ─── */}
        <div className="bg-white rounded-3xl p-3 shadow-lg">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">Quick Log</p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { e: '💧', l: 'Water', val: water + '/8', action: () => logWater(Math.min(8, water + 1)), done: water >= 8 },
              { e: '😴', l: 'Sleep', val: sleepHours > 0 ? sleepHours + 'h' : 'Log', action: () => setShowSleepPicker(true), done: sleepHours > 0 },
              { e: '🏃', l: 'Exercise', val: exerciseDone ? 'Done ✓' : 'Log', action: logExercise, done: exerciseDone },
              { e: '😊', l: 'Mood', val: mood && mood !== 'LOGGED' ? moods.find(m => m.key === mood)?.l || '✓' : mood === 'LOGGED' ? '✓' : 'Log', action: () => setShowMoodSheet(true), done: !!mood },
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
            {/* ── PERIODS Hero: Cycle ring focused on period tracking (no fertility markers) ── */}
            {goal === 'periods' && (
              <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
                <div className="h-1.5 w-full" style={{ background: theme.gradient }} />
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base" style={{ backgroundColor: theme.bg }}>{theme.emoji}</div>
                      <div>
                        <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">Current Phase</p>
                        <p className="text-sm font-extrabold" style={{ color: theme.color }}>{theme.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">Next Period</p>
                      <p className="text-sm font-extrabold text-rose-600">{daysUntilPeriod}d away</p>
                    </div>
                  </div>
                  <div className="relative w-56 h-56 mx-auto mb-4">
                    <CycleHeroRing day={cycleDay} total={cycleLength} phase={phase} periodLength={periodLength} luteal={lutealPhase} showFertility={false} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-5xl font-black leading-none" style={{ color: theme.color }}>{cycleDay}</span>
                      <span className="text-xl mt-0.5">{theme.emoji}</span>
                      <span className="text-[9px] font-bold uppercase tracking-widest mt-0.5" style={{ color: theme.color }}>Day {cycleDay} of {cycleLength}</span>
                      <span className="text-[8px] text-gray-400 mt-0.5 text-center px-8 leading-tight">{theme.msg}</span>
                    </div>
                  </div>
                  {/* 3-phase legend: Period, Follicular, Luteal (no fertile window) */}
                  <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                    {[
                      { c: '#BE123C', l: 'Period', days: `Day 1\u2013${periodLength}` },
                      { c: '#059669', l: 'Follicular', days: `Day ${periodLength + 1}\u2013${cycleLength - (lutealPhase || 13)}` },
                      { c: '#D97706', l: 'Luteal', days: `Day ${cycleLength - (lutealPhase || 13) + 1}\u2013${cycleLength}` },
                    ].map(p => (
                      <div key={p.l} className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl" style={{ backgroundColor: p.c + '15' }}>
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.c }} />
                        <div>
                          <p className="text-[9px] font-bold" style={{ color: p.c }}>{p.l}</p>
                          <p className="text-[8px] text-gray-400">{p.days}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── WELLNESS Hero: Wellness score front-and-center, cycle phase as secondary ── */}
            {goal === 'wellness' && (
              <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
                <div className="h-1.5 w-full" style={{ background: 'linear-gradient(135deg,#10B981,#34D399,#6EE7B7)' }} />
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">Today's Wellness</p>
                      <p className="text-sm font-extrabold text-gray-800">Daily Health Score</p>
                    </div>
                    {hasRealData && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ backgroundColor: theme.bg }}>
                        <span className="text-xs">{theme.emoji}</span>
                        <span className="text-[9px] font-bold" style={{ color: theme.color }}>{theme.name}</span>
                      </div>
                    )}
                  </div>
                  {/* Large wellness ring */}
                  <div className="flex flex-col items-center mb-4">
                    <div className="relative w-40 h-40">
                      <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
                        <circle cx="80" cy="80" r="65" fill="none" stroke="#F1F5F9" strokeWidth="14" />
                        <circle cx="80" cy="80" r="65" fill="none" stroke={wellnessScore >= 75 ? '#10B981' : wellnessScore >= 50 ? '#F59E0B' : '#E11D48'} strokeWidth="14" strokeDasharray={2 * Math.PI * 65} strokeDashoffset={2 * Math.PI * 65 * (1 - wellnessScore / 100)} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-black" style={{ color: wellnessScore >= 75 ? '#10B981' : wellnessScore >= 50 ? '#F59E0B' : '#E11D48' }}>{wellnessScore}</span>
                        <span className="text-[10px] font-bold text-gray-400">out of 100</span>
                      </div>
                    </div>
                  </div>
                  {/* 4 wellness metrics */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { e: '💧', l: 'Water', v: water + '/8', done: water >= 6, c: '#3B82F6' },
                      { e: '😊', l: 'Mood', v: mood ? '✓' : '—', done: !!mood, c: '#EC4899' },
                      { e: '🏃', l: 'Exercise', v: exerciseDone ? '✓' : '—', done: exerciseDone, c: '#F59E0B' },
                      { e: '😴', l: 'Sleep', v: sleepHours > 0 ? sleepHours + 'h' : '—', done: sleepHours > 0, c: '#8B5CF6' },
                    ].map(m => (
                      <div key={m.l} className="text-center">
                        <span className="text-lg block">{m.e}</span>
                        <span className={'text-[10px] font-extrabold block ' + (m.done ? '' : 'text-gray-300')} style={m.done ? { color: m.c } : {}}>{m.v}</span>
                        <span className="text-[8px] text-gray-400">{m.l}</span>
                      </div>
                    ))}
                  </div>
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

        {/* ─── Horizontal Scroll Prediction Cards (goal-specific) ─── */}
        {hasRealData && goal !== 'pregnancy' && (
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {(goal === 'periods' ? [
              /* PERIODS: Only period-relevant predictions — no ovulation/fertile window */
              { e: '🌸', l: 'Next Period', v: daysUntilPeriod + ' days', sub: 'away', g: 'linear-gradient(135deg,#E11D48,#F43F5E)' },
              { e: '📅', l: 'Cycle Day', v: 'Day ' + cycleDay, sub: 'of ' + cycleLength, g: 'linear-gradient(135deg,#059669,#10B981)' },
              { e: '🌙', l: 'PMS Warning', v: daysToPMS > 0 ? daysToPMS + ' days' : 'Active', sub: daysToPMS > 0 ? 'away' : 'self-care time', g: 'linear-gradient(135deg,#D97706,#F59E0B)' },
              { e: '🔄', l: 'Cycle Length', v: cycleLength + ' days', sub: 'average', g: 'linear-gradient(135deg,#6366F1,#818CF8)' },
            ] : goal === 'fertility' ? [
              /* FERTILITY: All fertility-relevant predictions */
              { e: '⭐', l: 'Ovulation', v: daysToOv > 0 ? daysToOv + ' days' : isOvToday ? 'Today!' : 'Passed', sub: daysToOv > 0 ? 'away' : '', g: 'linear-gradient(135deg,#7C3AED,#8B5CF6)' },
              { e: '💚', l: 'Fertile Window', v: 'Day ' + fertStart, sub: '– Day ' + fertEnd, g: 'linear-gradient(135deg,#059669,#10B981)' },
              { e: '💜', l: 'Conception', v: conception.pct + '%', sub: conception.label, g: 'linear-gradient(135deg,#EC4899,#F472B6)' },
              { e: '🌸', l: 'Next Period', v: daysUntilPeriod + ' days', sub: 'away', g: 'linear-gradient(135deg,#E11D48,#F43F5E)' },
            ] : [
              /* WELLNESS: Daily wellness metrics instead of cycle predictions */
              { e: '💧', l: 'Hydration', v: water + '/8', sub: water >= 6 ? 'on track!' : 'drink more', g: water >= 6 ? 'linear-gradient(135deg,#3B82F6,#60A5FA)' : 'linear-gradient(135deg,#94A3B8,#CBD5E1)' },
              { e: '😊', l: 'Mood', v: mood ? (moods.find(m => m.key === mood)?.l || 'Logged') : 'Not logged', sub: mood ? 'today' : 'tap to log', g: mood ? 'linear-gradient(135deg,#EC4899,#F472B6)' : 'linear-gradient(135deg,#94A3B8,#CBD5E1)' },
              { e: '😴', l: 'Sleep', v: sleepHours > 0 ? sleepHours + 'h' : '—', sub: sleepHours >= 7 ? 'well rested' : sleepHours > 0 ? 'need more' : 'not logged', g: sleepHours >= 7 ? 'linear-gradient(135deg,#8B5CF6,#A78BFA)' : 'linear-gradient(135deg,#94A3B8,#CBD5E1)' },
              { e: '🏃', l: 'Exercise', v: exerciseDone ? 'Done!' : 'Not yet', sub: exerciseDone ? 'great job' : 'stay active', g: exerciseDone ? 'linear-gradient(135deg,#F59E0B,#FBBF24)' : 'linear-gradient(135deg,#94A3B8,#CBD5E1)' },
            ]).map(c => (
              <div key={c.l} className="flex-shrink-0 w-28 rounded-2xl p-3 text-white shadow-sm" style={{ background: c.g }}>
                <span className="text-lg block mb-1.5">{c.e}</span>
                <p className="text-[8px] text-white/70 font-bold uppercase">{c.l}</p>
                <p className="text-base font-extrabold leading-tight">{c.v}</p>
                {c.sub && <p className="text-[8px] text-white/70">{c.sub}</p>}
              </div>
            ))}
          </div>
        )}

        {/* ─── Doctor/Admin Quick Access — Role Switcher ─── */}
        {(user?.role === 'DOCTOR' || user?.role === 'ADMIN') && (
          <div className="bg-white rounded-3xl p-3 shadow-lg border border-gray-100/50">
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]" />
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">You're viewing as User</p>
            </div>
            <div className="flex gap-2">
              {/* Current: User View (active) */}
              <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-gradient-to-r from-rose-50 to-pink-50 border-2 border-rose-200">
                <span className="text-lg">👤</span>
                <div>
                  <p className="text-[11px] font-bold text-rose-700">User Mode</p>
                  <p className="text-[8px] text-rose-400">Health & Wellness</p>
                </div>
              </div>
              {/* Switch to Doctor/Admin */}
              <button onClick={() => nav(user?.role === 'ADMIN' ? '/admin' : '/doctor-dashboard')}
                className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 active:scale-[0.97] transition-transform shadow-md shadow-indigo-200">
                <span className="text-lg">{user?.role === 'ADMIN' ? '🛡️' : '🩺'}</span>
                <div>
                  <p className="text-[11px] font-extrabold text-white">{user?.role === 'ADMIN' ? 'Admin' : 'Doctor'}</p>
                  <p className="text-[8px] text-white/60">{user?.role === 'ADMIN' ? 'Manage app' : 'Portal'} →</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ─── Quick Actions Row 1 (goal-specific) ─── */}
        <div className="grid grid-cols-4 gap-2.5">
          {(goal === 'periods' ? [
            { l: 'Tracker', p: '/tracker', bg: '#FFF1F2', e: '📅', c: '#E11D48' },
            { l: 'Symptoms', p: '/tracker', bg: '#FEF3C7', e: '📝', c: '#D97706' },
            { l: 'Ayurveda', p: '/ayurveda', bg: '#ECFDF5', e: '🌿', c: '#059669' },
            { l: 'Doctors', p: '/doctors', bg: '#EFF6FF', e: '👩‍⚕️', c: '#2563EB' },
          ] : goal === 'wellness' ? [
            { l: 'Wellness', p: '/wellness', bg: '#ECFDF5', e: '🧘', c: '#059669' },
            { l: 'Ayurveda', p: '/ayurveda', bg: '#F5F3FF', e: '🌿', c: '#7C3AED' },
            { l: 'Programs', p: '/programs', bg: '#FEF3C7', e: '🎯', c: '#D97706' },
            { l: 'Doctors', p: '/doctors', bg: '#EFF6FF', e: '👩‍⚕️', c: '#2563EB' },
          ] : goal === 'fertility' ? [
            { l: 'Tracker', p: '/tracker', bg: '#F5F3FF', e: '💜', c: '#7C3AED' },
            { l: 'Ayurveda', p: '/ayurveda', bg: '#ECFDF5', e: '🌿', c: '#059669' },
            { l: 'Wellness', p: '/wellness', bg: '#FEF3C7', e: '🧘', c: '#D97706' },
            { l: 'Doctors', p: '/doctors', bg: '#EFF6FF', e: '👩‍⚕️', c: '#2563EB' },
          ] : [
            { l: 'Pregnancy', p: '/pregnancy', bg: '#F5F3FF', e: '🤰', c: '#7C3AED' },
            { l: 'Doctors', p: '/doctors', bg: '#EFF6FF', e: '👩‍⚕️', c: '#2563EB' },
            { l: 'Wellness', p: '/wellness', bg: '#FEF3C7', e: '🧘', c: '#D97706' },
            { l: 'Hospitals', p: '/hospitals', bg: '#FFF1F2', e: '🏥', c: '#E11D48' },
          ]).map(a => (
            <button key={a.l} onClick={() => nav(a.p)} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm" style={{ backgroundColor: a.bg }}>{a.e}</div>
              <span className="text-[10px] font-bold" style={{ color: a.c }}>{a.l}</span>
            </button>
          ))}
        </div>

        {/* ─── Quick Actions Row 2 (goal-aware to avoid duplication) ─── */}
        <div className="grid grid-cols-4 gap-2.5">
          {(goal === 'wellness' ? [
            /* Wellness Row 1 already has Programs — swap with Tracker */
            { l: 'Community', p: '/community', bg: '#FDF2F8', e: '💬', c: '#DB2777' },
            { l: 'Tracker', p: '/tracker', bg: '#FFF1F2', e: '📅', c: '#E11D48' },
            { l: 'Articles', p: '/articles', bg: '#FFF7ED', e: '📰', c: '#EA580C' },
            { l: 'Appointments', p: '/appointments', bg: '#EFF6FF', e: '📋', c: '#2563EB' },
          ] : [
            { l: 'Community', p: '/community', bg: '#FDF2F8', e: '💬', c: '#DB2777' },
            { l: 'Programs', p: '/programs', bg: '#F5F3FF', e: '🎯', c: '#7C3AED' },
            { l: 'Articles', p: '/articles', bg: '#FFF7ED', e: '📰', c: '#EA580C' },
            { l: 'Appointments', p: '/appointments', bg: '#EFF6FF', e: '📋', c: '#2563EB' },
          ]).map(a => (
            <button key={a.l} onClick={() => nav(a.p)} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm" style={{ backgroundColor: a.bg }}>{a.e}</div>
              <span className="text-[10px] font-bold" style={{ color: a.c }}>{a.l}</span>
            </button>
          ))}
        </div>

        {/* ─── Top Doctors Carousel ─── */}
        <DoctorCarousel
          title={goal === 'fertility' ? 'Fertility Specialists' : goal === 'pregnancy' ? 'OB-GYN Specialists' : goal === 'wellness' ? 'Wellness Experts' : 'Top Doctors'}
          doctors={carouselDoctors}
          loading={doctorsLoading}
          onBookNow={(doctor) => nav('/doctors')}
        />

        {/* ─── Phase Insight + Daily Tip (goal-aware) ─── */}
        {hasRealData && (goal === 'periods' || goal === 'fertility') && (
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
        {/* Wellness gets health-focused daily insight instead of phase card */}
        {goal === 'wellness' && (
          <div className="rounded-2xl p-4 border" style={{ backgroundColor: '#ECFDF5', borderColor: '#10B98120' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🌿</span>
              <h3 className="text-sm font-bold text-emerald-700">Daily Wellness Tip</h3>
            </div>
            <div className="bg-white/70 rounded-xl p-3 min-h-[48px] transition-all">
              <p className="text-[11px] text-gray-700 leading-relaxed">💡 {tips[tipIdx]}</p>
            </div>
            {hasRealData && <p className="text-[9px] text-gray-400 mt-2">You're in your {theme.name.toLowerCase()} phase — {theme.msg.toLowerCase()}</p>}
          </div>
        )}

        {/* ─── Your Body Today (API-powered hormones) — hidden for wellness, filtered for periods ─── */}
        {hasRealData && (goal === 'periods' || goal === 'fertility') && (
          <div className="bg-white rounded-3xl p-4 shadow-lg">
            <h3 className="text-xs font-extrabold text-gray-800 mb-3">{goal === 'fertility' ? '🧬 Your Body Today' : '🧬 How Your Hormones Affect You'}</h3>
            {(() => {
              const h = predictionData?.hormones;
              const allHormones = [
                { name: 'Estrogen', emoji: '💗', pct: h?.estrogen ?? (theme.hormoneE === 'Low' ? 15 : theme.hormoneE === 'Rising' ? 55 : theme.hormoneE === 'Peak' ? 90 : 35), color: '#EC4899', desc: h?.estrogen >= 70 ? 'High — skin glows, energy up' : h?.estrogen >= 40 ? 'Rising — building up' : 'Low — recovery phase', forPeriods: true },
                { name: 'Progesterone', emoji: '🟡', pct: h?.progesterone ?? (theme.hormoneP === 'Low' ? 10 : theme.hormoneP === 'Rising' ? 40 : theme.hormoneP === 'High' ? 80 : 50), color: '#F59E0B', desc: h?.progesterone >= 70 ? 'High — body temp up, calming' : h?.progesterone >= 30 ? 'Moderate — stabilizing' : 'Low — pre-follicular', forPeriods: true },
                { name: 'LH (Ovulation trigger)', emoji: '⚡', pct: h?.lh ?? 10, color: '#7C3AED', desc: h?.lh >= 70 ? 'SURGE — ovulation imminent!' : h?.lh >= 30 ? 'Rising — watch for peak' : 'Baseline', forPeriods: false },
                { name: 'FSH', emoji: '🧪', pct: h?.fsh ?? 15, color: '#2563EB', desc: h?.fsh >= 50 ? 'Elevated — follicle stimulation' : 'Baseline', forPeriods: false },
              ];
              // Periods: show only Estrogen & Progesterone. Fertility: show all 4.
              const hormones = goal === 'periods' ? allHormones.filter(h => h.forPeriods) : allHormones;
              return hormones.map(item => (
                <div key={item.name} className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5"><span className="text-xs">{item.emoji}</span><span className="text-[10px] font-bold text-gray-700">{item.name}</span></div>
                    <span className="text-[9px] font-bold" style={{ color: item.color }}>{item.pct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full transition-all duration-700" style={{ width: item.pct + '%', backgroundColor: item.color }} />
                  </div>
                  <p className="text-[9px] text-gray-400 mt-0.5">{item.desc}</p>
                </div>
              ));
            })()}
            <p className="text-[9px] text-gray-400 mt-1 italic">Estimated from your cycle day {cycleDay}, {phase} phase (Speroff & Fritz endocrinology model)</p>
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
        <div className="bg-white rounded-3xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-gray-800">How are you feeling? 💭</h3>
            <button onClick={() => nav('/mood/history')}
              className="flex items-center gap-1 bg-rose-50 px-2 py-1 rounded-xl border border-rose-100 active:scale-95 transition-transform">
              <span className="text-[9px] font-extrabold text-rose-600">📊 History</span>
            </button>
          </div>
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
        <div className="bg-white rounded-3xl p-4 shadow-lg">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-bold text-gray-800">💧 Hydration</h3>
            <div className="flex items-center gap-1.5"><span className="text-xs font-extrabold text-blue-600">{water}</span><span className="text-[10px] text-gray-400">/ 8 glasses</span></div>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <button key={i} onClick={() => logWater(i < water ? i : i + 1)}
                className={'flex-1 h-10 rounded-lg flex items-center justify-center transition-all active:scale-90 ' + (i < water ? '' : 'bg-gray-100')}
                style={i < water ? { backgroundColor: `rgba(59,130,246,${0.15 + (i / 8) * 0.4})` } : {}}>
                <span className={'text-sm ' + (i < water ? 'text-blue-600' : 'text-gray-300')}>💧</span>
              </button>
            ))}
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2.5"><div className="bg-gradient-to-r from-blue-400 to-blue-600 h-1.5 rounded-full transition-all" style={{ width: (water / 8 * 100) + '%' }} /></div>
        </div>

        {/* ─── Wellness Score (hidden for wellness goal — already in hero) ─── */}
        {goal !== 'wellness' && <div className="bg-white rounded-3xl p-4 shadow-lg">
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
        </div>}

        {/* ─── Ayurvedic Daily Insight (personalized) ─── */}
        {ayurvedaData?.dailyTip ? (
          <div className="rounded-3xl p-4 shadow-lg border" style={{
            backgroundColor: ayurvedaData.dosha === 'Vata' ? '#F5F3FF' : ayurvedaData.dosha === 'Pitta' ? '#FFF7ED' : '#ECFDF5',
            borderColor: ayurvedaData.dosha === 'Vata' ? '#DDD6FE' : ayurvedaData.dosha === 'Pitta' ? '#FED7AA' : '#A7F3D0',
          }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{ayurvedaData.dailyTip.emoji}</span>
              <div className="flex-1">
                <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: ayurvedaData.dosha === 'Vata' ? '#7C3AED' : ayurvedaData.dosha === 'Pitta' ? '#EA580C' : '#059669' }}>
                  {ayurvedaData.dosha} • {ayurvedaData.dailyTip.category}
                </p>
                <p className="text-sm font-extrabold text-gray-800">{ayurvedaData.dailyTip.title}</p>
              </div>
            </div>
            <p className="text-[11px] text-gray-600 leading-relaxed">{ayurvedaData.dailyTip.body}</p>
            <button onClick={() => nav('/tracker')} className="mt-2.5 text-[10px] font-bold active:scale-95 transition-transform" style={{ color: ayurvedaData.dosha === 'Vata' ? '#7C3AED' : ayurvedaData.dosha === 'Pitta' ? '#EA580C' : '#059669' }}>
              See full Ayurvedic insights →
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-4 shadow-lg">
            <h3 className="text-xs font-bold text-gray-800 mb-2">💡 Daily Tip</h3>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              {!hasRealData && goal !== 'pregnancy' ? 'Log your first period to get personalized phase-based tips tailored to your body.' :
               goal === 'pregnancy' ? "Stay consistent with prenatal vitamins. Your baby needs 600μg of folate daily. Also ensure you're getting enough Vitamin D — 15 minutes of morning sunlight helps!" :
               tips[tipIdx]}
            </p>
          </div>
        )}

        {/* ─── Ayurvedic Phase Guidance Quick View ─── */}
        {ayurvedaData?.guidance && hasRealData && goal !== 'pregnancy' && (
          <div className="bg-white rounded-3xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-extrabold text-gray-800">🌿 Ayurvedic Care — {phase} phase</h3>
              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold" style={{
                backgroundColor: ayurvedaData.dosha === 'Vata' ? '#F5F3FF' : ayurvedaData.dosha === 'Pitta' ? '#FFF7ED' : '#ECFDF5',
                color: ayurvedaData.dosha === 'Vata' ? '#7C3AED' : ayurvedaData.dosha === 'Pitta' ? '#EA580C' : '#059669',
              }}>{ayurvedaData.dosha === 'Vata' ? '🌬️' : ayurvedaData.dosha === 'Pitta' ? '🔥' : '🌿'} {ayurvedaData.dosha}</span>
            </div>

            {/* Quick diet + herb highlights (first 2 each) */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-emerald-50 rounded-xl p-2.5">
                <p className="text-[9px] font-bold text-emerald-700 mb-1">🍽️ Eat</p>
                {ayurvedaData.guidance.diet?.slice(0, 2).map((d, i) => (
                  <p key={i} className="text-[10px] text-emerald-600 leading-relaxed mb-0.5">• {d.split('—')[0].trim()}</p>
                ))}
              </div>
              <div className="bg-purple-50 rounded-xl p-2.5">
                <p className="text-[9px] font-bold text-purple-700 mb-1">🌿 Herbs</p>
                {ayurvedaData.guidance.herbs?.slice(0, 2).map((h, i) => (
                  <p key={i} className="text-[10px] text-purple-600 leading-relaxed mb-0.5">• {h.split('—')[0].trim()}</p>
                ))}
              </div>
            </div>

            {/* Quick yoga + avoid */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-indigo-50 rounded-xl p-2.5">
                <p className="text-[9px] font-bold text-indigo-700 mb-1">🧘 Yoga</p>
                {ayurvedaData.guidance.yoga?.slice(0, 2).map((y, i) => (
                  <p key={i} className="text-[10px] text-indigo-600 leading-relaxed mb-0.5">• {y.split('—')[0].trim()}</p>
                ))}
              </div>
              <div className="bg-red-50 rounded-xl p-2.5">
                <p className="text-[9px] font-bold text-red-600 mb-1">⚠️ Avoid</p>
                {ayurvedaData.guidance.avoid?.slice(0, 3).map((a, i) => (
                  <p key={i} className="text-[10px] text-red-500 mb-0.5">• {a}</p>
                ))}
              </div>
            </div>

            {/* Modern science correlation */}
            <div className="bg-blue-50 rounded-xl p-2.5 mb-2">
              <p className="text-[9px] font-bold text-blue-700 mb-1">🔬 Science Says</p>
              <p className="text-[10px] text-blue-600 leading-relaxed">{ayurvedaData.guidance.modernCorrelation?.slice(0, 150)}...</p>
            </div>

            <button onClick={() => { nav('/tracker'); setTimeout(() => {}, 100); }}
              className="w-full text-center py-2 rounded-xl text-[10px] font-bold active:scale-95 transition-transform"
              style={{
                backgroundColor: ayurvedaData.dosha === 'Vata' ? '#F5F3FF' : ayurvedaData.dosha === 'Pitta' ? '#FFF7ED' : '#ECFDF5',
                color: ayurvedaData.dosha === 'Vata' ? '#7C3AED' : ayurvedaData.dosha === 'Pitta' ? '#EA580C' : '#059669',
              }}>
              View full Ayurvedic guidance →
            </button>
          </div>
        )}

        {/* ─── Prediction Confidence — hidden for wellness/pregnancy users ─── */}
        {predictionData?.confidence && hasRealData && (goal === 'periods' || goal === 'fertility') && (
          <div className="bg-white rounded-3xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-extrabold text-gray-800">📊 Prediction Confidence</h3>
              <span className={'text-[10px] font-bold px-2 py-0.5 rounded-full ' + (predictionData.confidence.score >= 70 ? 'bg-emerald-100 text-emerald-700' : predictionData.confidence.score >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700')}>
                {predictionData.confidence.score}% {predictionData.confidence.level.replace('_', ' ')}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 mb-3">
              <div className="h-2.5 rounded-full transition-all duration-700" style={{
                width: predictionData.confidence.score + '%',
                background: predictionData.confidence.score >= 70 ? 'linear-gradient(90deg,#10B981,#34D399)' : predictionData.confidence.score >= 40 ? 'linear-gradient(90deg,#F59E0B,#FBBF24)' : 'linear-gradient(90deg,#EF4444,#F87171)',
              }} />
            </div>
            <div className="space-y-1">
              {predictionData.confidence.factors?.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="text-emerald-500 text-[10px]">✓</span>
                  <span className="text-[10px] text-gray-500">{f}</span>
                </div>
              ))}
            </div>
            {predictionData.regularityScore !== undefined && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[10px] text-gray-500">Cycle regularity</span>
                <span className="text-[10px] font-bold text-gray-700">{predictionData.regularityScore}%</span>
              </div>
            )}
            {predictionData.cycleVariability !== undefined && (
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-gray-500">Cycle variability (SD)</span>
                <span className="text-[10px] font-bold text-gray-700">±{predictionData.cycleVariability} days</span>
              </div>
            )}
            {predictionData.lutealPhase && (
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-gray-500">Your luteal phase</span>
                <span className="text-[10px] font-bold text-gray-700">{predictionData.lutealPhase} days <span className="text-gray-400">(avg 12.4)</span></span>
              </div>
            )}
          </div>
        )}

        {/* ─── Conception Quick Card (TTC users) ─── */}
        {ayurvedaData?.conceptionGuide && hasRealData && (goal === 'fertility') && (
          <div className="rounded-3xl p-4 shadow-lg bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-200">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🤰</span>
              <div>
                <p className="text-[9px] font-bold text-pink-500 uppercase tracking-wider">Ritu Kala Conception Guide</p>
                <p className="text-sm font-extrabold text-gray-800">Ayurveda + Modern Science</p>
              </div>
            </div>
            <p className="text-[11px] text-gray-600 leading-relaxed mb-3">{ayurvedaData.conceptionGuide.rituKala}</p>
            <div className="bg-white/80 rounded-xl p-3 mb-2">
              <p className="text-[9px] font-bold text-pink-600 mb-1">Today's fertility score: {ayurvedaData.conceptionGuide.currentFertilityScore}%</p>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="h-2 rounded-full" style={{
                  width: ayurvedaData.conceptionGuide.currentFertilityScore + '%',
                  background: ayurvedaData.conceptionGuide.currentFertilityScore >= 50 ? 'linear-gradient(90deg,#EC4899,#F43F5E)' : 'linear-gradient(90deg,#D1D5DB,#9CA3AF)',
                }} />
              </div>
            </div>
            <button onClick={() => nav('/tracker')} className="w-full text-center py-2 rounded-xl bg-pink-100 text-[10px] font-bold text-pink-700 active:scale-95 transition-transform">
              Full conception guide →
            </button>
          </div>
        )}

        {/* ─── Weather-Based Ayurvedic Wisdom ─── */}
        {ayurvedaData?.weatherInsight && hasRealData && goal !== 'pregnancy' && (
          <div className="bg-sky-50 rounded-3xl p-4 shadow-sm border border-sky-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{ayurvedaData.weatherInsight.weather?.condition === 'rain' ? '🌧️' : ayurvedaData.weatherInsight.weather?.temperature > 30 ? '☀️' : ayurvedaData.weatherInsight.weather?.temperature < 15 ? '❄️' : '🌤️'}</span>
              <div>
                <p className="text-[9px] font-bold text-sky-500 uppercase tracking-wider">Weather-Based Ayurveda</p>
                <p className="text-xs font-extrabold text-sky-800">
                  {ayurvedaData.weatherInsight.weather?.city && `${ayurvedaData.weatherInsight.weather.city} • `}
                  {ayurvedaData.weatherInsight.weather?.temperature}°C • {ayurvedaData.weatherInsight.weather?.description}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-sky-600 font-semibold mb-1">Dosha risk: {ayurvedaData.weatherInsight.dominantDosha} ({ayurvedaData.weatherInsight.riskLevel})</p>
            {ayurvedaData.weatherInsight.adjustments?.slice(0, 2).map((adj, i) => (
              <p key={i} className="text-[11px] text-sky-700 leading-relaxed mb-1">• {adj}</p>
            ))}
            {ayurvedaData.weatherInsight.dietTips?.slice(0, 1).map((t, i) => (
              <p key={i} className="text-[10px] text-emerald-600 mt-1">🍽️ {t}</p>
            ))}
          </div>
        )}

        {/* ─── Seasonal Wisdom (fallback when no weather) ─── */}
        {!ayurvedaData?.weatherInsight && ayurvedaData?.seasonalAdjustment && hasRealData && goal !== 'pregnancy' && (
          <div className="bg-teal-50 rounded-3xl p-4 shadow-sm border border-teal-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🍃</span>
              <div>
                <p className="text-[9px] font-bold text-teal-500 uppercase tracking-wider">Seasonal Wisdom (Ritucharya)</p>
                <p className="text-xs font-extrabold text-teal-800">{ayurvedaData.seasonalAdjustment.currentRitu}</p>
              </div>
            </div>
            {ayurvedaData.seasonalAdjustment.adjustment?.slice(0, 2).map((adj, i) => (
              <p key={i} className="text-[11px] text-teal-700 leading-relaxed mb-1">• {adj}</p>
            ))}
          </div>
        )}

        {/* ─── Dosha Assessment CTA ─── */}
        {ayurvedaData && (!ayurvedaData.doshaScores || ayurvedaData.doshaScores?.confidence < 60) && (
          <button onClick={() => nav('/dosha-assessment')} className="w-full bg-gradient-to-r from-amber-50 to-rose-50 rounded-3xl p-4 shadow-sm border border-amber-200 text-left active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-3">
              <span className="text-2xl">☯️</span>
              <div className="flex-1">
                <p className="text-xs font-extrabold text-amber-800">Take Full Prakriti Assessment</p>
                <p className="text-[10px] text-amber-600 mt-0.5">22 questions for accurate dosha + dual dosha support</p>
              </div>
              <span className="text-amber-400">→</span>
            </div>
          </button>
        )}
      </div>

      {/* ─── Sleep Picker Modal ─── */}
      {showSleepPicker && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowSleepPicker(false)}>
          <div className="bg-white w-full max-w-[430px] rounded-t-3xl p-6" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <h3 className="text-base font-extrabold text-gray-900 mb-4">😴 How many hours did you sleep?</h3>
            <div className="grid grid-cols-4 gap-3">
              {[5, 6, 7, 8, 9, 10].map(h => (
                <button key={h} onClick={() => logSleep(h)}
                  className={'py-3 rounded-xl font-extrabold text-sm active:scale-95 transition-transform border-2 ' + (sleepHours === h ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-200 bg-gray-50 text-gray-700')}>
                  {h}h
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Mood Sheet ─── */}
      {showMoodSheet && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowMoodSheet(false)}>
          <div className="bg-white w-full max-w-[430px] rounded-t-3xl p-6" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <h3 className="text-base font-extrabold text-gray-900 mb-1">How are you feeling? 💭</h3>
            <p className="text-xs text-gray-400 mb-4">Tap to log your mood for today</p>
            <div className="grid grid-cols-5 gap-2">
              {moods.map(m => (
                <button key={m.key} onClick={() => logMood(m.key)}
                  className={'flex flex-col items-center gap-2 py-3 rounded-2xl border-2 active:scale-95 transition-all ' + (mood === m.key ? 'border-rose-400 bg-rose-50' : 'border-gray-100 bg-gray-50')}>
                  <span className="text-3xl">{m.e}</span>
                  <span className="text-[9px] font-bold text-gray-600">{m.l}</span>
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
            <h3 className="text-lg font-extrabold text-gray-900 mb-1">I'm using VedaClue to...</h3>
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
