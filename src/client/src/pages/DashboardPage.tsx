import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useCycleStore } from '../stores/cycleStore';
import { cycleAPI, moodAPI } from '../services/api';

const moods = [
  { key: 'GREAT', emoji: '&#128525;', label: 'Great' },
  { key: 'GOOD', emoji: '&#128522;', label: 'Good' },
  { key: 'OKAY', emoji: '&#128528;', label: 'Okay' },
  { key: 'LOW', emoji: '&#128532;', label: 'Low' },
  { key: 'BAD', emoji: '&#128557;', label: 'Bad' },
];

const phaseGrad: Record<string,string> = {
  menstrual: 'from-rose-400 to-red-400',
  follicular: 'from-emerald-400 to-teal-400',
  ovulation: 'from-violet-400 to-purple-400',
  luteal: 'from-amber-400 to-orange-400',
};

export default function DashboardPage() {
  const nav = useNavigate();
  const user = useAuthStore(s => s.user);
  const { cycleDay, phase, daysUntilPeriod, cycleLength } = useCycleStore();
  const set = useCycleStore(s => s.setCycleData);
  const [mood, setMood] = useState('');
  const [water, setWater] = useState(3);
  const [tab, setTab] = useState('home');
  const pct = Math.round((cycleDay / cycleLength) * 100);

  useEffect(() => {
    cycleAPI.predict().then(r => { if (r.data.data?.cycleDay) set(r.data.data); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === 'wellness') nav('/wellness');
    if (tab === 'articles') nav('/articles');
    if (tab === 'profile') nav('/profile');
  }, [tab]);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md px-5 py-4 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-pink-400 flex items-center justify-center text-white font-bold text-sm">{user?.fullName?.charAt(0) || 'S'}</div>
          <div><p className="text-xs text-gray-400">Hello</p><p className="text-sm font-bold text-gray-900">{user?.fullName || 'User'}</p></div>
        </div>
        <button className="relative w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"><span>&#128276;</span><div className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full" /></button>
      </div>

      <div className="px-5 pt-5 space-y-5">
        <div className={'rounded-3xl p-5 text-white bg-gradient-to-br ' + (phaseGrad[phase] || 'from-rose-400 to-pink-400')}>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-white/80 text-xs uppercase tracking-wider">Cycle Day</p>
              <p className="text-4xl font-bold mt-1">{cycleDay}</p>
              <p className="text-white/90 text-sm mt-1 capitalize">{phase} Phase</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{pct}%</p>
              <p className="text-xs text-white/70">complete</p>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <div className="bg-white/20 rounded-xl px-3 py-2 text-xs"><span className="block text-white/70">Next period</span><span className="font-bold">{daysUntilPeriod} days</span></div>
            <div className="bg-white/20 rounded-xl px-3 py-2 text-xs"><span className="block text-white/70">Cycle</span><span className="font-bold">{cycleLength} days</span></div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[{l:'Tracker',p:'/tracker',c:'bg-rose-50',i:'&#128197;'},{l:'Pregnancy',p:'/pregnancy',c:'bg-purple-50',i:'&#129328;'},{l:'Doctors',p:'/doctors',c:'bg-blue-50',i:'&#128105;'},{l:'Hospitals',p:'/hospitals',c:'bg-green-50',i:'&#127973;'}].map(a=>
            <button key={a.l} onClick={()=>nav(a.p)} className="flex flex-col items-center gap-1">
              <div className={'w-14 h-14 rounded-2xl flex items-center justify-center text-2xl '+a.c}><span dangerouslySetInnerHTML={{__html:a.i}}/></div>
              <span className="text-[10px] font-medium text-gray-500">{a.l}</span>
            </button>
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 mb-3">How are you feeling?</h3>
          <div className="flex justify-between">
            {moods.map(m=><button key={m.key} onClick={()=>{setMood(m.key);moodAPI.log({mood:m.key}).catch(()=>{});}} className={'flex flex-col items-center gap-1 px-2 py-2 rounded-xl '+(mood===m.key?'bg-rose-50 scale-110':'')}>
              <span className="text-2xl" dangerouslySetInnerHTML={{__html:m.emoji}}/><span className="text-[10px] text-gray-500">{m.label}</span>
            </button>)}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between mb-3"><h3 className="text-sm font-bold text-gray-800">Water Intake</h3><span className="text-xs text-blue-500 font-semibold">{water}/8</span></div>
          <div className="flex gap-2 flex-wrap">
            {Array.from({length:8}).map((_,i)=><button key={i} onClick={()=>setWater(i<water?i:i+1)} className={'w-9 h-9 rounded-lg flex items-center justify-center text-sm '+(i<water?'bg-blue-100 text-blue-600':'bg-gray-100 text-gray-400')}>&#128167;</button>)}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 px-2 py-2 flex justify-around z-30">
        {[{id:'home',i:'&#127968;',l:'Home'},{id:'wellness',i:'&#127807;',l:'Wellness'},{id:'articles',i:'&#128240;',l:'Articles'},{id:'profile',i:'&#128100;',l:'Profile'}].map(t=>
          <button key={t.id} onClick={()=>setTab(t.id)} className={'flex flex-col items-center gap-0.5 px-4 py-1 '+(tab===t.id?'text-rose-600':'text-gray-400')}>
            <span className="text-xl" dangerouslySetInnerHTML={{__html:t.i}}/><span className="text-[10px] font-medium">{t.l}</span>
          </button>
        )}
      </div>
    </div>
  );
}
