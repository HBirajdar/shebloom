import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useCycleStore } from '../stores/cycleStore';
import { cycleAPI, moodAPI } from '../services/api';
import toast from 'react-hot-toast';

const moods = [
  { key: 'GREAT', emoji: '\u{1F929}', label: 'Great' },
  { key: 'GOOD', emoji: '\u{1F60A}', label: 'Good' },
  { key: 'OKAY', emoji: '\u{1F610}', label: 'Okay' },
  { key: 'LOW', emoji: '\u{1F614}', label: 'Low' },
  { key: 'BAD', emoji: '\u{1F62D}', label: 'Bad' },
];

const phaseInfo: Record<string, { tip: string; color: string }> = {
  menstrual: { tip: 'Rest well & stay hydrated', color: '#F43F5E' },
  follicular: { tip: 'Energy rising \u2014 great for workouts!', color: '#10B981' },
  ovulation: { tip: 'Peak fertility window', color: '#8B5CF6' },
  luteal: { tip: 'PMS may start \u2014 be gentle with yourself', color: '#F59E0B' },
};

const CycleRing = ({ day, total, phase }: { day: number; total: number; phase: string }) => {
  const r = 68, stroke = 8, circ = 2 * Math.PI * r;
  const pct = Math.min(day / total, 1);
  const offset = circ * (1 - pct);
  const col = phaseInfo[phase]?.color || '#F43F5E';
  return (
    <div className="relative w-44 h-44 mx-auto">
      <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
        <circle cx="80" cy="80" r={r} fill="none" stroke="#f3f4f6" strokeWidth={stroke} />
        <circle cx="80" cy="80" r={r} fill="none" stroke={col} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-gray-900">Day {day}</span>
        <span className="text-xs font-semibold capitalize mt-0.5" style={{ color: col }}>{phase}</span>
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const nav = useNavigate();
  const user = useAuthStore(s => s.user);
  const { cycleDay, phase, daysUntilPeriod, cycleLength, periodLength } = useCycleStore();
  const set = useCycleStore(s => s.setCycleData);
  const [mood, setMood] = useState('');
  const [water, setWater] = useState(3);
  const [tab, setTab] = useState('home');

  const ovulationDay = cycleLength - 14;
  const fertileStart = ovulationDay - 5;
  const fertileEnd = ovulationDay + 1;
  const isFertileNow = cycleDay >= fertileStart && cycleDay <= fertileEnd;
  const isOvulationToday = cycleDay === ovulationDay;
  const daysToFertile = fertileStart > cycleDay ? fertileStart - cycleDay : 0;
  const daysToOvulation = ovulationDay > cycleDay ? ovulationDay - cycleDay : 0;

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
    moodAPI.log({ mood: key }).then(() => toast.success('Mood logged!')).catch(() => toast.error('Failed'));
  };

  const info = phaseInfo[phase] || phaseInfo.menstrual;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-lg px-5 py-3 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-md">{user?.fullName?.charAt(0) || 'S'}</div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Welcome back</p>
            <p className="text-sm font-bold text-gray-900">{user?.fullName || 'User'}</p>
          </div>
        </div>
        <button onClick={() => nav('/appointments')} className="relative w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center active:scale-95 transition-transform">
          {'\u{1F514}'}
          <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
        </button>
      </div>

      <div className="px-5 pt-5 space-y-5">
        {/* Cycle Ring */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <CycleRing day={cycleDay} total={cycleLength} phase={phase} />
          <p className="text-center text-xs text-gray-500 mt-3">{info.tip}</p>
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="bg-rose-50 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-rose-400 font-medium">Next Period</p>
              <p className="text-lg font-bold text-rose-600">{daysUntilPeriod}d</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-purple-400 font-medium">Ovulation</p>
              <p className="text-lg font-bold text-purple-600">{daysToOvulation > 0 ? daysToOvulation + 'd' : isOvulationToday ? 'Today!' : 'Done'}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-blue-400 font-medium">Cycle</p>
              <p className="text-lg font-bold text-blue-600">{cycleLength}d</p>
            </div>
          </div>
        </div>

        {/* Fertility Insight */}
        {isFertileNow ? (
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-4 text-white">
            <div className="flex items-center gap-2 mb-1">
              <span>{'\u2728'}</span>
              <h3 className="font-bold text-sm">Fertile Window {isOvulationToday ? '\u2014 Ovulation Today!' : '\u2014 High Chance'}</h3>
            </div>
            <p className="text-xs text-white/80">
              {isOvulationToday ? 'Peak fertility day. Best time to conceive.' : 'Ovulation in ' + daysToOvulation + ' day(s). Higher chance of conception now.'}
            </p>
          </div>
        ) : daysToFertile > 0 && daysToFertile <= 7 ? (
          <div className="bg-gradient-to-r from-violet-100 to-purple-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <span>{'\u{1F4C5}'}</span>
              <h3 className="font-bold text-sm text-purple-800">Fertility Window Approaching</h3>
            </div>
            <p className="text-xs text-purple-600">Fertile window starts in {daysToFertile} day(s) (Day {fertileStart}\u2013{fertileEnd}). Ovulation on Day {ovulationDay}.</p>
          </div>
        ) : null}

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { l: 'Tracker', p: '/tracker', c: 'bg-rose-50', e: '\u{1F4C5}' },
            { l: 'Pregnancy', p: '/pregnancy', c: 'bg-purple-50', e: '\u{1F930}' },
            { l: 'Doctors', p: '/doctors', c: 'bg-blue-50', e: '\u{1F469}\u200D\u2695\uFE0F' },
            { l: 'Hospitals', p: '/hospitals', c: 'bg-green-50', e: '\u{1F3E5}' },
          ].map(a => (
            <button key={a.l} onClick={() => nav(a.p)} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
              <div className={'w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ' + a.c}>{a.e}</div>
              <span className="text-[10px] font-semibold text-gray-500">{a.l}</span>
            </button>
          ))}
        </div>

        {/* Mood */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 mb-3">How are you feeling?</h3>
          <div className="flex justify-between">
            {moods.map(m => (
              <button key={m.key} onClick={() => logMood(m.key)}
                className={'flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-all ' + (mood === m.key ? 'bg-rose-50 scale-110 shadow-sm' : 'active:scale-95')}>
                <span className="text-2xl">{m.emoji}</span>
                <span className="text-[10px] text-gray-500">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Water */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-gray-800">{'\u{1F4A7}'} Water Intake</h3>
            <span className="text-xs font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">{water}/8</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: 8 }).map((_, i) => (
              <button key={i} onClick={() => setWater(i < water ? i : i + 1)}
                className={'w-9 h-9 rounded-lg flex items-center justify-center text-sm transition-all active:scale-90 ' + (i < water ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-300')}>
                {'\u{1F4A7}'}
              </button>
            ))}
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3">
            <div className="bg-blue-400 h-1.5 rounded-full transition-all" style={{ width: (water / 8 * 100) + '%' }} />
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 px-2 py-2 flex justify-around z-30">
        {[
          { id: 'home', e: '\u{1F3E0}', l: 'Home' },
          { id: 'wellness', e: '\u{1F33F}', l: 'Wellness' },
          { id: 'articles', e: '\u{1F4F0}', l: 'Articles' },
          { id: 'profile', e: '\u{1F464}', l: 'Profile' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={'flex flex-col items-center gap-0.5 px-4 py-1 transition-colors ' + (tab === t.id ? 'text-rose-600' : 'text-gray-400')}>
            <span className="text-xl">{t.e}</span>
            <span className="text-[10px] font-semibold">{t.l}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
