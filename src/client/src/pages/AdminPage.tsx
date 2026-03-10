// @ts-nocheck
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAyurvedaStore } from '../stores/ayurvedaStore';
import type { AyurvedaProduct, Article, TargetAudience, ProductCategory, DoctorListing } from '../stores/ayurvedaStore';
import toast from 'react-hot-toast';

const targetOpts: { k: TargetAudience; l: string }[] = [
  { k: 'all', l: '\u{1F310} All' }, { k: 'periods', l: '\u{1F33A} Periods' },
  { k: 'fertility', l: '\u{1F495} TTC' }, { k: 'pregnancy', l: '\u{1F930} Pregnancy' }, { k: 'wellness', l: '\u{1F9D8} Wellness' },
];
const catOpts: { k: ProductCategory; l: string }[] = [
  { k: 'hair_oil', l: 'Hair Oil' }, { k: 'skincare', l: 'Skincare' }, { k: 'face_wash', l: 'Face Wash' },
  { k: 'body_lotion', l: 'Lotion' }, { k: 'body_wash', l: 'Body Wash' }, { k: 'hair_treatment', l: 'Treatment' }, { k: 'supplement', l: 'Supplement' },
];

// Standalone form components (outside render to prevent re-mount)
const FormField = ({ label, value, onChange, placeholder, multiline }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; multiline?: boolean }) => (
  <div>
    <label className="text-[9px] font-bold text-gray-500 uppercase">{label}</label>
    {multiline ? (
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full mt-0.5 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-emerald-400 focus:outline-none resize-none" rows={3} />
    ) : (
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full mt-0.5 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-emerald-400 focus:outline-none" />
    )}
  </div>
);
const FormNumField = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
  <div>
    <label className="text-[9px] font-bold text-gray-500 uppercase">{label}</label>
    <input type="number" value={value || ''} onChange={e => onChange(+e.target.value)}
      className="w-full mt-0.5 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-emerald-400 focus:outline-none" />
  </div>
);
const FormTargetPicker = ({ value, onChange, opts }: { value: TargetAudience[]; onChange: (v: TargetAudience[]) => void; opts: { k: TargetAudience; l: string }[] }) => (
  <div>
    <label className="text-[9px] font-bold text-gray-500 uppercase">Visible To</label>
    <div className="flex flex-wrap gap-1 mt-1">
      {opts.map(t => (
        <button key={t.k} onClick={() => onChange(value.includes(t.k) ? value.filter(x => x !== t.k) : [...value, t.k])}
          className={'px-2 py-1 rounded-lg text-[9px] font-bold ' + (value.includes(t.k) ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500')}>{t.l}</button>
      ))}
    </div>
  </div>
);

export default function AdminPage() {
  const nav = useNavigate();
  const store = useAyurvedaStore();
  const { isAdminUnlocked, unlockAdmin, lockAdmin, changePin,
    products, articles, doctors, recipes,
    togglePublish, toggleFeatured, deleteProduct, addProduct,
    toggleArticlePublish, toggleArticleFeatured, deleteArticle, addArticle,
    addDoctor, updateDoctor, deleteDoctor, toggleDoctorPublish } = store;

  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [passError, setPassError] = useState('');
  const [tab, setTab] = useState<'overview' | 'products' | 'articles' | 'doctors' | 'callbacks' | 'add_product' | 'add_article' | 'add_doctor' | 'settings'>('overview');
  const [confirmDel, setConfirmDel] = useState<{ id: string; type: string } | null>(null);

  // Form states
  const [np, setNp] = useState({ name: '', category: 'hair_oil' as ProductCategory, price: 0, discountPrice: 0, description: '', ingredients: '', benefits: '', howToUse: '', size: '', emoji: '\u{1F33F}', targetAudience: ['all'] as TargetAudience[], doctorNote: '', preparationMethod: '' });
  const [na, setNa] = useState({ title: '', content: '', category: '', readTime: '5 min', emoji: '\u{1F4DD}', targetAudience: ['all'] as TargetAudience[] });
  const [nd, setNd] = useState({ name: '', specialization: '', experience: 0, fee: 0, qualification: '', about: '', tags: '', languages: '' });
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');

  // ═══════════════════════════════════════════════
  // PASSWORD LOGIN SCREEN
  // ═══════════════════════════════════════════════
  if (!isAdminUnlocked) {
    const tryLogin = () => {
      if (unlockAdmin(password)) {
        toast.success('Welcome, Admin!');
        setPassword('');
        setPassError('');
      } else {
        setPassError('Incorrect password. Access denied.');
        setPassword('');
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)' }}>
        <div className="bg-white rounded-3xl p-8 shadow-2xl text-center max-w-sm w-full">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-3xl text-white shadow-lg mb-5">
            {'\u{1F6E1}\uFE0F'}
          </div>
          <h2 className="text-xl font-extrabold text-gray-900">Admin Console</h2>
          <p className="text-xs text-gray-400 mt-1 mb-6">Authorized personnel only</p>

          <div className="relative mb-4">
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setPassError(''); }}
              onKeyDown={e => { if (e.key === 'Enter' && password) tryLogin(); }}
              placeholder="Enter admin password"
              className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl text-sm font-medium focus:border-slate-500 focus:outline-none transition-colors pr-12"
              autoFocus
            />
            <button onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              {showPass ? '\u{1F441}\uFE0F' : '\u{1F441}\uFE0F\u200D\u{1F5E8}\uFE0F'}
            </button>
          </div>

          {passError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
              <p className="text-xs text-red-600 font-bold">{'\u26D4'} {passError}</p>
            </div>
          )}

          <button onClick={tryLogin} disabled={!password}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-sm disabled:opacity-40 active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg, #1E293B, #334155)' }}>
            {'\u{1F513}'} Authenticate
          </button>

          <button onClick={() => nav('/profile')} className="mt-4 text-xs text-gray-400 font-bold">
            {'\u2190'} Back to Profile
          </button>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-[9px] text-gray-300">This panel is restricted. Unauthorized access attempts are logged.</p>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // ADMIN CMS DASHBOARD
  // ═══════════════════════════════════════════════
  const pubProducts = products.filter(p => p.isPublished).length;
  const pubArticles = articles.filter(a => a.isPublished).length;
  const pubDoctors = doctors.filter(d => d.isPublished).length;

  const handleAddProduct = () => {
    if (!np.name || np.price <= 0) { toast.error('Name and price required'); return; }
    addProduct({
      id: 'p_' + Date.now(), ...np,
      discountPrice: np.discountPrice > 0 ? np.discountPrice : undefined,
      ingredients: np.ingredients.split(',').map(s => s.trim()).filter(Boolean),
      benefits: np.benefits.split(',').map(s => s.trim()).filter(Boolean),
      rating: 5.0, reviews: 0, inStock: true, isPublished: false, isFeatured: false, tags: [],
      preparationMethod: np.preparationMethod || undefined, doctorNote: np.doctorNote || undefined,
      createdAt: new Date().toISOString().split('T')[0],
    });
    toast.success('Product added as draft!');
    setNp({ name: '', category: 'hair_oil', price: 0, discountPrice: 0, description: '', ingredients: '', benefits: '', howToUse: '', size: '', emoji: '\u{1F33F}', targetAudience: ['all'], doctorNote: '', preparationMethod: '' });
    setTab('products');
  };

  const handleAddArticle = () => {
    if (!na.title || !na.content) { toast.error('Title and content required'); return; }
    addArticle({ id: 'a_' + Date.now(), ...na, author: 'chief', isPublished: false, isFeatured: false, createdAt: new Date().toISOString().split('T')[0] });
    toast.success('Article saved as draft!');
    setNa({ title: '', content: '', category: '', readTime: '5 min', emoji: '\u{1F4DD}', targetAudience: ['all'] });
    setTab('articles');
  };

  const handleAddDoctor = () => {
    if (!nd.name) { toast.error('Name required'); return; }
    addDoctor({
      id: 'd_' + Date.now(), name: nd.name, specialization: nd.specialization, experience: nd.experience,
      rating: 5.0, reviews: 0, fee: nd.fee, feeFreeForPoor: false, qualification: nd.qualification,
      tags: nd.tags.split(',').map(s => s.trim()).filter(Boolean),
      languages: nd.languages.split(',').map(s => s.trim()).filter(Boolean),
      about: nd.about, isChief: false, isPublished: false,
    });
    toast.success('Doctor added!');
    setNd({ name: '', specialization: '', experience: 0, fee: 0, qualification: '', about: '', tags: '', languages: '' });
    setTab('doctors');
  };

  const tabs: { id: typeof tab; icon: string; label: string }[] = [
    { id: 'overview', icon: '\u{1F4CA}', label: 'Home' },
    { id: 'products', icon: '\u{1F4E6}', label: 'Products' },
    { id: 'articles', icon: '\u{1F4DD}', label: 'Articles' },
    { id: 'doctors', icon: '\u{1F469}\u200D\u2695\uFE0F', label: 'Doctors' },
    { id: 'callbacks', icon: '\u{1F4DE}', label: 'Callbacks' },
    { id: 'settings', icon: '\u2699\uFE0F', label: 'Security' },
  ];
      {/* Header */}
      <div className="sticky top-0 z-20 bg-slate-800 text-white">
        <div className="px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-extrabold">{'\u{1F6E1}\uFE0F'} SheBloom Admin</h1>
          </div>
          <button onClick={() => { lockAdmin(); nav('/profile'); }} className="text-[10px] font-bold bg-white/10 px-3 py-1.5 rounded-full active:scale-95">
            {'\u{1F512}'} Lock & Exit
          </button>
        </div>
        <div className="px-3 pb-2 flex gap-1 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={'px-2.5 py-1.5 rounded-lg text-[9px] font-bold whitespace-nowrap transition-all ' + (tab === t.id ? 'bg-white text-slate-800' : 'text-white/60')}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-4 space-y-3">

        {/* OVERVIEW */}
        {tab === 'overview' && (<>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { l: 'Products', v: products.length, p: pubProducts, c: '#059669', bg: '#ECFDF5' },
              { l: 'Articles', v: articles.length, p: pubArticles, c: '#2563EB', bg: '#EFF6FF' },
              { l: 'Doctors', v: doctors.length, p: pubDoctors, c: '#7C3AED', bg: '#F5F3FF' },
              { l: 'Callbacks', v: (JSON.parse(localStorage.getItem('sb_callbacks') || '[]')).length, p: (JSON.parse(localStorage.getItem('sb_callbacks') || '[]')).filter((c: any) => c.status === 'pending').length, c: '#EA580C', bg: '#FFF7ED' },
            ].map(s => (
              <div key={s.l} className="rounded-2xl p-4" style={{ backgroundColor: s.bg }}>
                <p className="text-[10px] font-bold uppercase" style={{ color: s.c }}>{s.l}</p>
                <p className="text-2xl font-extrabold text-gray-900 mt-1">{s.v}</p>
                <p className="text-[9px] text-gray-500">{s.p} live</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-xs font-bold text-gray-800 mb-2">Quick Actions</h3>
            {[
              { l: 'Add Product', t: 'add_product' as typeof tab, e: '\u{1F4E6}', c: 'bg-emerald-50 text-emerald-700' },
              { l: 'Write Article', t: 'add_article' as typeof tab, e: '\u{1F4DD}', c: 'bg-blue-50 text-blue-700' },
              { l: 'Add Doctor', t: 'add_doctor' as typeof tab, e: '\u{1F469}\u200D\u2695\uFE0F', c: 'bg-purple-50 text-purple-700' },
            ].map(a => (
              <button key={a.l} onClick={() => setTab(a.t)} className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 active:bg-gray-100 transition-colors mt-1.5">
                <span className={'w-8 h-8 rounded-lg flex items-center justify-center text-sm ' + a.c}>{a.e}</span>
                <span className="text-xs font-bold text-gray-700 flex-1 text-left">{a.l}</span>
                <span className="text-gray-300">{'\u203A'}</span>
              </button>
            ))}
          </div>
        </>)}

        {/* PRODUCTS LIST */}
        {tab === 'products' && (<>
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-extrabold">{'\u{1F4E6}'} Products ({products.length})</h3>
            <button onClick={() => setTab('add_product')} className="text-[10px] font-bold text-white bg-emerald-600 px-3 py-1.5 rounded-full active:scale-95">+ Add</button>
          </div>
          {products.map(p => (
            <div key={p.id} className="bg-white rounded-2xl p-3 shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{p.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-800 truncate">{p.name}</p>
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    <span className={'text-[7px] font-bold px-1.5 py-0.5 rounded-full ' + (p.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600')}>{p.isPublished ? '\u2713 LIVE' : 'DRAFT'}</span>
                    {p.isFeatured && <span className="text-[7px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{'\u2605'} FEATURED</span>}
                    <span className="text-[7px] text-gray-400">{'\u20B9'}{p.discountPrice || p.price}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1.5 mt-2 border-t border-gray-50 pt-2">
                <button onClick={() => togglePublish(p.id)} className={'flex-1 py-1.5 rounded-lg text-[9px] font-bold active:scale-95 ' + (p.isPublished ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600')}>{p.isPublished ? 'Unpublish' : 'Publish'}</button>
                <button onClick={() => toggleFeatured(p.id)} className={'flex-1 py-1.5 rounded-lg text-[9px] font-bold active:scale-95 ' + (p.isFeatured ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-500')}>{p.isFeatured ? 'Unfeature' : 'Feature'}</button>
                <button onClick={() => setConfirmDel({ id: p.id, type: 'product' })} className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-400 text-[9px] font-bold active:scale-95">{'\u{1F5D1}'}</button>
              </div>
            </div>
          ))}
        </>)}

        {/* ARTICLES LIST */}
        {tab === 'articles' && (<>
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-extrabold">{'\u{1F4DD}'} Articles ({articles.length})</h3>
            <button onClick={() => setTab('add_article')} className="text-[10px] font-bold text-white bg-blue-600 px-3 py-1.5 rounded-full active:scale-95">+ Write</button>
          </div>
          {articles.map(a => (
            <div key={a.id} className="bg-white rounded-2xl p-3 shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{a.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-800 truncate">{a.title}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={'text-[7px] font-bold px-1.5 py-0.5 rounded-full ' + (a.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600')}>{a.isPublished ? '\u2713 LIVE' : 'DRAFT'}</span>
                    {a.isFeatured && <span className="text-[7px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{'\u2605'}</span>}
                    <span className="text-[7px] text-gray-400">{a.category} • {a.readTime}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1.5 mt-2 border-t border-gray-50 pt-2">
                <button onClick={() => toggleArticlePublish(a.id)} className={'flex-1 py-1.5 rounded-lg text-[9px] font-bold active:scale-95 ' + (a.isPublished ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600')}>{a.isPublished ? 'Unpublish' : 'Publish'}</button>
                <button onClick={() => toggleArticleFeatured(a.id)} className={'flex-1 py-1.5 rounded-lg text-[9px] font-bold active:scale-95 ' + (a.isFeatured ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-500')}>{a.isFeatured ? 'Unfeature' : 'Feature'}</button>
                <button onClick={() => setConfirmDel({ id: a.id, type: 'article' })} className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-400 text-[9px] font-bold active:scale-95">{'\u{1F5D1}'}</button>
              </div>
            </div>
          ))}
        </>)}

        {/* DOCTORS LIST */}
        {tab === 'doctors' && (<>
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-extrabold">{'\u{1F469}\u200D\u2695\uFE0F'} Doctors ({doctors.length})</h3>
            <button onClick={() => setTab('add_doctor')} className="text-[10px] font-bold text-white bg-purple-600 px-3 py-1.5 rounded-full active:scale-95">+ Add</button>
          </div>
          {doctors.map(d => (
            <div key={d.id} className={'bg-white rounded-2xl p-3 shadow-sm ' + (d.isChief ? 'ring-2 ring-emerald-300' : '')}>
              <div className="flex items-center gap-2.5">
                <div className={'w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm ' + (d.isChief ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-rose-400 to-pink-500')}>{d.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-bold text-gray-800 truncate">{d.name}</p>
                    {d.isChief && <span className="text-[7px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">{'\u{1F451}'} CHIEF</span>}
                  </div>
                  <p className="text-[9px] text-gray-500">{d.specialization}</p>
                  <span className={'text-[7px] font-bold px-1.5 py-0.5 rounded-full ' + (d.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600')}>{d.isPublished ? 'VISIBLE' : 'HIDDEN'}</span>
                </div>
              </div>
              <div className="flex gap-1.5 mt-2 border-t border-gray-50 pt-2">
                <button onClick={() => toggleDoctorPublish(d.id)} className={'flex-1 py-1.5 rounded-lg text-[9px] font-bold active:scale-95 ' + (d.isPublished ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600')}>{d.isPublished ? 'Hide' : 'Show'}</button>
                {!d.isChief && <button onClick={() => setConfirmDel({ id: d.id, type: 'doctor' })} className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-400 text-[9px] font-bold active:scale-95">{'\u{1F5D1}'}</button>}
              </div>
            </div>
          ))}
        </>)}

        {/* ADD PRODUCT */}
        {tab === 'add_product' && (<>
          <div className="flex items-center gap-2 mb-1"><button onClick={() => setTab('products')} className="text-gray-400 text-sm">{'\u2190'}</button><h3 className="text-sm font-extrabold">New Product</h3></div>
          <FormField label="Name *" value={np.name} onChange={v => setNp({...np, name: v})} placeholder="Bhringraj Hair Oil" />
          <FormField label="Description *" value={np.description} onChange={v => setNp({...np, description: v})} placeholder="Product description..." multiline />
          <div className="grid grid-cols-2 gap-2"><FormNumField label="Price *" value={np.price} onChange={v => setNp({...np, price: v})} /><FormNumField label="Sale Price" value={np.discountPrice} onChange={v => setNp({...np, discountPrice: v})} /></div>
          <div className="grid grid-cols-2 gap-2"><FormField label="Size" value={np.size} onChange={v => setNp({...np, size: v})} placeholder="200ml" /><FormField label="Emoji" value={np.emoji} onChange={v => setNp({...np, emoji: v})} placeholder="\u{1F33F}" /></div>
          <FormField label="Ingredients (comma-sep)" value={np.ingredients} onChange={v => setNp({...np, ingredients: v})} placeholder="Bhringraj, Amla..." multiline />
          <FormField label="Benefits (comma-sep)" value={np.benefits} onChange={v => setNp({...np, benefits: v})} placeholder="Reduces hairfall..." multiline />
          <FormField label="How to Use" value={np.howToUse} onChange={v => setNp({...np, howToUse: v})} placeholder="Instructions..." multiline />
          <FormField label="Doctor Note" value={np.doctorNote} onChange={v => setNp({...np, doctorNote: v})} placeholder="Personal recommendation..." multiline />
          <div><label className="text-[9px] font-bold text-gray-500 uppercase">Category</label>
            <div className="flex flex-wrap gap-1 mt-1">{catOpts.map(c => (<button key={c.k} onClick={() => setNp({...np, category: c.k})} className={'px-2 py-1 rounded-lg text-[9px] font-bold ' + (np.category === c.k ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500')}>{c.l}</button>))}</div></div>
          <FormTargetPicker opts={targetOpts} value={np.targetAudience} onChange={v => setNp({...np, targetAudience: v})} />
          <button onClick={handleAddProduct} className="w-full py-3 rounded-2xl text-white font-bold text-sm active:scale-95" style={{background:'linear-gradient(135deg,#059669,#10B981)'}}>Add as Draft</button>
        </>)}

        {/* ADD ARTICLE */}
        {tab === 'add_article' && (<>
          <div className="flex items-center gap-2 mb-1"><button onClick={() => setTab('articles')} className="text-gray-400 text-sm">{'\u2190'}</button><h3 className="text-sm font-extrabold">Write Article</h3></div>
          <FormField label="Title *" value={na.title} onChange={v => setNa({...na, title: v})} placeholder="Understanding PCOD..." />
          <div className="grid grid-cols-2 gap-2">
            <FormField label="Category" value={na.category} onChange={v => setNa({...na, category: v})} placeholder="PCOD, Wellness..." />
            <FormField label="Read Time" value={na.readTime} onChange={v => setNa({...na, readTime: v})} placeholder="5 min" />
          </div>
          <FormField label="Content *" value={na.content} onChange={v => setNa({...na, content: v})} placeholder="Write your article..." multiline />
          <FormTargetPicker opts={targetOpts} value={na.targetAudience} onChange={v => setNa({...na, targetAudience: v})} />
          <button onClick={handleAddArticle} className="w-full py-3 rounded-2xl text-white font-bold text-sm active:scale-95" style={{background:'linear-gradient(135deg,#2563EB,#3B82F6)'}}>Save as Draft</button>
        </>)}

        {/* ADD DOCTOR */}
        {tab === 'add_doctor' && (<>
          <div className="flex items-center gap-2 mb-1"><button onClick={() => setTab('doctors')} className="text-gray-400 text-sm">{'\u2190'}</button><h3 className="text-sm font-extrabold">Add Doctor</h3></div>
          <FormField label="Full Name *" value={nd.name} onChange={v => setNd({...nd, name: v})} placeholder="Dr. Priya Sharma" />
          <FormField label="Specialization" value={nd.specialization} onChange={v => setNd({...nd, specialization: v})} placeholder="Gynecologist" />
          <FormField label="Qualification" value={nd.qualification} onChange={v => setNd({...nd, qualification: v})} placeholder="MBBS, MS" />
          <div className="grid grid-cols-2 gap-2"><FormNumField label="Experience (yrs)" value={nd.experience} onChange={v => setNd({...nd, experience: v})} /><FormNumField label="Fee" value={nd.fee} onChange={v => setNd({...nd, fee: v})} /></div>
          <FormField label="Tags (comma-sep)" value={nd.tags} onChange={v => setNd({...nd, tags: v})} placeholder="PCOD, IVF..." />
          <FormField label="Languages (comma-sep)" value={nd.languages} onChange={v => setNd({...nd, languages: v})} placeholder="English, Hindi..." />
          <FormField label="About" value={nd.about} onChange={v => setNd({...nd, about: v})} placeholder="Brief description..." multiline />
          <button onClick={handleAddDoctor} className="w-full py-3 rounded-2xl text-white font-bold text-sm active:scale-95" style={{background:'linear-gradient(135deg,#7C3AED,#8B5CF6)'}}>Add Doctor</button>
        </>)}

        {/* CALLBACKS */}
        {tab === 'callbacks' && (() => {
          const cbs = JSON.parse(localStorage.getItem('sb_callbacks') || '[]') as any[];
          const pending = cbs.filter((c: any) => c.status === 'pending');
          const handled = cbs.filter((c: any) => c.status !== 'pending');
          const markDone = (id: string) => {
            const updated = cbs.map((c: any) => c.id === id ? { ...c, status: 'done' } : c);
            localStorage.setItem('sb_callbacks', JSON.stringify(updated));
            toast.success('Marked as done');
            // Force re-render
            setTab('overview'); setTimeout(() => setTab('callbacks'), 50);
          };
          return (<>
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-extrabold">{'\u{1F4DE}'} Callback Requests</h3>
              <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-full">{pending.length} pending</span>
            </div>
            {pending.length === 0 && handled.length === 0 && (
              <div className="text-center py-10"><span className="text-4xl">{'\u{1F4ED}'}</span><p className="text-sm text-gray-400 mt-2">No callback requests yet</p></div>
            )}
            {pending.map((c: any) => (
              <div key={c.id} className="bg-white rounded-2xl p-4 shadow-sm border-l-4 border-orange-400">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-extrabold text-gray-900">{c.userName}</p>
                    <a href={'tel:' + c.userPhone} className="text-xs font-bold text-emerald-600 underline">{'\u{1F4F1}'} {c.userPhone}</a>
                  </div>
                  <span className="text-[8px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">PENDING</span>
                </div>
                {c.productName && <p className="text-[10px] text-gray-500 mt-1">{'\u{1F4E6}'} Product: <strong>{c.productName}</strong></p>}
                {c.message && <p className="text-[10px] text-gray-600 mt-1 bg-gray-50 rounded-lg p-2 italic">"{c.message}"</p>}
                <p className="text-[9px] text-gray-400 mt-1">{new Date(c.timestamp).toLocaleString()}</p>
                <div className="flex gap-2 mt-3">
                  <a href={'tel:' + c.userPhone} className="flex-1 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold text-center active:scale-95">{'\u{1F4DE}'} Call Now</a>
                  <button onClick={() => markDone(c.id)} className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-600 text-xs font-bold active:scale-95">{'\u2713'} Mark Done</button>
                </div>
              </div>
            ))}
            {handled.length > 0 && (<>
              <h4 className="text-xs font-bold text-gray-400 uppercase mt-4">Completed ({handled.length})</h4>
              {handled.map((c: any) => (
                <div key={c.id} className="bg-gray-50 rounded-2xl p-3 opacity-60">
                  <p className="text-xs font-bold text-gray-700">{c.userName} — {c.userPhone}</p>
                  {c.productName && <p className="text-[9px] text-gray-500">{c.productName}</p>}
                  <p className="text-[8px] text-gray-400">{new Date(c.timestamp).toLocaleString()}</p>
                </div>
              ))}
            </>)}
          </>);
        })()}

        {/* SECURITY SETTINGS (real) */}
        {tab === 'settings' && (<>
          <h3 className="text-sm font-extrabold">{'\u{1F512}'} Security Settings</h3>
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-gray-700">Change Password</h4>
            <div className="relative">
              <input type="password" value={oldPin} onChange={e => setOldPin(e.target.value)} placeholder="Current password"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:border-slate-400 focus:outline-none" />
            </div>
            <div className="relative">
              <input type="password" value={newPin} onChange={e => setNewPin(e.target.value)} placeholder="New password (min 8 characters)"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:border-slate-400 focus:outline-none" />
            </div>
            {newPin && newPin.length < 8 && <p className="text-[9px] text-red-500">Password must be at least 8 characters</p>}
            <button onClick={() => {
              if (changePin(oldPin, newPin)) { toast.success('Password changed!'); setOldPin(''); setNewPin(''); }
              else toast.error('Wrong current password or new one too short');
            }} className="w-full py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs active:scale-95">Update Password</button>
          </div>
          <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
            <h4 className="text-xs font-bold text-red-700">{'\u26A0\uFE0F'} Security Notice</h4>
            <p className="text-[10px] text-red-600 mt-1">Default password: <strong>SheBloom@2024#Admin</strong></p>
            <p className="text-[10px] text-red-600">Change it immediately after first login. Never share with untrusted people.</p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4">
            <h4 className="text-xs font-bold text-slate-700">How to Access Admin</h4>
            <p className="text-[10px] text-slate-600 mt-1">Go to Profile {'\u2192'} scroll to bottom {'\u2192'} tap "SheBloom v1.0.0" five times {'\u2192'} enter password. Only people who know this method can access admin.</p>
          </div>
        </>)}
      </div>

      {/* Delete confirmation */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6" onClick={() => setConfirmDel(null)}>
          <div className="bg-white rounded-2xl p-5 text-center max-w-xs" onClick={e => e.stopPropagation()}>
            <span className="text-3xl">{'\u26A0\uFE0F'}</span>
            <h3 className="text-sm font-extrabold mt-2">Delete {confirmDel.type}?</h3>
            <p className="text-[10px] text-gray-500 mt-1">This action cannot be undone.</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setConfirmDel(null)} className="flex-1 py-2.5 bg-gray-100 rounded-xl text-xs font-bold text-gray-600">Cancel</button>
              <button onClick={() => {
                if (confirmDel.type === 'product') deleteProduct(confirmDel.id);
                if (confirmDel.type === 'article') deleteArticle(confirmDel.id);
                if (confirmDel.type === 'doctor') deleteDoctor(confirmDel.id);
                setConfirmDel(null); toast.success('Deleted');
              }} className="flex-1 py-2.5 bg-red-500 rounded-xl text-xs font-bold text-white">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
