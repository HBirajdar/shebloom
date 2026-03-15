import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCycleStore } from '../stores/cycleStore';
import type { UserGoal } from '../stores/cycleStore';
import { userAPI, cycleAPI } from '../services/api';
import toast from 'react-hot-toast';

const goals: { id: UserGoal; icon: string; label: string; desc: string }[] = [
  { id: 'periods', icon: '\u{1F33A}', label: 'Track Periods', desc: 'Monitor your monthly cycle' },
  { id: 'fertility', icon: '\u{1F495}', label: 'Trying to Conceive', desc: 'Fertility & ovulation tracking' },
  { id: 'pregnancy', icon: '\u{1F930}', label: 'Pregnancy', desc: 'Week-by-week pregnancy guide' },
  { id: 'wellness', icon: '\u{1F9D8}', label: 'Wellness', desc: 'Overall health & self-care' },
];
const topics = ['Period Tracking','Pregnancy','PCOD/PCOS','Yoga','Mental Health','Nutrition','Self Care','Fertility','Fitness','Sleep','Supplements','Ayurveda'];

interface PastPeriod {
  startDate: string;
  endDate: string;
  errors: { startDate?: string; endDate?: string };
}

function emptyPeriod(): PastPeriod {
  return { startDate: '', endDate: '', errors: {} };
}

