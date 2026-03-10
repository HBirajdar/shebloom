// @ts-nocheck
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAyurvedaStore } from '../stores/ayurvedaStore';

const CATS = ['All', 'Ayurveda', 'Gynecologist', 'Obstetrician', 'Fertility', 'Dermatologist', 'Nutritionist'];

export default function DoctorsPage() {
  const nav = useNavigate();
  const { doctors, getChiefDoctor } = useAyurvedaStore();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [sel, setSel] = useState<any>(null);

  const published = doctors.filter(d => d.isPublished);
  const chief = getChiefDoctor();
  const others = published.filter(d => !d.isChief);

  const filtered = others.filter(d => {
    const matchQ = !q || d.name.toLowerCase().includes(q.toLowerCase()) || d.specialization.toLowerCase().includes(q.toLowerCase());
    const matchC = cat === 'All' || d.specialization.toLowerCase().includes(cat.toLowerCase());
    return matchQ && matchC;
  });

  return (
    <div className="min-h-screen pb-24 bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      <div className="sticky top-0 z-10 backdrop-blur-xl border-b border-rose-100 px-5 py-3 flex items-center gap-3" style={{ backgroundColor: 'rgba(255,241,242,0.85)' }}>
        <button onClick={() => nav('/dashboard')} className="w-9 h-9 rounded-2xl bg-white/80 flex items-center justify-center text-sm active:scale-95 transition-all shadow-sm">{'\u2190'}</button>
        <h1 className="text-base font-extrabold text-gray-900">Our Doctors 👩‍⚕️</h1>
      </div>

      <div className="px-5 pt-4 space-y-4">
        {/* Chief Doctor Hero Card */}
        {chief && (
          <button onClick={() => setSel(chief)} className="w-full text-left active:scale-[0.98] transition-transform">
            <div className="rounded-3xl p-5 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #065F46, #059669, #10B981)' }}>
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
              <div className="absolute -right-4 -bottom-10 w-24 h-24 bg-white/5 rounded-full" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl text-white font-extrabold border-2 border-white/30 shadow-lg backdrop-blur-sm">
                  {chief.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[9px] bg-white/20 px-2 py-0.5 rounded-full font-bold backdrop-blur-sm">{'\u{1F451}'} Chief Doctor</p>
                    {chief.feeFreeForPoor && <p className="text-[9px] bg-white/20 px-2 py-0.5 rounded-full font-bold">{'\u2764\uFE0F'} Free for needy</p>}
                  </div>
                  <h2 className="text-lg font-extrabold mt-1">{chief.name}</h2>
                  <p className="text-xs text-white/80">{chief.specialization} • {chief.qualification}</p>
                  <p className="text-xs text-white/70 mt-0.5">{chief.experience} years experience • {'\u2605'} {chief.rating}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3 relative z-10">
                {chief.tags.map(t => (
                  <span key={t} className="text-[9px] bg-white/15 px-2 py-0.5 rounded-full text-white/90 font-medium backdrop-blur-sm">{t}</span>
                ))}
              </div>
              <p className="text-[10px] text-white/70 mt-3 relative z-10 leading-relaxed">{chief.about}</p>
            </div>
          </button>
        )}

        {/* Search */}
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="🔍 Search doctors..."
          className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-100 text-sm outline-none bg-white focus:border-rose-400 focus:bg-white transition-colors shadow-lg" />

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5">
          {CATS.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={'px-3 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 ' + (cat === c ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-200' : 'bg-white border border-gray-100 text-gray-500')}>
              {c}
            </button>
          ))}
        </div>

        {/* Doctor List */}
        <p className="text-xs text-gray-400 font-bold">{filtered.length} doctors available</p>
        {filtered.map(d => (
          <button key={d.id} onClick={() => setSel(d)} className="w-full bg-white rounded-3xl p-4 shadow-lg text-left active:scale-[0.98] transition-transform">
            <div className="flex gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
                {d.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-sm">{d.name}</p>
                <p className="text-[10px] text-gray-500">{d.specialization} • {d.experience} yrs • {d.qualification}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-amber-500 font-bold">{'\u2605'} {d.rating}</span>
                  <span className="text-[10px] text-gray-400">({d.reviews} reviews)</span>
                </div>
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {d.tags.map(t => <span key={t} className="text-[9px] px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full font-medium">{t}</span>)}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-extrabold text-emerald-600">{'\u20B9'}{d.fee}</p>
                <p className="text-[9px] text-gray-400">per visit</p>
                {d.feeFreeForPoor && <p className="text-[8px] text-rose-500 font-bold mt-0.5">{'\u2764\uFE0F'} Free for needy</p>}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Doctor Detail Modal */}
      {sel && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end" onClick={() => setSel(null)}>
          <div className="bg-white w-full max-w-[430px] mx-auto rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <div className="text-center mb-4">
              <div className={'w-20 h-20 mx-auto rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl mb-3 shadow-lg ' + (sel.isChief ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-rose-400 to-pink-500')}>
                {sel.name.charAt(0)}
              </div>
              {sel.isChief && <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">{'\u{1F451}'} Chief Doctor • SheBloom</span>}
              <h3 className="font-extrabold text-xl mt-2">{sel.name}</h3>
              <p className="text-sm text-gray-500">{sel.specialization}</p>
              <p className="text-xs text-gray-400">{sel.qualification}</p>
            </div>
            <div className="flex justify-around mb-4 bg-gray-50 rounded-2xl p-3">
              <div className="text-center"><p className="text-xl font-extrabold text-amber-500">{sel.rating}</p><p className="text-[9px] text-gray-400">Rating</p></div>
              <div className="text-center"><p className="text-xl font-extrabold text-blue-600">{sel.experience}</p><p className="text-[9px] text-gray-400">Years</p></div>
              <div className="text-center"><p className="text-xl font-extrabold text-purple-600">{sel.reviews}</p><p className="text-[9px] text-gray-400">Reviews</p></div>
              <div className="text-center"><p className="text-xl font-extrabold text-emerald-600">{'\u20B9'}{sel.fee}</p><p className="text-[9px] text-gray-400">Fee</p></div>
            </div>
            {sel.about && <p className="text-xs text-gray-600 leading-relaxed mb-3">{sel.about}</p>}
            {sel.feeFreeForPoor && (
              <div className="bg-rose-50 rounded-xl p-3 mb-3 border border-rose-100">
                <p className="text-xs font-bold text-rose-700">{'\u2764\uFE0F'} Free for Those in Need</p>
                <p className="text-[10px] text-rose-600">Doctor provides free consultations for patients who cannot afford treatment.</p>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {sel.tags?.map((t: string) => <span key={t} className="text-[9px] px-2 py-1 bg-purple-50 text-purple-600 rounded-full font-bold">{t}</span>)}
            </div>
            {sel.languages && <p className="text-[10px] text-gray-500 mb-4">{'\u{1F5E3}\uFE0F'} {sel.languages.join(', ')}</p>}
            <button onClick={() => nav('/appointments')} className="w-full py-3.5 rounded-2xl text-white font-bold active:scale-95 transition-transform shadow-md shadow-rose-200 bg-gradient-to-r from-rose-500 to-pink-500">
              Book Appointment {'\u2192'}
            </button>
            <button onClick={() => setSel(null)} className="w-full py-3 mt-2 border border-gray-200 rounded-2xl text-gray-600 text-sm font-bold active:scale-95">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
