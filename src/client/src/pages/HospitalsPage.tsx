import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const hospitals = [
  { id: '1', nm: 'Motherhood Hospital', ar: 'Indiranagar', rt: 4.6, bd: 120, tg: 'Specialty', cl: 'from-pink-400 to-rose-400', p1: 'Consult: Rs.300', p2: 'Delivery: Rs.45K' },
  { id: '2', nm: 'Cloudnine Hospital', ar: 'Jayanagar', rt: 4.7, bd: 80, tg: 'Premium', cl: 'from-violet-400 to-purple-400', p1: 'Consult: Rs.500', p2: 'Delivery: Rs.80K' },
  { id: '3', nm: 'Rainbow Hospital', ar: 'Marathahalli', rt: 4.5, bd: 200, tg: 'Budget', cl: 'from-emerald-400 to-teal-400', p1: 'Consult: Rs.200', p2: 'Delivery: Rs.30K' },
  { id: '4', nm: 'Fortis La Femme', ar: 'Richmond Rd', rt: 4.8, bd: 150, tg: 'Top Rated', cl: 'from-amber-400 to-orange-400', p1: 'Consult: Rs.600', p2: 'Delivery: Rs.90K' },
];

export default function HospitalsPage() {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const list = hospitals.filter(h => !q || h.nm.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="sticky top-0 z-10 bg-white px-5 py-4 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => nav('/dashboard')}>&#8592;</button>
        <h1 className="text-lg font-bold">Hospitals and Prices</h1>
      </div>
      <div className="px-5 pt-4 space-y-4">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search..." className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white outline-none" />
        {list.map(h => (
          <div key={h.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className={'p-4 text-white bg-gradient-to-r ' + h.cl}>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">{h.tg}</span>
              <h3 className="font-bold text-lg mt-1">{h.nm}</h3>
              <p className="text-white/80 text-xs">{h.ar}, Bangalore</p>
              <div className="flex gap-3 mt-2 text-xs">
                <span>&#9733; {h.rt}</span>
                <span>{h.bd} beds</span>
                <span>24/7 Emergency</span>
              </div>
            </div>
            <div className="p-3 flex gap-2">
              <span className="text-xs bg-gray-50 rounded-lg px-3 py-1.5 text-gray-700">{h.p1}</span>
              <span className="text-xs bg-gray-50 rounded-lg px-3 py-1.5 text-gray-700">{h.p2}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