export default function ProfileSetupPage() {
  const nav = useNavigate();
  const setCycleData = useCycleStore(s => s.setCycleData);
  const setGoal = useCycleStore(s => s.setGoal);
  const [step, setStep] = useState(0);
  const [goal, setGoalLocal] = useState<UserGoal | ''>('');
  const [cycle, setCycle] = useState(28);
  const [period, setPeriod] = useState(5);
  const [pregWeek, setPregWeek] = useState(12);
  const [sel, setSel] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  // Past periods state
  const [pastPeriods, setPastPeriods] = useState<PastPeriod[]>([emptyPeriod()]);
  const [periodsSaving, setPeriodsSaving] = useState(false);

  const toggle = (t: string) => setSel(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);
  const ovDay = cycle - 14;

  const showPastPeriodsStep = goal !== 'pregnancy' && goal !== '';
  const totalSteps = showPastPeriodsStep ? 4 : 3;
  const interestsStep = showPastPeriodsStep ? 3 : 2;
  const lastStep = totalSteps - 1;

  // ── Past periods helpers ──────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const twelveMonthsAgo = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);

  const updatePeriod = (idx: number, field: 'startDate' | 'endDate', value: string) => {
    setPastPeriods(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value, errors: { ...p.errors, [field]: undefined } } : p));
  };

  const removePeriod = (idx: number) => {
    setPastPeriods(prev => prev.length === 1 ? [emptyPeriod()] : prev.filter((_, i) => i !== idx));
  };

  const addPeriod = () => {
    if (pastPeriods.length < 3) setPastPeriods(prev => [...prev, emptyPeriod()]);
  };

  const validatePastPeriods = (): boolean => {
    // Filter out completely empty cards (user added but didn't fill)
    const filled = pastPeriods.filter(p => p.startDate);
    if (filled.length === 0) return true; // nothing to validate, will skip

    let valid = true;
    const updated = pastPeriods.map((p, idx) => {
      const errors: { startDate?: string; endDate?: string } = {};

      // Skip validation for empty cards
      if (!p.startDate && !p.endDate) return { ...p, errors };

      if (!p.startDate) {
        errors.startDate = 'Start date is required';
        valid = false;
      } else {
        if (p.startDate > today) {
          errors.startDate = 'Date cannot be in the future';
          valid = false;
        }
        if (p.startDate < twelveMonthsAgo) {
          errors.startDate = 'Must be within last 12 months';
          valid = false;
        }
      }

      if (p.endDate) {
        if (p.endDate > today) {
          errors.endDate = 'Date cannot be in the future';
          valid = false;
        }
        if (p.startDate && p.endDate <= p.startDate) {
          errors.endDate = 'Must be after start date';
          valid = false;
        }
      }

      return { ...p, errors };
    });

    // Check for overlaps between filled periods
    const filledWithDates = updated.filter(p => p.startDate);
    for (let i = 0; i < filledWithDates.length; i++) {
      const a = filledWithDates[i];
      const aStart = new Date(a.startDate).getTime();
      const aEnd = a.endDate ? new Date(a.endDate).getTime() : aStart + 5 * 86400000;
      for (let j = i + 1; j < filledWithDates.length; j++) {
        const b = filledWithDates[j];
        const bStart = new Date(b.startDate).getTime();
        const bEnd = b.endDate ? new Date(b.endDate).getTime() : bStart + 5 * 86400000;
        if (aStart <= bEnd && bStart <= aEnd) {
          // Find actual index in original array and set error
          const idxA = updated.indexOf(a);
          const idxB = updated.indexOf(b);
          updated[idxA].errors.startDate = 'Overlaps with another period';
          updated[idxB].errors.startDate = 'Overlaps with another period';
          valid = false;
        }
      }
    }

    // Check for duplicate start dates
    const startDates = filledWithDates.map(p => p.startDate);
    const dupes = startDates.filter((d, i) => startDates.indexOf(d) !== i);
    if (dupes.length > 0) {
      updated.forEach(p => {
        if (dupes.includes(p.startDate)) {
          p.errors.startDate = 'Duplicate start date';
          valid = false;
        }
      });
    }

    setPastPeriods(updated);
    return valid;
  };

  const savePastPeriods = async () => {
    const filled = pastPeriods.filter(p => p.startDate);
    if (filled.length === 0) return; // nothing to save

    setPeriodsSaving(true);
    // Sort oldest first so cycleLength auto-computes correctly
    const sorted = [...filled].sort((a, b) => a.startDate.localeCompare(b.startDate));

    let saved = 0;
    for (const p of sorted) {
      try {
        await cycleAPI.log({
          startDate: new Date(p.startDate).toISOString(),
          endDate: p.endDate ? new Date(p.endDate).toISOString() : new Date(new Date(p.startDate).getTime() + (period - 1) * 86400000).toISOString(),
          flow: 'medium',
        });
        saved++;
      } catch {
        // Don't block onboarding on failure
      }
    }
    if (saved > 0) toast.success(`${saved} period${saved > 1 ? 's' : ''} imported!`);
    else toast.error('Could not save periods — you can add them later');
    setPeriodsSaving(false);
  };

  // ── Step navigation ───────────────────────────────────
  const handleNext = async () => {
    // Leaving past periods step → validate & save
    if (showPastPeriodsStep && step === 2) {
      if (!validatePastPeriods()) return;
      await savePastPeriods();
      setStep(step + 1);
      return;
    }

    if (step < lastStep) {
      setStep(step + 1);
    } else {
      await finish();
    }
  };

  const handleSkipPeriods = () => {
    setStep(step + 1);
  };

  const finish = async () => {
    setBusy(true);
    try {
      const dosha = localStorage.getItem('sb_dosha') || undefined;
      await userAPI.updateProfile({ primaryGoal: goal, cycleLength: cycle, periodLength: period, interests: sel, dosha });
      // Migrate localStorage dosha to DB assessment
      if (dosha) {
        try {
          const { doshaAPI } = await import('../services/api');
          await doshaAPI.migrateLocal(dosha);
          localStorage.removeItem('sb_dosha');
        } catch {}
      }
      if (goal) setGoal(goal as UserGoal);
      setCycleData({ cycleLength: cycle, periodLength: period });
      if (goal === 'pregnancy') setCycleData({ pregnancyWeek: pregWeek });
      toast.success('Profile ready!');
      nav('/dashboard');
    } catch { toast.error('Failed to save'); }
    setBusy(false);
  };

  const isBusy = busy || periodsSaving;

  // Button label
  let btnLabel = 'Continue';
  if (step === lastStep) btnLabel = 'Get Started \u{1F680}';
  if (showPastPeriodsStep && step === 2) btnLabel = pastPeriods.some(p => p.startDate) ? 'Save & Continue' : 'Continue';
  if (isBusy) btnLabel = 'Saving...';

  return (
    <div className="min-h-screen p-6" style={{ background: 'linear-gradient(180deg, #FFF1F2 0%, #F5F3FF 50%, #FAFAF9 100%)' }}>
      <div className="flex items-center gap-3 mb-8 mt-2">
        {step > 0 && <button onClick={() => setStep(step - 1)} className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center text-gray-500 shadow-sm active:scale-90">{'\u2190'}</button>}
        <div className="flex gap-2 flex-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={'flex-1 h-1.5 rounded-full transition-all ' + (i <= step ? 'bg-rose-500' : 'bg-white/60')} />
          ))}
        </div>
        <span className="text-[10px] text-gray-400 font-bold">{step + 1}/{totalSteps}</span>
      </div>

      {/* Step 0: Goal Selection */}
      {step === 0 && (
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-1">What brings you here?</h2>
          <p className="text-gray-500 text-sm mb-6">We'll personalize your experience</p>
          <div className="grid grid-cols-2 gap-3">
            {goals.map(g => (
              <button key={g.id} onClick={() => setGoalLocal(g.id)}
                className={'p-5 rounded-2xl border-2 text-left transition-all active:scale-95 ' + (goal === g.id ? 'border-rose-400 bg-white shadow-lg' : 'border-gray-200 bg-white/80')}>
                <span className="text-3xl">{g.icon}</span>
                <p className="text-sm font-bold mt-2 text-gray-800">{g.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{g.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Cycle Details (non-pregnancy) */}
      {step === 1 && goal !== 'pregnancy' && (
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Cycle Details</h2>
          <p className="text-gray-500 text-sm mb-6">Helps us predict your cycle accurately</p>
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-6">
            {[
              { l: 'Cycle Length', v: cycle, s: setCycle, mn: 21, mx: 45, desc: 'First day of period to the next' },
              { l: 'Period Length', v: period, s: setPeriod, mn: 2, mx: 10, desc: 'Days of active bleeding' },
            ].map(x => (
              <div key={x.l}>
                <div className="flex justify-between items-center mb-2">
                  <div><p className="text-sm font-bold text-gray-800">{x.l}</p><p className="text-[10px] text-gray-400">{x.desc}</p></div>
                  <span className="text-2xl font-extrabold text-gray-900">{x.v}<span className="text-xs text-gray-400 ml-0.5">d</span></span>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => x.s(Math.max(x.mn, x.v - 1))} className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 font-bold active:scale-90">{'\u2212'}</button>
                  <input type="range" min={x.mn} max={x.mx} value={x.v} onChange={e => x.s(Number(e.target.value))} className="flex-1 accent-rose-500" />
                  <button onClick={() => x.s(Math.min(x.mx, x.v + 1))} className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 font-bold active:scale-90">+</button>
                </div>
              </div>
            ))}
            <div className="bg-purple-50 rounded-xl p-3">
              <p className="text-xs text-purple-700 font-bold">{'\u{1F52E}'} Ovulation around Day {ovDay} • Fertile Days {ovDay - 5}–{ovDay + 1}</p>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Pregnancy Week */}
      {step === 1 && goal === 'pregnancy' && (
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-1">How far along?</h2>
          <p className="text-gray-500 text-sm mb-6">We'll tailor week-by-week guidance</p>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="text-center mb-4">
              <span className="text-5xl">{'\u{1F930}'}</span>
              <p className="text-3xl font-extrabold text-gray-900 mt-2">{pregWeek} weeks</p>
              <p className="text-xs text-gray-400">{pregWeek <= 12 ? '1st Trimester' : pregWeek <= 26 ? '2nd Trimester' : '3rd Trimester'}</p>
            </div>
            <input type="range" min={1} max={40} value={pregWeek} onChange={e => setPregWeek(Number(e.target.value))} className="w-full accent-purple-500" />
            <div className="flex justify-between text-[9px] text-gray-400 mt-1">
              <span>Week 1</span><span>Week 20</span><span>Week 40</span>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Past Periods (non-pregnancy only) */}
      {step === 2 && showPastPeriodsStep && (
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Get instant predictions {'\u{1F338}'}</h2>
          <p className="text-gray-500 text-sm mb-2">Add your recent periods so we can predict your cycle right away — no waiting!</p>
          <p className="text-[10px] text-purple-600 font-semibold mb-5">Tip: Even approximate dates help!</p>

          <div className="space-y-3">
            {pastPeriods.map((pp, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative">
                {/* Remove button */}
                {(pastPeriods.length > 1 || pp.startDate || pp.endDate) && (
                  <button onClick={() => removePeriod(idx)}
                    className="absolute top-3 right-3 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-400 transition active:scale-90 text-xs font-bold">
                    ✕
                  </button>
                )}

                <p className="text-xs font-bold text-gray-500 mb-3">Period {idx + 1}</p>

                {/* Start Date */}
                <div className="mb-3">
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={pp.startDate}
                    max={today}
                    min={twelveMonthsAgo}
                    onChange={e => updatePeriod(idx, 'startDate', e.target.value)}
                    className={'w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none transition ' + (pp.errors.startDate ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-rose-400')}
                  />
                  {pp.errors.startDate && <p className="text-[10px] text-red-500 mt-1 font-medium">{pp.errors.startDate}</p>}
                </div>

                {/* End Date */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">End Date <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input
                    type="date"
                    value={pp.endDate}
                    max={today}
                    min={pp.startDate || twelveMonthsAgo}
                    onChange={e => updatePeriod(idx, 'endDate', e.target.value)}
                    className={'w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none transition ' + (pp.errors.endDate ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-rose-400')}
                  />
                  {pp.errors.endDate && <p className="text-[10px] text-red-500 mt-1 font-medium">{pp.errors.endDate}</p>}
                </div>
              </div>
            ))}
          </div>

          {/* Add another */}
          {pastPeriods.length < 3 && (
            <button onClick={addPeriod}
              className="w-full mt-3 py-2.5 rounded-2xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-400 hover:border-rose-300 hover:text-rose-400 transition active:scale-95">
              + Add another period
            </button>
          )}
        </div>
      )}

      {/* Interests Step (Step 2 for pregnancy, Step 3 for others) */}
      {step === interestsStep && (
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Your Interests</h2>
          <p className="text-gray-500 text-sm mb-6">We'll personalize your articles & tips</p>
          <div className="flex flex-wrap gap-2">
            {topics.map(t => (
              <button key={t} onClick={() => toggle(t)}
                className={'px-4 py-2.5 rounded-full text-sm font-medium border-2 transition-all active:scale-95 ' + (sel.includes(t) ? 'border-rose-400 bg-rose-50 text-rose-600' : 'border-gray-200 text-gray-500 bg-white')}>
                {t}
              </button>
            ))}
          </div>
          {sel.length > 0 && <p className="text-xs text-gray-400 mt-3 font-bold">{sel.length} selected</p>}
        </div>
      )}

      {/* Main Action Button */}
      <button onClick={handleNext} disabled={isBusy || (step === 0 && !goal)}
        className="w-full mt-8 py-3.5 text-white rounded-2xl font-bold shadow-lg disabled:opacity-50 active:scale-95 transition-transform"
        style={{ background: 'linear-gradient(135deg, #E11D48, #EC4899)' }}>
        {btnLabel}
      </button>

      {/* Skip link for past periods step */}
      {showPastPeriodsStep && step === 2 && !periodsSaving && (
        <button onClick={handleSkipPeriods} className="w-full mt-3 py-2 text-sm text-gray-400 font-semibold hover:text-gray-600 transition">
          Skip for now
        </button>
      )}
    </div>
  );
}
