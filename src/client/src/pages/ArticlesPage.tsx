import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAyurvedaStore } from '../stores/ayurvedaStore';
import { useCycleStore } from '../stores/cycleStore';

export default function ArticlesPage() {
  const nav = useNavigate();
  const { articles, doctors } = useAyurvedaStore();
  const { goal } = useCycleStore();
  const [cat, setCat] = useState('All');
  const [selArticle, setSelArticle] = useState<any>(null);

  const chief = doctors.find(d => d.isChief);

  const visible = useMemo(() => {
    return articles
      .filter(a => a.isPublished)
      .filter(a => a.targetAudience.includes('all') || a.targetAudience.includes(goal as any));
  }, [articles, goal]);

  const cats = ['All', ...Array.from(new Set(visible.map(a => a.category)))];
  const filtered = visible.filter(a => cat === 'All' || a.category === cat);
  const featured = visible.filter(a => a.isFeatured);

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#FAFAF9' }}>
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md px-5 py-3 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => nav('/dashboard')} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm active:scale-90">{'\u2190'}</button>
        <h1 className="text-base font-extrabold">Articles</h1>
      </div>

      <div className="px-5 pt-4 space-y-4">
        {/* Featured Article */}
        {featured.length > 0 && (
          <button onClick={() => setSelArticle(featured[0])} className="w-full text-left rounded-2xl p-5 text-white relative overflow-hidden active:scale-[0.98] transition-transform" style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}>
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full" />
            <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded-full font-bold">{'\u{1F31F}'} Featured</span>
            <h3 className="font-extrabold text-lg mt-2 leading-tight">{featured[0].title}</h3>
            <p className="text-xs text-white/70 mt-1">{chief ? chief.name : featured[0].author} • {featured[0].readTime} read</p>
          </button>
        )}

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5">
          {cats.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={'px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ' + (cat === c ? 'bg-rose-100 text-rose-600' : 'bg-white border border-gray-200 text-gray-500')}>
              {c}
            </button>
          ))}
        </div>

        {/* Article List */}
        {filtered.map(a => (
          <button key={a.id} onClick={() => setSelArticle(a)} className="w-full bg-white rounded-2xl p-4 shadow-sm flex gap-3 text-left active:scale-[0.98] transition-transform">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ backgroundColor: '#F5F3FF' }}>{a.emoji}</div>
            <div className="flex-1 min-w-0">
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600">{a.category}</span>
              <h4 className="text-sm font-bold text-gray-800 mt-1 leading-tight line-clamp-2">{a.title}</h4>
              <p className="text-[10px] text-gray-400 mt-1">{chief && a.author === 'chief' ? chief.name : a.author} • {a.readTime}</p>
            </div>
          </button>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-10">
            <span className="text-4xl">{'\u{1F4DD}'}</span>
            <p className="text-sm text-gray-400 mt-2">No articles in this category yet</p>
          </div>
        )}
      </div>

      {/* Article Reader Modal */}
      {selArticle && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end" onClick={() => setSelArticle(null)}>
          <div className="bg-white w-full max-w-[430px] mx-auto rounded-t-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3" />
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600">{selArticle.category}</span>
                <button onClick={() => setSelArticle(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm">{'\u2715'}</button>
              </div>
              <h2 className="text-xl font-extrabold text-gray-900 leading-tight">{selArticle.title}</h2>
              <div className="flex items-center gap-2 mt-2 mb-4">
                {chief && selArticle.author === 'chief' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold">{chief.name.charAt(0)}</div>
                )}
                <div>
                  <p className="text-xs font-bold text-gray-700">{chief && selArticle.author === 'chief' ? chief.name : selArticle.author}</p>
                  <p className="text-[10px] text-gray-400">{selArticle.readTime} read</p>
                </div>
              </div>
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{selArticle.content}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
