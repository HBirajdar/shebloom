import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doctorAPI } from '../services/api';

const CATS = ['All','Gynecologist','Obstetrician','Fertility','Dermatologist','Nutritionist'];

const fallback = [
  { id:'1', fullName:'Dr. Priya Sharma', specialization:'Gynecologist', experienceYears:12, rating:4.9, totalReviews:847, consultationFee:300, tags:['PCOD Expert'], languages:['ENGLISH','HINDI'] },
  { id:'2', fullName:'Dr. Anita Desai', specialization:'Obstetrician', experienceYears:18, rating:4.8, totalReviews:1203, consultationFee:500, tags:['High Risk'], languages:['ENGLISH'] },
  { id:'3', fullName:'Dr. Meera Nair', specialization:'Fertility Specialist', experienceYears:15, rating:4.9, totalReviews:632, consultationFee:450, tags:['IVF'], languages:['ENGLISH','TAMIL'] },
  { id:'4', fullName:'Dr. Kavitha Rao', specialization:'Dermatologist', experienceYears:10, rating:4.7, totalReviews:489, consultationFee:250, tags:['Hormonal Acne'], languages:['ENGLISH','KANNADA'] },
  { id:'5', fullName:'Dr. Sunita Gupta', specialization:'Nutritionist', experienceYears:8, rating:4.8, totalReviews:356, consultationFee:200, tags:['PCOS Diet'], languages:['ENGLISH','HINDI'] },
];

export default function DoctorsPage() {
  const nav = useNavigate();
  const [docs, setDocs] = useState(fallback);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [sel, setSel] = useState<any>(null);

  useEffect(() => {
    doctorAPI.search({}).then(r => { if (r.data.data?.length) setDocs(r.data.data); }).catch(() => {});
  }, []);

  const filtered = docs.filter(d => {
    const matchQ = !q || d.fullName.toLowerCase().includes(q.toLowerCase()) || d.specialization.toLowerCase().includes(q.toLowerCase());
    const matchC = cat === 'All' || d.specialization.toLowerCase().includes(cat.toLowerCase());
    return matchQ && matchC;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="sticky top-0 z-10 bg-white px-5 py-4 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => nav('/dashboard')}>&#8592;</button>
        <h1 className="text-lg font-bold">Find Doctors</h1>
      </div>
      <div className="px-5 pt-4 space-y-4">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search doctors..." className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none bg-white" />
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {CATS.map(c => <button key={c} onClick={() => setCat(c)} className={'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border ' + (cat === c ? 'border-rose-400 bg-rose-50 text-rose-600' : 'border-gray-200 text-gray-500')}>{c}</button>)}
        </div>
        {filtered.map(d => (
          <button key={d.id} onClick={() => setSel(d)} className="w-full bg-white rounded-2xl p-4 shadow-sm text-left">
            <div className="flex gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-400 to-pink-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{d.fullName.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-sm">{d.fullName}</p>
                <p className="text-xs text-gray-500">{d.specialization} &middot; {d.experienceYears} yrs</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-amber-500">&#9733; {d.rating}</span>
                  <span className="text-[10px] text-gray-400">({d.totalReviews} reviews)</span>
                </div>
                <div className="flex gap-1 mt-2 flex-wrap">{d.tags?.map(t => <span key={t} className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full">{t}</span>)}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-bold text-emerald-600">&#8377;{d.consultationFee}</p>
                <p className="text-[10px] text-gray-400">per visit</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {sel && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={() => setSel(null)}>
          <div className="bg-white w-full max-w-[430px] mx-auto rounded-t-3xl p-6" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <div className="text-center mb-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-rose-400 to-pink-400 flex items-center justify-center text-white font-bold text-xl mb-2">{sel.fullName.charAt(0)}</div>
              <h3 className="font-bold text-lg">{sel.fullName}</h3>
              <p className="text-sm text-gray-500">{sel.specialization}</p>
            </div>
            <div className="flex justify-around mb-4">
              <div className="text-center"><p className="text-xl font-bold text-rose-600">&#9733; {sel.rating}</p><p className="text-xs text-gray-400">Rating</p></div>
              <div className="text-center"><p className="text-xl font-bold text-blue-600">{sel.experienceYears}</p><p className="text-xs text-gray-400">Years</p></div>
              <div className="text-center"><p className="text-xl font-bold text-purple-600">{sel.totalReviews}</p><p className="text-xs text-gray-400">Reviews</p></div>
            </div>
            <button onClick={() => nav('/appointments')} className="w-full py-3 bg-rose-500 text-white rounded-xl font-semibold mb-2">Book Appointment</button>
            <button onClick={() => setSel(null)} className="w-full py-3 border border-gray-200 rounded-xl text-gray-600 text-sm">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
