import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAyurvedaStore } from '../stores/ayurvedaStore';
import { useCycleStore } from '../stores/cycleStore';

export default function ArticlesPage() {
  const nav = useNavigate();
  const { articles, getChiefDoctor } = useAyurvedaStore();
  const { goal } = useCycleStore();
  const [cat, setCat] = useState('All');
  const [selArticle, setSelArticle] = useState<any>(null);
  const [searchQ, setSearchQ] = useState('');

  const chief = getChiefDoctor();

  const visible = useMemo(() => {
    return articles.filter(a => a.isPublished)
      .filter(a => a.targetAudience.includes('all') || a.targetAudience.includes(goal as any));
  }, [articles, goal]);

  const cats = ['All', ...Array.from(new Set(visible.map(a => a.category)))];
  const filtered = visible
    .filter(a => cat === 'All' || a.category === cat)
    .filter(a => !searchQ || a.title.toLowerCase().includes(searchQ.toLowerCase()) || a.summary?.toLowerCase().includes(searchQ.toLowerCase()));
  const featured = visible.filter(a => a.isFeatured);

  const authorName = (a: any) => a.author === 'chief' ? chief.name : a.author;

  return (
    <div className="min-h-screen pb-10" style={{ backgroundColor: '#FAFAF9' }}>
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md px-5 py-3 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => nav('/dashboard')} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm active:scale-90">{'\u2190'}</button>
        <h1 className="text-base font-extrabold flex-1">Health Articles</h1>
        <span className="text-[9px] text-gray-400 font-bold">{visible.length} articles</span>
      </div>

      <div className="px-5 pt-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{'\u{1F50D}'}</span>
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search articles..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm outline-none bg-white focus:border-rose-400" />
        </div>

        {/* Featured Carousel */}
        {!searchQ && featured.length > 0 && (
          <div className="overflow-x-auto -mx-5 px-5">
            <div className="flex gap-3 min-w-max pb-2">
              {featured.map((a, idx) => {
                const gradients = [
                  'linear-gradient(135deg, #7C3AED, #EC4899)',
                  'linear-gradient(135deg, #059669, #10B981)',
                  'linear-gradient(135deg, #2563EB, #7C3AED)',
                ];
                return (
                  <button key={a.id} onClick={() => setSelArticle(a)}
                    className="w-72 rounded-2xl p-5 text-white text-left flex-shrink-0 active:scale-[0.98] transition-transform relative overflow-hidden"
                    style={{ background: gradients[idx % gradients.length] }}>
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded-full font-bold">{'\u{1F31F}'} Featured</span>
                        <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded-full font-bold">{a.category}</span>
                      </div>
                      <h3 className="font-extrabold text-base leading-tight line-clamp-2">{a.title}</h3>
                      <p className="text-[10px] text-white/70 mt-2 line-clamp-2">{a.summary}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[8px] font-bold">{authorName(a).charAt(0)}</div>
                        <span className="text-[10px] text-white/80">{authorName(a)} {'\u2022'} {a.readTime}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5">
          {cats.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={'px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ' + (cat === c ? 'bg-rose-500 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-500')}>
              {c}
            </button>
          ))}
        </div>

        {/* Article List */}
        {filtered.map(a => (
          <button key={a.id} onClick={() => setSelArticle(a)} className="w-full bg-white rounded-2xl p-4 shadow-sm text-left active:scale-[0.98] transition-transform">
            <div className="flex gap-3">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ backgroundColor: '#F5F3FF' }}>{a.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600">{a.category}</span>
                  {a.isFeatured && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">{'\u2605'}</span>}
                </div>
                <h4 className="text-sm font-bold text-gray-800 leading-tight line-clamp-2">{a.title}</h4>
                {a.summary && <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{a.summary}</p>}
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-[7px] text-white font-bold">{authorName(a).charAt(0)}</div>
                  <span className="text-[10px] text-gray-400">{authorName(a)} {'\u2022'} {a.readTime}</span>
                </div>
              </div>
            </div>
          </button>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <span className="text-5xl">{'\u{1F4DD}'}</span>
            <p className="text-sm font-bold text-gray-400 mt-3">{searchQ ? 'No matching articles' : 'No articles in this category'}</p>
          </div>
        )}
      </div>

      {/* Article Reader */}
      {selArticle && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md px-5 py-3 flex items-center justify-between border-b border-gray-100">
            <button onClick={() => setSelArticle(null)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm active:scale-90">{'\u2190'}</button>
            <span className="text-[10px] font-bold text-gray-400">{selArticle.readTime} read</span>
          </div>
          <div className="px-5 pt-5 pb-10 max-w-prose mx-auto">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-600">{selArticle.category}</span>
            <h1 className="text-2xl font-extrabold text-gray-900 mt-3 leading-tight">{selArticle.title}</h1>
            {selArticle.summary && <p className="text-sm text-gray-500 mt-2 leading-relaxed">{selArticle.summary}</p>}

            <div className="flex items-center gap-3 mt-4 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm">
                {authorName(selArticle).charAt(0)}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">{authorName(selArticle)}</p>
                <p className="text-[10px] text-gray-400">{selArticle.author === 'chief' ? chief.specialization + ' • ' : ''}{selArticle.readTime} read</p>
              </div>
            </div>

            <div className="mt-6 text-[15px] text-gray-700 leading-[1.8] whitespace-pre-line">
              {selArticle.content}
            </div>

            <div className="mt-8 bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
              <p className="text-xs font-bold text-emerald-800">{'\u{1F4AC}'} Have questions about this topic?</p>
              <p className="text-[10px] text-emerald-700 mt-1">{chief.name} is available for personal consultations.</p>
              <button onClick={() => { setSelArticle(null); nav('/appointments'); }} className="mt-2 text-xs font-bold text-emerald-600 underline">Book a Consultation {'\u2192'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
