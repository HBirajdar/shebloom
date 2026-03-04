import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useCycleStore } from '../stores/cycleStore';
import { userAPI } from '../services/api';
import toast from 'react-hot-toast';

const goals = [
  { id: 'periods', icon: '\u{1F33A}', label: 'Track Periods', desc: 'Monitor your cycle' },
  { id: 'pregnancy', icon: '\u{1F930}', label: 'Pregnancy', desc: 'Track your pregnancy' },
  { id: 'wellness', icon: '\u{1F64F}', label: 'Wellness', desc: 'Improve overall health' },
  { id: 'fertility', icon: '\u{1F496}', label: 'Trying to Conceive', desc: 'Fertility tracking' },
];
const topics = ['Period Tracking','Pregnancy','PCOD/PCOS','Yoga','Mental Health','Nutrition','Self Care','Fertility','Fitness','Sleep','Supplements','Ayurveda'];

export default function ProfileSetupPage() {
  const nav = useNavigate();
  const user = useAuthStore(s => s.user);
  const setCycleData = useCycleStore(s => s.setCycleData);
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState('');
  const [cycle, setCycle] = useState(28);
  const [period, setPeriod] = useState(5);
  const [sel, setSel] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const toggle = (t: string) => setSel(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);

  const finish = async () => {
    setBusy(true);
    try {
      await userAPI.updateProfile({ primaryGoal: goal, cycleLength: cycle, periodLength: period, interests: sel });
      setCycleData({ cycleLength: cycle, periodLength: period });
      toast.success('Profile ready!');
      nav('/dashboard');
    } catch { toast.error('Failed to save'); }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-purple-50 p-6">
      {/* Progress */}
      <div className="flex items-center gap-3 mb-8 mt-2">
        {step > 0 && <button onClick={() => setStep(step - 1)} className="text-gray-500 text-xl">{'\u2190'}</button>}
        <div className="flex gap-2 flex-1">
          {[0, 1, 2].map(i => (
            <div key={i} className={'flex-1 h-1.5 rounded-full transition-all ' + (i <= step ? 'bg-rose-500' : 'bg-gray-200')} />
          ))}
        </div>
        <span className="text-xs text-gray-400">{step + 1}/3</span>
      </div>

      {step === 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">What brings you here?</h2>
          <p className="text-gray-500 text-sm mb-6">Choose your primary goal</p>
          <div className="grid grid-cols-2 gap-3">
            {goals.map(g => (
              <button key={g.id} onClick={() => setGoal(g.id)}
                className={'p-5 rounded-2xl border-2 text-left transition-all active:scale-95 ' + (goal === g.id ? 'border-rose-400 bg-rose-50 shadow-md' : 'border-gray-200 bg-white')}>
                <span className="text-3xl">{g.icon}</span>
                <p className="text-sm font-bold mt-2 text-gray-800">{g.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{g.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Cycle Details</h2>
          <p className="text-gray-500 text-sm mb-6">Helps us predict your cycle accurately</p>
          <div className="bg-white rounded-2xl p-5 shadow space-y-6">
            {[
              { l: 'Cycle Length', v: cycle, s: setCycle, mn: 21, mx: 45, desc: 'First day of period to the next' },
              { l: 'Period Length', v: period, s: setPeriod, mn: 2, mx: 10, desc: 'Days of bleeding' },
            ].map(x => (
              <div key={x.l}>
                <label className="text-sm font-semibold text-gray-700">{x.l}</label>
                <p className="text-xs text-gray-400 mb-2">{x.desc}</p>
                <div className="flex items-center gap-4">
                  <button onClick={() => x.s(Math.max(x.mn, x.v - 1))}
                    className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 font-bold text-lg active:scale-90 transition-transform">{'\u2212'}</button>
                  <div className="flex-1 text-center">
                    <span className="text-3xl font-bold text-gray-900">{x.v}</span>
                    <span className="text-sm text-gray-400 ml-1">days</span>
                  </div>
                  <button onClick={() => x.s(Math.min(x.mx, x.v + 1))}
                    className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 font-bold text-lg active:scale-90 transition-transform">+</button>
                </div>
                <input type="range" min={x.mn} max={x.mx} value={x.v} onChange={e => x.s(Number(e.target.value))}
                  className="w-full mt-2 accent-rose-500" />
              </div>
            ))}

            {/* Quick preview */}
            <div className="bg-purple-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-purple-700 mb-1">{'\u{1F52E}'} Based on your settings:</p>
              <p className="text-xs text-purple-600">Ovulation around Day {cycle - 14} \u2022 Fertile window Day {cycle - 19}\u2013{cycle - 13}</p>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Your Interests</h2>
          <p className="text-gray-500 text-sm mb-6">We'll personalize your content</p>
          <div className="flex flex-wrap gap-2">
            {topics.map(t => (
              <button key={t} onClick={() => toggle(t)}
                className={'px-4 py-2.5 rounded-full text-sm font-medium border-2 transition-all active:scale-95 ' + (sel.includes(t) ? 'border-rose-400 bg-rose-50 text-rose-600' : 'border-gray-200 text-gray-500 bg-white')}>
                {t}
              </button>
            ))}
          </div>
          {sel.length > 0 && <p className="text-xs text-gray-400 mt-3">{sel.length} selected</p>}
        </div>
      )}

      <button onClick={() => step < 2 ? setStep(step + 1) : finish()} disabled={busy || (step === 0 && !goal)}
        className="w-full mt-8 py-3.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl font-bold shadow-lg disabled:opacity-50 active:scale-95 transition-transform">
        {busy ? 'Saving...' : step < 2 ? 'Continue' : 'Get Started \u{1F680}'}
      </button>
    </div>
  );
}
