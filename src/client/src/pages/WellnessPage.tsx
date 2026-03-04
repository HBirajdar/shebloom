import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const items = [
  { id: 'w1', name: 'Morning Calm Meditation', cat: 'Meditation', dur: '10 min', diff: 'Beginner', emoji: '\u{1F9D8}', cl: 'from-indigo-400 to-purple-400' },
  { id: 'w2', name: 'Deep Breathing Exercise', cat: 'Meditation', dur: '5 min', diff: 'Beginner', emoji: '\u{1F4A8}', cl: 'from-sky-400 to-blue-400' },
  { id: 'w3', name: 'Period Relief Yoga Flow', cat: 'Yoga', dur: '20 min', diff: 'Intermediate', emoji: '\u{1F9D8}', cl: 'from-rose-400 to-pink-400' },
  { id: 'w4', name: 'Prenatal Yoga Routine', cat: 'Yoga', dur: '25 min', diff: 'Beginner', emoji: '\u{1F930}', cl: 'from-violet-400 to-fuchsia-400' },
  { id: 'w5', name: 'PCOS Yoga Flow', cat: 'Yoga', dur: '30 min', diff: 'Intermediate', emoji: '\u{1F33F}', cl: 'from-emerald-400 to-green-400' },
  { id: 'w6', name: 'Sleep Meditation', cat: 'Meditation', dur: '15 min', diff: 'Beginner', emoji: '\u{1F31C}', cl: 'from-slate-500 to-indigo-500' },
  { id: 'w7', name: 'Gratitude Journaling', cat: 'Mindfulness', dur: '5 min', diff: 'Beginner', emoji: '\u{1F4D3}', cl: 'from-amber-400 to-yellow-400' },
  { id: 'w8', name: 'Sound Therapy', cat: 'Mindfulness', dur: '10 min', diff: 'Beginner', emoji: '\u{1F3B6}', cl: 'from-teal-400 to-cyan-400' },
];

export default function WellnessPage() {
  const nav = useNavigate();
  const [cat, setCat] = useState('All');
  const cats = ['All', 'Meditation', 'Yoga', 'Mindfulness'];
  const filtered = items.filter(w => cat === 'All' || w.cat === cat);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 z-10 bg-white px-5 py-4 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => nav('/dashboard')}>&#8592;</button>
        <h1 className="text-lg font-bold">Wellness Hub</h1>
      </div>
      <div className="px-5 pt-4 space-y-4">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl p-5 text-white">
          <p className="text-xs font-semibold opacity-80">Daily Tip</p>
          <p className="text-base font-bold mt-1 leading-relaxed">During ovulation, your energy peaks. Perfect time for high-intensity yoga!</p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {cats.map(c => (
            <button key={c} onClick={() => setCat(c)} className={'px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border-2 ' + (cat === c ? 'border-purple-400 bg-purple-50 text-purple-600' : 'border-gray-200 text-gray-500')}>{c}</button>
          ))}
        </div>

        {filtered.map(w => (
          <div key={w.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className={'p-4 text-white bg-gradient-to-r ' + w.cl + ' flex justify-between items-center'}>
              <div>
                <p className="font-bold">{w.name}</p>
                <p className="text-xs opacity-80">{w.cat} &middot; {w.dur} &middot; {w.diff}</p>
              </div>
              <span className="text-3xl">{w.emoji}</span>
            </div>
            <div className="px-4 py-3 flex justify-between items-center">
              <span className="text-xs text-gray-500">{w.dur}</span>
              <button onClick={() => alert(`Starting ${w.name}...\n\nTimer: ${w.dur}\n\nThis feature will include guided audio and animations in the next update!`)} className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg text-xs font-bold active:scale-95 transition-transform cursor-pointer">Start</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
