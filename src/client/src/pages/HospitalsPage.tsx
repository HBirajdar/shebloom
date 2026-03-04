import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const hospitals = [
  { id: '1', nm: 'Motherhood Hospital', ar: 'Indiranagar', rt: 4.6, bd: 120, tg: 'Specialty', cl: 'from-pink-400 to-rose-400', p1: 'Consult: ₹300', p2: 'Delivery: ₹45K', ph: '+918012345678', specs: ['Gynecology', 'Obstetrics', 'Neonatology'] },
  { id: '2', nm: 'Cloudnine Hospital', ar: 'Jayanagar', rt: 4.7, bd: 80, tg: 'Premium', cl: 'from-violet-400 to-purple-400', p1: 'Consult: ₹500', p2: 'Delivery: ₹80K', ph: '+918023456789', specs: ['IVF', 'High-Risk Pregnancy', 'Pediatrics'] },
  { id: '3', nm: 'Rainbow Hospital', ar: 'Marathahalli', rt: 4.5, bd: 200, tg: 'Budget', cl: 'from-emerald-400 to-teal-400', p1: 'Consult: ₹200', p2: 'Delivery: ₹30K', ph: '+918034567890', specs: ['Gynecology', 'Fertility', 'General'] },
  { id: '4', nm: 'Fortis La Femme', ar: 'Richmond Rd', rt: 4.8, bd: 150, tg: 'Top Rated', cl: 'from-amber-400 to-orange-400', p1: 'Consult: ₹600', p2: 'Delivery: ₹90K', ph: '+918045678901', specs: ['Gynecology', 'Oncology', 'Fertility'] },
];

export default function HospitalsPage() {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<any>(null);
  const list = hospitals.filter(h => !q || h.nm.toLowerCase().includes(q.toLowerCase()) || h.ar.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="sticky top-0 z-10 bg-white px-5 py-4 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => nav('/dashboard')} className="text-xl">&#8592;</button>
        <h1 className="text-lg font-bold">Hospitals & Prices</h1>
      </div>
      <div className="px-5 pt-4 space-y-4">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search hospitals or area..." className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:border-rose-300 transition-colors" />
        {list.map(h => (
          <button key={h.id} onClick={() => setSel(h)} className="w-full text-left bg-white rounded-2xl overflow-hidden shadow-sm active:scale-[0.98] transition-transform">
            <div className={'p-4 text-white bg-gradient-to-r ' + h.cl}>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">{h.tg}</span>
              <h3 className="font-bold text-lg mt-1">{h.nm}</h3>
              <p className="text-white/80 text-xs">{h.ar}, Bangalore</p>
              <div className="flex gap-3 mt-2 text-xs">
                <span>★ {h.rt}</span>
                <span>{h.bd} beds</span>
                <span>24/7 Emergency</span>
              </div>
            </div>
            <div className="p-3 flex gap-2">
              <span className="text-xs bg-gray-50 rounded-lg px-3 py-1.5 text-gray-700">{h.p1}</span>
              <span className="text-xs bg-gray-50 rounded-lg px-3 py-1.5 text-gray-700">{h.p2}</span>
            </div>
          </button>
        ))}
        {list.length === 0 && (
          <div className="text-center py-10">
            <p className="text-4xl mb-2">🏥</p>
            <p className="text-gray-400">No hospitals found for "{q}"</p>
          </div>
        )}
      </div>

      {sel && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={() => setSel(null)}>
          <div className="bg-white w-full max-w-[430px] mx-auto rounded-t-3xl p-6" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <h3 className="font-bold text-xl text-gray-900">{sel.nm}</h3>
            <p className="text-sm text-gray-500 mt-1">{sel.ar}, Bangalore</p>
            <div className="flex gap-4 mt-4">
              <div className="text-center flex-1 bg-rose-50 rounded-xl p-3"><p className="text-xl font-bold text-rose-600">★ {sel.rt}</p><p className="text-[10px] text-gray-400">Rating</p></div>
              <div className="text-center flex-1 bg-blue-50 rounded-xl p-3"><p className="text-xl font-bold text-blue-600">{sel.bd}</p><p className="text-[10px] text-gray-400">Beds</p></div>
              <div className="text-center flex-1 bg-emerald-50 rounded-xl p-3"><p className="text-xl font-bold text-emerald-600">24/7</p><p className="text-[10px] text-gray-400">Emergency</p></div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-bold text-gray-400 uppercase mb-2">Specialties</p>
              <div className="flex flex-wrap gap-1">
                {sel.specs?.map((s: string) => <span key={s} className="text-[10px] px-2 py-1 bg-purple-50 text-purple-600 rounded-full">{s}</span>)}
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <span className="text-xs bg-gray-50 rounded-lg px-3 py-1.5 text-gray-700">{sel.p1}</span>
              <span className="text-xs bg-gray-50 rounded-lg px-3 py-1.5 text-gray-700">{sel.p2}</span>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => { window.open(`tel:${sel.ph}`); }} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-semibold text-sm">📞 Call</button>
              <button onClick={() => { window.open(`https://maps.google.com/?q=${sel.nm}+${sel.ar}+Bangalore`); }} className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-semibold text-sm">📍 Directions</button>
            </div>
            <button onClick={() => setSel(null)} className="mt-2 w-full py-3 border border-gray-200 rounded-xl text-gray-600 text-sm">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
