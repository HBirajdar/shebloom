import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const articles = [
  { id: '1', title: 'Understanding PCOD: A Complete Guide', cat: 'PCOD', by: 'Dr. Priya Sharma', time: '8 min', featured: true },
  { id: '2', title: '5 Natural Remedies for Period Pain', cat: 'Periods', by: 'Dr. Kavitha Rao', time: '5 min', featured: false },
  { id: '3', title: 'First Trimester: What to Expect', cat: 'Pregnancy', by: 'Dr. Anita Desai', time: '10 min', featured: false },
  { id: '4', title: 'Yoga Poses for Menstrual Relief', cat: 'Wellness', by: 'Dr. Meera Nair', time: '6 min', featured: false },
  { id: '5', title: 'Hormonal Imbalance: 7 Warning Signs', cat: 'Health', by: 'Dr. Sunita Gupta', time: '7 min', featured: false },
  { id: '6', title: 'Nutrition Tips During Your Period', cat: 'Nutrition', by: 'Dr. Sunita Gupta', time: '4 min', featured: false },
  { id: '7', title: 'Mental Health and PMS Connection', cat: 'Mental Health', by: 'Dr. Priya Sharma', time: '9 min', featured: true },
];

export default function ArticlesPage() {
  const nav = useNavigate();
  const [cat, setCat] = useState('All');
  const cats = ['All', 'Periods', 'Pregnancy', 'PCOD', 'Wellness', 'Nutrition', 'Mental Health'];
  const filtered = articles.filter(a => cat === 'All' || a.cat === cat);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 z-10 bg-white px-5 py-4 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => nav('/dashboard')}>&#8592;</button>
        <h1 className="text-lg font-bold">Articles</h1>
      </div>
      <div className="px-5 pt-4 space-y-4">
        <button onClick={() => nav('/articles/1')} className="w-full text-left bg-gradient-to-r from-rose-500 to-pink-600 rounded-2xl p-5 text-white">
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">Featured</span>
          <h3 className="font-bold text-lg mt-2 leading-tight">{articles[0].title}</h3>
          <p className="text-xs opacity-80 mt-1">{articles[0].by} &middot; {articles[0].time} read</p>
        </button>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {cats.map(c => (
            <button key={c} onClick={() => setCat(c)} className={'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border-2 ' + (cat === c ? 'border-rose-400 bg-rose-50 text-rose-600' : 'border-gray-200 text-gray-500')}>{c}</button>
          ))}
        </div>

        {filtered.map(a => (
          <button key={a.id} onClick={() => nav('/articles/' + a.id)} className="w-full bg-white rounded-2xl p-4 shadow-sm flex gap-3 text-left">
            <div className="w-16 h-16 rounded-xl bg-rose-50 flex items-center justify-center text-2xl flex-shrink-0">&#128221;</div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600">{a.cat}</span>
              <h4 className="text-sm font-bold text-gray-800 mt-1 leading-tight">{a.title}</h4>
              <p className="text-[11px] text-gray-400 mt-1">{a.by} &middot; {a.time}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
