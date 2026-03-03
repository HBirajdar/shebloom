import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userAPI } from '../services/api';
import toast from 'react-hot-toast';

const goals = [
  { id: 'periods', icon: '&#127800;', label: 'Track Periods' },
  { id: 'pregnancy', icon: '&#129328;', label: 'Pregnancy' },
  { id: 'wellness', icon: '&#128588;', label: 'Wellness' },
  { id: 'fertility', icon: '&#128150;', label: 'Trying to Conceive' },
];
const topics = ['Period Tracking','Pregnancy','PCOD/PCOS','Yoga','Mental Health','Nutrition','Self Care','Fertility','Fitness','Sleep','Supplements','Ayurveda'];

export default function ProfileSetupPage() {
  const nav = useNavigate();
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
      toast.success('Profile ready!');
      nav('/dashboard');
    } catch { toast.error('Failed'); }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-purple-50 p-6">
      <div className="flex gap-2 mb-8 mt-4">
        {[0,1,2].map(i => <div key={i} className={'flex-1 h-1.5 rounded-full ' + (i <= step ? 'bg-rose-500' : 'bg-gray-200')} />)}
      </div>

      {step === 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">What brings you here?</h2>
          <p className="text-gray-500 text-sm mb-6">Choose your primary goal</p>
          <div className="grid grid-cols-2 gap-3">
            {goals.map(g => (
              <button key={g.id} onClick={() => setGoal(g.id)} className={'p-5 rounded-2xl border-2 text-left ' + (goal === g.id ? 'border-rose-400 bg-rose-50' : 'border-gray-200 bg-white')}>
                <span className="text-3xl" dangerouslySetInnerHTML={{ __html: g.icon }} />
                <p className="text-sm font-bold mt-2 text-gray-800">{g.label}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Cycle Details</h2>
          <p className="text-gray-500 text-sm mb-6">Helps us predict your cycle</p>
          <div className="bg-white rounded-2xl p-5 shadow space-y-6">
            {[{l:'Cycle Length',v:cycle,s:setCycle,mn:21,mx:40},{l:'Period Length',v:period,s:setPeriod,mn:2,mx:10}].map(x => (
              <div key={x.l}>
                <label className="text-sm font-medium text-gray-600">{x.l}</label>
                <div className="flex items-center gap-4 mt-2">
                  <button onClick={() => x.s(Math.max(x.mn, x.v - 1))} className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 font-bold text-lg">-</button>
                  <span className="text-2xl font-bold text-gray-800 w-16 text-center">{x.v}</span>
                  <button onClick={() => x.s(Math.min(x.mx, x.v + 1))} className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 font-bold text-lg">+</button>
                  <span className="text-sm text-gray-400">days</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Interests</h2>
          <p className="text-gray-500 text-sm mb-6">Personalize your content</p>
          <div className="flex flex-wrap gap-2">
            {topics.map(t => (
              <button key={t} onClick={() => toggle(t)} className={'px-4 py-2 rounded-full text-sm font-medium border-2 ' + (sel.includes(t) ? 'border-rose-400 bg-rose-50 text-rose-600' : 'border-gray-200 text-gray-500')}>{t}</button>
            ))}
          </div>
        </div>
      )}

      <button onClick={() => step < 2 ? setStep(step + 1) : finish()} disabled={busy || (step === 0 && !goal)} className="w-full mt-8 py-3.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl font-bold shadow-lg disabled:opacity-50">
        {busy ? 'Saving...' : step < 2 ? 'Continue' : 'Get Started'}
      </button>
    </div>
  );
}
