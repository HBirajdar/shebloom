import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const milestones = [
  { w: 13, t: 'Facial expressions forming', e: '&#128118;' },
  { w: 14, t: 'Taste buds developing', e: '&#128523;' },
  { w: 15, t: 'Fingerprints forming', e: '&#9996;' },
  { w: 16, t: 'Vocal cords developing', e: '&#127908;' },
];

const checks = [
  'Schedule anomaly scan',
  'Take prenatal vitamins daily',
  'Stay hydrated (3L/day)',
  'Practice kegel exercises',
];

export default function PregnancyPage() {
  const nav = useNavigate();
  const [week] = useState(16);
  const [done, setDone] = useState<boolean[]>([false, true, false, false]);

  const toggle = (i: number) => { const n = [...done]; n[i] = !n[i]; setDone(n); };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="sticky top-0 z-10 bg-white px-5 py-4 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => nav('/dashboard')}>&#8592;</button>
        <h1 className="text-lg font-bold">Pregnancy Tracker</h1>
      </div>
      <div className="px-5 pt-5 space-y-5">
        <div className="bg-gradient-to-br from-purple-400 to-pink-400 rounded-3xl p-5 text-white text-center">
          <p className="text-white/80 text-sm">Week</p>
          <p className="text-5xl font-bold">{week}</p>
          <p className="text-white/80 text-sm">of 40</p>
          <div className="w-full bg-white/20 rounded-full h-2 mt-4">
            <div className="bg-white h-2 rounded-full" style={{ width: (week / 40 * 100) + '%' }} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
          <p className="text-4xl">&#129361;</p>
          <p className="text-sm text-gray-500 mt-1">Your baby is the size of an</p>
          <p className="text-lg font-bold text-gray-800">Avocado</p>
          <div className="flex justify-center gap-6 mt-3">
            <div><p className="text-xs text-gray-400">Length</p><p className="font-bold text-gray-700">11.6 cm</p></div>
            <div><p className="text-xs text-gray-400">Weight</p><p className="font-bold text-gray-700">100g</p></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 mb-3">Weekly Checklist</h3>
          {checks.map((c, i) => (
            <button key={i} onClick={() => toggle(i)} className="flex items-center gap-3 w-full py-2.5 border-b border-gray-50 last:border-0">
              <div className={'w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ' + (done[i] ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300')}>
                {done[i] && '&#10003;'}
              </div>
              <span className={'text-sm ' + (done[i] ? 'text-gray-400 line-through' : 'text-gray-700')}>{c}</span>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 mb-3">Development Timeline</h3>
          {milestones.map((m, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm" dangerouslySetInnerHTML={{ __html: m.e }} />
              <div><p className="text-xs text-purple-400">Week {m.w}</p><p className="text-sm text-gray-700">{m.t}</p></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
