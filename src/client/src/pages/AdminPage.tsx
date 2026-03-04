import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCMSStore } from '../stores/cmsStore';
import type { Product, Article, Doctor, TargetAudience, ProductCategory, ArticleCategory } from '../stores/cmsStore';
import toast from 'react-hot-toast';

const targetLabels: Record<TargetAudience, string> = { all: '\u{1F310} All', periods: '\u{1F33A} Periods', fertility: '\u{1F495} TTC', pregnancy: '\u{1F930} Pregnancy', wellness: '\u{1F9D8} Wellness' };
const catLabels: Record<ProductCategory, string> = { hair_oil: 'Hair Oil', body_lotion: 'Lotion', face_wash: 'Face Wash', body_wash: 'Body Wash', hair_treatment: 'Treatment', supplement: 'Supplement', skincare: 'Skincare' };
const artCats: ArticleCategory[] = ['Periods', 'Pregnancy', 'PCOD', 'Wellness', 'Nutrition', 'Mental Health', 'Fertility', 'Ayurveda', 'Skin & Hair'];

export default function AdminPage() {
  const nav = useNavigate();
  const cms = useCMSStore();
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [tab, setTab] = useState<'overview' | 'products' | 'articles' | 'doctors' | 'recipes' | 'addProduct' | 'addArticle' | 'addDoctor'>('overview');
  const [confirmDel, setConfirmDel] = useState<{ type: string; id: string } | null>(null);

  // Product form
  const emptyProduct = { name: '', category: 'hair_oil' as ProductCategory, price: 0, discountPrice: 0, description: '', ingredients: '', benefits: '', howToUse: '', size: '', emoji: '\u{1F33F}', target: ['all'] as TargetAudience[], doctorNote: '', preparationMethod: '' };
  const [pf, setPf] = useState(emptyProduct);

  // Article form
  const emptyArticle = { title: '', category: 'Periods' as ArticleCategory, summary: '', content: '', emoji: '\u{1F4DD}', readTime: '5 min', target: ['all'] as TargetAudience[] };
  const [af, setAf] = useState(emptyArticle);

  // Doctor form
  const emptyDoc = { name: '', title: '', qualification: '', experience: '', specialization: '', about: '', consultationFee: '', languages: '', emoji: '\u{1F469}\u200D\u2695\uFE0F' };
  const [df, setDf] = useState(emptyDoc);

  // ─── PIN Login Screen ──────────────────────────
  if (!cms.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(180deg, #ECFDF5 0%, #FAFAF9 100%)' }}>
        <div className="bg-white rounded-3xl p-6 shadow-lg text-center max-w-xs w-full">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 flex items-center justify-center text-3xl mb-4">{'\u{1F512}'}</div>
          <h2 className="text-lg font-extrabold text-gray-900">Admin Access</h2>
          <p className="text-xs text-gray-400 mt-1 mb-5">Enter your 4-digit PIN to manage SheBloom</p>

          {/* PIN Display */}
          <div className="flex justify-center gap-3 mb-5">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={'w-12 h-14 rounded-xl border-2 flex items-center justify-center text-xl font-extrabold transition-all ' +
                (pin.length > i ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-300')}>
                {pin.length > i ? '\u2022' : ''}
              </div>
            ))}
          </div>

          {pinError && <p className="text-xs text-red-500 font-bold mb-3">{'\u26A0\uFE0F'} Wrong PIN. Try again.</p>}

          {/* Number Pad */}
          <div className="grid grid-cols-3 gap-2 max-w-[220px] mx-auto">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'].map((n, i) => (
              n === null ? <div key={i} /> :
              <button key={i}
                onClick={() => {
                  if (n === 'del') { setPin(pin.slice(0, -1)); setPinError(false); return; }
                  const next = pin + n;
                  if (next.length <= 4) setPin(next);
                  if (next.length === 4) {
                    if (cms.loginAdmin(next)) { toast.success('Welcome, Admin!'); }
                    else { setPinError(true); setTimeout(() => setPin(''), 300); }
                  }
                }}
                className="w-full h-12 rounded-xl bg-gray-50 text-lg font-bold text-gray-800 active:bg-gray-200 active:scale-95 transition-all">
                {n === 'del' ? '\u232B' : n}
              </button>
            ))}
          </div>

          <button onClick={() => nav('/dashboard')} className="mt-5 text-xs text-gray-400 font-bold">Back to App</button>
        </div>
      </div>
    );
  }

  // ─── Helper Functions ──────────────────────────
  const toggleTarget = (arr: TargetAudience[], t: TargetAudience) => arr.includes(t) ? arr.filter(x => x !== t) : [...arr, t];

  const saveProduct = () => {
    if (!pf.name || !pf.description || pf.price <= 0) { toast.error('Fill required fields'); return; }
    cms.addProduct({
      id: 'p_' + Date.now(), name: pf.name, category: pf.category, price: pf.price,
      discountPrice: pf.discountPrice > 0 ? pf.discountPrice : undefined,
      description: pf.description, size: pf.size, emoji: pf.emoji,
      ingredients: pf.ingredients.split('\n').filter(Boolean),
      benefits: pf.benefits.split('\n').filter(Boolean),
      howToUse: pf.howToUse, rating: 5.0, reviews: 0, inStock: true,
      isPublished: false, isFeatured: false, targetAudience: pf.target, tags: [],
      preparationMethod: pf.preparationMethod || undefined,
      doctorNote: pf.doctorNote || undefined, createdAt: new Date().toISOString().split('T')[0],
    });
    toast.success('Product added (Draft)!');
    setPf(emptyProduct);
    setTab('products');
  };

  const saveArticle = () => {
    if (!af.title || !af.content) { toast.error('Fill required fields'); return; }
    const chief = cms.doctors.find(d => d.isChief);
    cms.addArticle({
      id: 'a_' + Date.now(), title: af.title, category: af.category,
      summary: af.summary, content: af.content, emoji: af.emoji,
      author: chief?.name || 'Dr. SheBloom', readTime: af.readTime,
      isPublished: false, isFeatured: false, targetAudience: af.target,
      createdAt: new Date().toISOString().split('T')[0],
    });
    toast.success('Article added (Draft)!');
    setAf(emptyArticle);
    setTab('articles');
  };

  const saveDoctor = () => {
    if (!df.name || !df.qualification) { toast.error('Fill required fields'); return; }
    cms.addDoctor({
      id: 'doc_' + Date.now(), name: df.name, title: df.title,
      qualification: df.qualification, experience: df.experience,
      specialization: df.specialization.split(',').map(s => s.trim()).filter(Boolean),
      about: df.about, consultationFee: df.consultationFee,
      freeForPoor: false, rating: 5.0, reviews: 0, emoji: df.emoji,
      languages: df.languages.split(',').map(s => s.trim()).filter(Boolean),
      isChief: false, isPublished: false,
    });
    toast.success('Doctor added (Draft)!');
    setDf(emptyDoc);
    setTab('doctors');
  };

  const doDelete = () => {
    if (!confirmDel) return;
    if (confirmDel.type === 'product') cms.deleteProduct(confirmDel.id);
    if (confirmDel.type === 'article') cms.deleteArticle(confirmDel.id);
    if (confirmDel.type === 'doctor') cms.deleteDoctor(confirmDel.id);
    setConfirmDel(null);
    toast.success('Deleted');
  };

  const stats = {
    products: cms.products.length, pubProducts: cms.products.filter(p => p.isPublished).length,
    articles: cms.articles.length, pubArticles: cms.articles.filter(a => a.isPublished).length,
    doctors: cms.doctors.length, pubDoctors: cms.doctors.filter(d => d.isPublished).length,
    recipes: cms.recipes.length,
  };

  // Input helper
  const Input = ({ label, value, onChange, multiline, placeholder }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean; placeholder?: string }) => (
    <div>
      <label className="text-[10px] font-bold text-gray-500 uppercase">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-emerald-400 focus:outline-none resize-none" rows={3} />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-emerald-400 focus:outline-none" />
      )}
    </div>
  );

  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: '#FAFAF9' }}>
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100">
        <div className="px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button onClick={() => nav('/dashboard')} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm active:scale-90">{'\u2190'}</button>
            <div>
              <h1 className="text-base font-extrabold text-gray-900">{'\u{1F6E1}\uFE0F'} Admin CMS</h1>
              <p className="text-[9px] text-emerald-600 font-bold">Manage Everything</p>
            </div>
          </div>
          <button onClick={() => { cms.logoutAdmin(); nav('/dashboard'); }} className="text-[10px] text-red-500 font-bold bg-red-50 px-3 py-1.5 rounded-full active:scale-95">{'\u{1F512}'} Lock</button>
        </div>
        {/* Tab Bar */}
        <div className="px-3 pb-2 flex gap-1 overflow-x-auto">
          {([
            ['overview', '\u{1F4CA}'], ['products', '\u{1F4E6}'], ['articles', '\u{1F4DD}'], ['doctors', '\u{1F469}\u200D\u2695\uFE0F'], ['recipes', '\u{1F52C}'],
          ] as const).map(([k, e]) => (
            <button key={k} onClick={() => setTab(k)}
              className={'px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap ' + (tab === k || (tab.startsWith('add') && tab.includes(k.slice(0, -1))) ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500')}>
              {e} {k.charAt(0).toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-4 space-y-3">
        {/* ═══ OVERVIEW ═══ */}
        {tab === 'overview' && (<>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { l: 'Products', n: stats.products, pub: stats.pubProducts, c: '#059669', bg: '#ECFDF5' },
              { l: 'Articles', n: stats.articles, pub: stats.pubArticles, c: '#2563EB', bg: '#EFF6FF' },
              { l: 'Doctors', n: stats.doctors, pub: stats.pubDoctors, c: '#7C3AED', bg: '#F5F3FF' },
              { l: 'Recipes', n: stats.recipes, pub: stats.recipes, c: '#D97706', bg: '#FFFBEB' },
            ].map(s => (
              <div key={s.l} className="rounded-2xl p-4 text-center" style={{ backgroundColor: s.bg }}>
                <p className="text-2xl font-extrabold" style={{ color: s.c }}>{s.n}</p>
                <p className="text-[10px] font-bold" style={{ color: s.c }}>{s.l}</p>
                <p className="text-[9px] text-gray-400">{s.pub} published</p>
              </div>
            ))}
          </div>

          <h3 className="text-xs font-bold text-gray-400 uppercase mt-4">Quick Actions</h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { l: 'Add Product', t: 'addProduct' as const, e: '\u{1F4E6}', c: '#059669' },
              { l: 'Write Article', t: 'addArticle' as const, e: '\u{1F4DD}', c: '#2563EB' },
              { l: 'Add Doctor', t: 'addDoctor' as const, e: '\u{1F469}\u200D\u2695\uFE0F', c: '#7C3AED' },
            ].map(a => (
              <button key={a.l} onClick={() => setTab(a.t)}
                className="bg-white rounded-2xl p-3 shadow-sm text-center active:scale-95 transition-transform">
                <span className="text-2xl block">{a.e}</span>
                <p className="text-[10px] font-bold mt-1" style={{ color: a.c }}>{a.l}</p>
              </button>
            ))}
          </div>

          {/* Chief Doctor Card */}
          {(() => {
            const chief = cms.doctors.find(d => d.isChief);
            return chief ? (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-100">
                <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider">Chief Doctor</p>
                <p className="text-sm font-extrabold text-gray-900 mt-0.5">{chief.name}</p>
                <p className="text-[10px] text-gray-500">{chief.title} \u2022 {chief.qualification}</p>
              </div>
            ) : null;
          })()}
        </>)}

        {/* ═══ PRODUCTS LIST ═══ */}
        {tab === 'products' && (<>
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500">{stats.products} products \u2022 {stats.pubProducts} live</p>
            <button onClick={() => setTab('addProduct')} className="text-[10px] font-bold text-white bg-emerald-600 px-3 py-1.5 rounded-full active:scale-95">{'\u2795'} Add</button>
          </div>
          {cms.products.map(p => (
            <div key={p.id} className="bg-white rounded-2xl p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{p.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-800 truncate">{p.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className={'text-[8px] font-bold px-1.5 py-0.5 rounded-full ' + (p.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500')}>{p.isPublished ? 'LIVE' : 'DRAFT'}</span>
                    {p.isFeatured && <span className="text-[8px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{'\u2605'}</span>}
                    <span className="text-[8px] text-gray-400">{'\u20B9'}{p.discountPrice || p.price}</span>
                    {p.targetAudience.filter(t => t !== 'all').map(t => <span key={t} className="text-[7px] bg-blue-50 text-blue-600 px-1 py-0.5 rounded">{t}</span>)}
                  </div>
                </div>
              </div>
              <div className="flex gap-1.5 mt-2 border-t border-gray-50 pt-2">
                <button onClick={() => cms.toggleProductPublish(p.id)} className={'flex-1 py-1.5 rounded-lg text-[9px] font-bold active:scale-95 ' + (p.isPublished ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600')}>{p.isPublished ? 'Unpublish' : 'Publish'}</button>
                <button onClick={() => cms.toggleProductFeatured(p.id)} className={'flex-1 py-1.5 rounded-lg text-[9px] font-bold active:scale-95 ' + (p.isFeatured ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-500')}>{p.isFeatured ? 'Unfeature' : 'Feature'}</button>
                <button onClick={() => setConfirmDel({ type: 'product', id: p.id })} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-500 text-[9px] font-bold active:scale-95">{'\u{1F5D1}'}</button>
              </div>
            </div>
          ))}
        </>)}

        {/* ═══ ARTICLES LIST ═══ */}
        {tab === 'articles' && (<>
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500">{stats.articles} articles \u2022 {stats.pubArticles} live</p>
            <button onClick={() => setTab('addArticle')} className="text-[10px] font-bold text-white bg-blue-600 px-3 py-1.5 rounded-full active:scale-95">{'\u2795'} Write</button>
          </div>
          {cms.articles.map(a => (
            <div key={a.id} className="bg-white rounded-2xl p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-xl">{a.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-800 truncate">{a.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={'text-[8px] font-bold px-1.5 py-0.5 rounded-full ' + (a.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500')}>{a.isPublished ? 'LIVE' : 'DRAFT'}</span>
                    {a.isFeatured && <span className="text-[8px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{'\u2605'}</span>}
                    <span className="text-[8px] text-gray-400">{a.category} \u2022 {a.readTime}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1.5 mt-2 border-t border-gray-50 pt-2">
                <button onClick={() => cms.toggleArticlePublish(a.id)} className={'flex-1 py-1.5 rounded-lg text-[9px] font-bold active:scale-95 ' + (a.isPublished ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600')}>{a.isPublished ? 'Unpublish' : 'Publish'}</button>
                <button onClick={() => cms.toggleArticleFeatured(a.id)} className={'flex-1 py-1.5 rounded-lg text-[9px] font-bold active:scale-95 ' + (a.isFeatured ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-500')}>{a.isFeatured ? 'Unfeature' : 'Feature'}</button>
                <button onClick={() => setConfirmDel({ type: 'article', id: a.id })} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-500 text-[9px] font-bold active:scale-95">{'\u{1F5D1}'}</button>
              </div>
            </div>
          ))}
        </>)}

        {/* ═══ DOCTORS LIST ═══ */}
        {tab === 'doctors' && (<>
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500">{stats.doctors} doctors \u2022 {stats.pubDoctors} published</p>
            <button onClick={() => setTab('addDoctor')} className="text-[10px] font-bold text-white bg-purple-600 px-3 py-1.5 rounded-full active:scale-95">{'\u2795'} Add</button>
          </div>
          {cms.doctors.map(d => (
            <div key={d.id} className={'bg-white rounded-2xl p-3 shadow-sm ' + (d.isChief ? 'ring-2 ring-emerald-300' : '')}>
              <div className="flex items-center gap-3">
                <div className={'w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white ' + (d.isChief ? 'bg-gradient-to-br from-emerald-500 to-teal-500' : 'bg-gray-300')}>
                  {d.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-gray-800 truncate">{d.name}</p>
                    {d.isChief && <span className="text-[8px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">CHIEF</span>}
                  </div>
                  <p className="text-[10px] text-gray-500 truncate">{d.title} \u2022 {d.qualification}</p>
                </div>
              </div>
              <div className="flex gap-1.5 mt-2 border-t border-gray-50 pt-2">
                <button onClick={() => cms.toggleDoctorPublish(d.id)} className={'flex-1 py-1.5 rounded-lg text-[9px] font-bold active:scale-95 ' + (d.isPublished ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600')}>{d.isPublished ? 'Hide' : 'Show'}</button>
                <button onClick={() => { cms.setChiefDoctor(d.id); toast.success(d.name + ' is now Chief Doctor!'); }} className={'flex-1 py-1.5 rounded-lg text-[9px] font-bold active:scale-95 ' + (d.isChief ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-50 text-gray-500')}>{d.isChief ? '\u{1F451} Chief' : 'Make Chief'}</button>
                {!d.isChief && <button onClick={() => setConfirmDel({ type: 'doctor', id: d.id })} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-500 text-[9px] font-bold active:scale-95">{'\u{1F5D1}'}</button>}
              </div>
            </div>
          ))}
        </>)}

        {/* ═══ RECIPES LIST ═══ */}
        {tab === 'recipes' && (<>
          <p className="text-xs text-gray-500">{stats.recipes} recipes</p>
          {cms.recipes.map(r => (
            <div key={r.id} className="bg-white rounded-2xl p-3 shadow-sm flex items-center gap-3">
              <span className="text-2xl">{r.emoji}</span>
              <div className="flex-1">
                <p className="text-xs font-bold text-gray-800">{r.title}</p>
                <span className={'text-[8px] font-bold px-1.5 py-0.5 rounded-full ' + (r.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500')}>{r.isPublished ? 'LIVE' : 'DRAFT'}</span>
              </div>
              <button onClick={() => cms.toggleRecipePublish(r.id)} className="text-[9px] font-bold text-emerald-600 active:scale-95">{r.isPublished ? 'Hide' : 'Show'}</button>
            </div>
          ))}
        </>)}

        {/* ═══ ADD PRODUCT FORM ═══ */}
        {tab === 'addProduct' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between"><h3 className="text-sm font-extrabold text-gray-900">{'\u{1F4E6}'} New Product</h3><button onClick={() => setTab('products')} className="text-[10px] text-gray-400 font-bold">{'\u2715'} Cancel</button></div>
            <Input label="Name *" value={pf.name} onChange={v => setPf({ ...pf, name: v })} placeholder="e.g. Bhringraj Hair Oil" />
            <Input label="Description *" value={pf.description} onChange={v => setPf({ ...pf, description: v })} multiline placeholder="Product description..." />
            <div className="grid grid-cols-3 gap-2">
              <div><label className="text-[10px] font-bold text-gray-500">Price *</label><input type="number" value={pf.price || ''} onChange={e => setPf({ ...pf, price: +e.target.value })} className="w-full mt-1 px-2 py-2 border border-gray-200 rounded-xl text-xs" /></div>
              <div><label className="text-[10px] font-bold text-gray-500">Offer Price</label><input type="number" value={pf.discountPrice || ''} onChange={e => setPf({ ...pf, discountPrice: +e.target.value })} className="w-full mt-1 px-2 py-2 border border-gray-200 rounded-xl text-xs" /></div>
              <div><label className="text-[10px] font-bold text-gray-500">Size</label><input value={pf.size} onChange={e => setPf({ ...pf, size: e.target.value })} className="w-full mt-1 px-2 py-2 border border-gray-200 rounded-xl text-xs" placeholder="200ml" /></div>
            </div>
            <Input label="Emoji" value={pf.emoji} onChange={v => setPf({ ...pf, emoji: v })} placeholder="\u{1F33F}" />
            <Input label="Ingredients (one per line)" value={pf.ingredients} onChange={v => setPf({ ...pf, ingredients: v })} multiline placeholder="Bhringraj\nAmla\nCoconut Oil" />
            <Input label="Benefits (one per line)" value={pf.benefits} onChange={v => setPf({ ...pf, benefits: v })} multiline placeholder="Reduces hairfall\nPromotes growth" />
            <Input label="How to Use" value={pf.howToUse} onChange={v => setPf({ ...pf, howToUse: v })} multiline placeholder="Application instructions..." />
            <Input label="Doctor's Note" value={pf.doctorNote} onChange={v => setPf({ ...pf, doctorNote: v })} multiline placeholder="Personal recommendation..." />
            <div><label className="text-[10px] font-bold text-gray-500 uppercase">Category</label>
              <div className="flex flex-wrap gap-1.5 mt-1">{(Object.entries(catLabels) as [ProductCategory, string][]).map(([k, v]) => (<button key={k} onClick={() => setPf({ ...pf, category: k })} className={'px-2.5 py-1.5 rounded-full text-[10px] font-bold ' + (pf.category === k ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500')}>{v}</button>))}</div>
            </div>
            <div><label className="text-[10px] font-bold text-gray-500 uppercase">Show to</label>
              <div className="flex flex-wrap gap-1.5 mt-1">{(Object.entries(targetLabels) as [TargetAudience, string][]).map(([k, v]) => (<button key={k} onClick={() => setPf({ ...pf, target: toggleTarget(pf.target, k) })} className={'px-2.5 py-1.5 rounded-full text-[10px] font-bold ' + (pf.target.includes(k) ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500')}>{v}</button>))}</div>
            </div>
            <button onClick={saveProduct} className="w-full py-3.5 rounded-2xl text-white font-bold text-sm active:scale-95" style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}>Add Product (as Draft)</button>
          </div>
        )}

        {/* ═══ ADD ARTICLE FORM ═══ */}
        {tab === 'addArticle' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between"><h3 className="text-sm font-extrabold text-gray-900">{'\u{1F4DD}'} New Article</h3><button onClick={() => setTab('articles')} className="text-[10px] text-gray-400 font-bold">{'\u2715'} Cancel</button></div>
            <Input label="Title *" value={af.title} onChange={v => setAf({ ...af, title: v })} placeholder="Article title..." />
            <Input label="Summary" value={af.summary} onChange={v => setAf({ ...af, summary: v })} multiline placeholder="Brief summary for card..." />
            <Input label="Full Content *" value={af.content} onChange={v => setAf({ ...af, content: v })} multiline placeholder="Write your article here... Use \u2022 for bullet points" />
            <Input label="Emoji" value={af.emoji} onChange={v => setAf({ ...af, emoji: v })} placeholder="\u{1F4DD}" />
            <Input label="Read Time" value={af.readTime} onChange={v => setAf({ ...af, readTime: v })} placeholder="5 min" />
            <div><label className="text-[10px] font-bold text-gray-500 uppercase">Category</label>
              <div className="flex flex-wrap gap-1.5 mt-1">{artCats.map(c => (<button key={c} onClick={() => setAf({ ...af, category: c })} className={'px-2.5 py-1.5 rounded-full text-[10px] font-bold ' + (af.category === c ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500')}>{c}</button>))}</div>
            </div>
            <div><label className="text-[10px] font-bold text-gray-500 uppercase">Show to</label>
              <div className="flex flex-wrap gap-1.5 mt-1">{(Object.entries(targetLabels) as [TargetAudience, string][]).map(([k, v]) => (<button key={k} onClick={() => setAf({ ...af, target: toggleTarget(af.target, k) })} className={'px-2.5 py-1.5 rounded-full text-[10px] font-bold ' + (af.target.includes(k) ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500')}>{v}</button>))}</div>
            </div>
            <button onClick={saveArticle} className="w-full py-3.5 rounded-2xl text-white font-bold text-sm active:scale-95" style={{ background: 'linear-gradient(135deg, #2563EB, #3B82F6)' }}>Publish Article (as Draft)</button>
          </div>
        )}

        {/* ═══ ADD DOCTOR FORM ═══ */}
        {tab === 'addDoctor' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between"><h3 className="text-sm font-extrabold text-gray-900">{'\u{1F469}\u200D\u2695\uFE0F'} New Doctor</h3><button onClick={() => setTab('doctors')} className="text-[10px] text-gray-400 font-bold">{'\u2715'} Cancel</button></div>
            <Input label="Full Name *" value={df.name} onChange={v => setDf({ ...df, name: v })} placeholder="Dr. Full Name" />
            <Input label="Title" value={df.title} onChange={v => setDf({ ...df, title: v })} placeholder="Senior Gynecologist" />
            <Input label="Qualification *" value={df.qualification} onChange={v => setDf({ ...df, qualification: v })} placeholder="MBBS, MD (OB-GYN)" />
            <Input label="Experience" value={df.experience} onChange={v => setDf({ ...df, experience: v })} placeholder="10+ years" />
            <Input label="Specializations (comma-separated)" value={df.specialization} onChange={v => setDf({ ...df, specialization: v })} placeholder="PCOD, Fertility, Pregnancy" />
            <Input label="About" value={df.about} onChange={v => setDf({ ...df, about: v })} multiline placeholder="Doctor's bio..." />
            <Input label="Consultation Fee" value={df.consultationFee} onChange={v => setDf({ ...df, consultationFee: v })} placeholder="\u20B9500" />
            <Input label="Languages (comma-separated)" value={df.languages} onChange={v => setDf({ ...df, languages: v })} placeholder="English, Hindi" />
            <button onClick={saveDoctor} className="w-full py-3.5 rounded-2xl text-white font-bold text-sm active:scale-95" style={{ background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)' }}>Add Doctor (as Draft)</button>
          </div>
        )}
      </div>

      {/* Delete Confirm */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6" onClick={() => setConfirmDel(null)}>
          <div className="bg-white rounded-2xl p-5 text-center max-w-xs" onClick={e => e.stopPropagation()}>
            <span className="text-3xl">{'\u26A0\uFE0F'}</span>
            <h3 className="text-sm font-extrabold mt-2">Delete {confirmDel.type}?</h3>
            <p className="text-xs text-gray-500 mt-1">This cannot be undone.</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setConfirmDel(null)} className="flex-1 py-2.5 bg-gray-100 rounded-xl text-xs font-bold">Cancel</button>
              <button onClick={doDelete} className="flex-1 py-2.5 bg-red-500 rounded-xl text-xs font-bold text-white">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
