import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useCycleStore } from '../stores/cycleStore';
import type { UserGoal } from '../stores/cycleStore';
import { userAPI } from '../services/api';
import toast from 'react-hot-toast';

const goals: { id: UserGoal; icon: string; label: string; desc: string }[] = [
  { id: 'periods', icon: '\u{1F33A}', label: 'Track Periods', desc: 'Monitor your monthly cycle' },
  { id: 'fertility', icon: '\u{1F495}', label: 'Trying to Conceive', desc: 'Fertility & ovulation tracking' },
  { id: 'pregnancy', icon: '\u{1F930}', label: 'Pregnancy', desc: 'Week-by-week pregnancy guide' },
  { id: 'wellness', icon: '\u{1F9D8}', label: 'Wellness', desc: 'Overall health & self-care' },
];
const topics = ['Period Tracking','Pregnancy','PCOD/PCOS','Yoga','Mental Health','Nutrition','Self Care','Fertility','Fitness','Sleep','Supplements','Ayurveda'];

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

  const toggle = (t: string) => setSel(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);
  const ovDay = cycle - 14;

  const finish = async () => {
    setBusy(true);
    try {
      const dosha = localStorage.getItem('sb_dosha') || undefined;
      await userAPI.updateProfile({ primaryGoal: goal, cycleLength: cycle, periodLength: period, interests: sel, dosha });
      if (goal) setGoal(goal as UserGoal);
      setCycleData({ cycleLength: cycle, periodLength: period });
      if (goal === 'pregnancy') setCycleData({ pregnancyWeek: pregWeek });
      toast.success('Profile ready!');
      nav('/dashboard');
    } catch { toast.error('Failed to save'); }
    setBusy(false);
  };

  const totalSteps = goal === 'pregnancy' ? 3 : 3;

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

      {step === 2 && (
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

      <button onClick={() => step < 2 ? setStep(step + 1) : finish()} disabled={busy || (step === 0 && !goal)}
        className="w-full mt-8 py-3.5 text-white rounded-2xl font-bold shadow-lg disabled:opacity-50 active:scale-95 transition-transform"
        style={{ background: 'linear-gradient(135deg, #E11D48, #EC4899)' }}>
        {busy ? 'Saving...' : step < 2 ? 'Continue' : 'Get Started \u{1F680}'}
      </button>
    </div>
  );
}
