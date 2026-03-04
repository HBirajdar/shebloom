import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAyurvedaStore } from '../stores/ayurvedaStore';
import { useAuthStore } from '../stores/authStore';
import type { AyurvedaProduct, TargetAudience, ProductCategory } from '../stores/ayurvedaStore';
import toast from 'react-hot-toast';

const targetLabels: Record<TargetAudience, string> = {
  all: '\u{1F310} Everyone', periods: '\u{1F33A} Period Tracking', fertility: '\u{1F495} TTC',
  pregnancy: '\u{1F930} Pregnancy', wellness: '\u{1F9D8} Wellness',
};

const catLabels: Record<ProductCategory, string> = {
  hair_oil: 'Hair Oil', body_lotion: 'Body Lotion', face_wash: 'Face Wash',
  body_wash: 'Body Wash', hair_treatment: 'Hair Treatment', supplement: 'Supplement', skincare: 'Skincare',
};

export default function AdminPage() {
  const nav = useNavigate();
  const user = useAuthStore(s => s.user);
  const { products, recipes, doctor, togglePublish, toggleFeatured, deleteProduct, updateDoctor, isAdmin, setAdmin, addProduct } = useAyurvedaStore();
  const [view, setView] = useState<'products' | 'recipes' | 'doctor' | 'add'>('products');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Admin access check - use role from auth or admin flag
  const hasAccess = user?.role === 'admin' || isAdmin;

  // New product form state
  const [np, setNp] = useState({
    name: '', category: 'hair_oil' as ProductCategory, price: 0, discountPrice: 0,
    description: '', ingredients: '', benefits: '', howToUse: '', size: '', emoji: '\u{1F33F}',
    targetAudience: ['all'] as TargetAudience[], doctorNote: '', preparationMethod: '',
  });

  // Doctor edit
  const [docEdit, setDocEdit] = useState(false);
  const [docForm, setDocForm] = useState(doctor);

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#FAFAF9' }}>
        <div className="bg-white rounded-3xl p-6 shadow-sm text-center max-w-sm w-full">
          <span className="text-5xl block mb-3">{'\u{1F512}'}</span>
          <h2 className="text-lg font-extrabold text-gray-900">Admin Access</h2>
          <p className="text-xs text-gray-500 mt-1 mb-4">Enter admin mode to manage products, recipes, and doctor profile.</p>
          <button onClick={() => { setAdmin(true); toast.success('Admin mode enabled!'); }}
            className="w-full py-3 rounded-2xl font-bold text-sm text-white active:scale-95 transition-transform" style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}>
            Enable Admin Mode
          </button>
          <button onClick={() => nav('/dashboard')} className="w-full py-3 mt-2 rounded-2xl font-bold text-sm text-gray-500 bg-gray-100 active:scale-95">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleAddProduct = () => {
    if (!np.name || !np.description || np.price <= 0) { toast.error('Fill required fields'); return; }
    const newP: AyurvedaProduct = {
      id: 'p_' + Date.now(),
      name: np.name, category: np.category, price: np.price,
      discountPrice: np.discountPrice > 0 ? np.discountPrice : undefined,
      description: np.description,
      ingredients: np.ingredients.split(',').map(s => s.trim()).filter(Boolean),
      benefits: np.benefits.split(',').map(s => s.trim()).filter(Boolean),
      howToUse: np.howToUse, size: np.size, emoji: np.emoji,
      rating: 5.0, reviews: 0, inStock: true, isPublished: false, isFeatured: false,
      targetAudience: np.targetAudience, tags: [],
      preparationMethod: np.preparationMethod || undefined,
      doctorNote: np.doctorNote || undefined,
      createdAt: new Date().toISOString().split('T')[0],
    };
    addProduct(newP);
    toast.success('Product added! (Unpublished)');
    setView('products');
    setNp({ name: '', category: 'hair_oil', price: 0, discountPrice: 0, description: '', ingredients: '', benefits: '', howToUse: '', size: '', emoji: '\u{1F33F}', targetAudience: ['all'], doctorNote: '', preparationMethod: '' });
  };

  const toggleTarget = (t: TargetAudience) => {
    setNp(p => ({ ...p, targetAudience: p.targetAudience.includes(t) ? p.targetAudience.filter(x => x !== t) : [...p.targetAudience, t] }));
  };

  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: '#FAFAF9' }}>
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100">
        <div className="px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button onClick={() => nav('/dashboard')} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm active:scale-90">{'\u2190'}</button>
            <div>
              <h1 className="text-base font-extrabold text-gray-900">{'\u{1F6E1}\uFE0F'} Admin Panel</h1>
              <p className="text-[9px] text-emerald-600 font-bold">Manage Products & Content</p>
            </div>
          </div>
          <button onClick={() => { setAdmin(false); nav('/dashboard'); }} className="text-[10px] text-red-500 font-bold bg-red-50 px-3 py-1.5 rounded-full">
            Exit Admin
          </button>
        </div>
        <div className="px-5 pb-3 flex gap-2">
          {([['products', '\u{1F4E6} Products (' + products.length + ')'], ['add', '\u2795 Add New'], ['recipes', '\u{1F52C} Recipes'], ['doctor', '\u{1F469}\u200D\u2695\uFE0F Doctor']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setView(k)}
              className={'px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ' + (view === k ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500')}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-4 space-y-3">
        {/* Quick Stats */}
        {view === 'products' && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                <p className="text-xl font-extrabold text-gray-900">{products.length}</p>
                <p className="text-[9px] text-gray-400">Total</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-xl font-extrabold text-emerald-700">{products.filter(p => p.isPublished).length}</p>
                <p className="text-[9px] text-emerald-500">Published</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-xl font-extrabold text-amber-700">{products.filter(p => p.isFeatured).length}</p>
                <p className="text-[9px] text-amber-500">Featured</p>
              </div>
            </div>

            {products.map(p => (
              <div key={p.id} className="bg-white rounded-2xl p-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{p.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800 truncate">{p.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={'text-[8px] font-bold px-1.5 py-0.5 rounded-full ' + (p.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
                        {p.isPublished ? 'LIVE' : 'DRAFT'}
                      </span>
                      {p.isFeatured && <span className="text-[8px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">FEATURED</span>}
                      <span className="text-[8px] text-gray-400">{'\u20B9'}{p.discountPrice || p.price}</span>
                    </div>
                    <div className="flex gap-1 mt-1">
                      {p.targetAudience.map(t => (
                        <span key={t} className="text-[7px] bg-blue-50 text-blue-600 px-1 py-0.5 rounded">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-2 border-t border-gray-100 pt-2">
                  <button onClick={() => togglePublish(p.id)}
                    className={'flex-1 py-2 rounded-lg text-[10px] font-bold active:scale-95 ' + (p.isPublished ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600')}>
                    {p.isPublished ? '\u23F8 Unpublish' : '\u25B6 Publish'}
                  </button>
                  <button onClick={() => toggleFeatured(p.id)}
                    className={'flex-1 py-2 rounded-lg text-[10px] font-bold active:scale-95 ' + (p.isFeatured ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-500')}>
                    {p.isFeatured ? '\u2605 Unfeature' : '\u2606 Feature'}
                  </button>
                  <button onClick={() => setConfirmDelete(p.id)} className="px-3 py-2 rounded-lg bg-red-50 text-red-500 text-[10px] font-bold active:scale-95">
                    {'\u{1F5D1}'}
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Add Product */}
        {view === 'add' && (
          <div className="space-y-3">
            <h3 className="text-sm font-extrabold text-gray-900">Add New Product</h3>
            {[
              { l: 'Product Name *', k: 'name', ph: 'e.g. Bhringraj Hair Oil' },
              { l: 'Description *', k: 'description', ph: 'Describe the product...' },
              { l: 'Size', k: 'size', ph: 'e.g. 200ml' },
              { l: 'Emoji Icon', k: 'emoji', ph: '\u{1F33F}' },
              { l: 'Ingredients (comma-separated)', k: 'ingredients', ph: 'Bhringraj, Amla, Coconut Oil...' },
              { l: 'Benefits (comma-separated)', k: 'benefits', ph: 'Reduces hairfall, Strengthens roots...' },
              { l: 'How to Use', k: 'howToUse', ph: 'Application instructions...' },
              { l: 'Preparation Method', k: 'preparationMethod', ph: 'How this product is made...' },
              { l: 'Doctor Note', k: 'doctorNote', ph: 'Personal recommendation...' },
            ].map(f => (
              <div key={f.k}>
                <label className="text-[10px] font-bold text-gray-500 uppercase">{f.l}</label>
                {f.k === 'description' || f.k === 'howToUse' || f.k === 'ingredients' || f.k === 'benefits' || f.k === 'preparationMethod' || f.k === 'doctorNote' ? (
                  <textarea value={(np as any)[f.k]} onChange={e => setNp({ ...np, [f.k]: e.target.value })} placeholder={f.ph}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-emerald-400 focus:outline-none resize-none" rows={3} />
                ) : (
                  <input value={(np as any)[f.k]} onChange={e => setNp({ ...np, [f.k]: e.target.value })} placeholder={f.ph}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-emerald-400 focus:outline-none" />
                )}
              </div>
            ))}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Price *</label>
                <input type="number" value={np.price || ''} onChange={e => setNp({ ...np, price: Number(e.target.value) })} placeholder="450"
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-emerald-400 focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Discount Price</label>
                <input type="number" value={np.discountPrice || ''} onChange={e => setNp({ ...np, discountPrice: Number(e.target.value) })} placeholder="349"
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-emerald-400 focus:outline-none" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">Category</label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {(Object.entries(catLabels) as [ProductCategory, string][]).map(([k, v]) => (
                  <button key={k} onClick={() => setNp({ ...np, category: k })}
                    className={'px-3 py-1.5 rounded-full text-[10px] font-bold ' + (np.category === k ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">Show to Users</label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {(Object.entries(targetLabels) as [TargetAudience, string][]).map(([k, v]) => (
                  <button key={k} onClick={() => toggleTarget(k)}
                    className={'px-3 py-1.5 rounded-full text-[10px] font-bold ' + (np.targetAudience.includes(k) ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500')}>
                    {v}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-gray-400 mt-1">Product will only appear for selected user types</p>
            </div>

            <button onClick={handleAddProduct}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-sm active:scale-95 transition-transform" style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}>
              Add Product (as Draft)
            </button>
          </div>
        )}

        {/* Recipes */}
        {view === 'recipes' && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">{recipes.length} recipes \u2022 {recipes.filter(r => r.isPublished).length} published</p>
            {recipes.map(r => (
              <div key={r.id} className="bg-white rounded-2xl p-3 shadow-sm flex items-center gap-3">
                <span className="text-2xl">{r.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-800 truncate">{r.title}</p>
                  <div className="flex gap-1 mt-0.5">
                    <span className={'text-[8px] font-bold px-1.5 py-0.5 rounded-full ' + (r.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
                      {r.isPublished ? 'LIVE' : 'DRAFT'}
                    </span>
                    {r.targetAudience.map(t => <span key={t} className="text-[7px] bg-blue-50 text-blue-600 px-1 py-0.5 rounded">{t}</span>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Doctor Profile */}
        {view === 'doctor' && (
          <div className="space-y-3">
            {!docEdit ? (
              <>
                <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-2xl text-emerald-700 font-bold">{doctor.name.charAt(0)}</div>
                  <h3 className="text-sm font-extrabold mt-2">{doctor.name}</h3>
                  <p className="text-[10px] text-gray-500">{doctor.title} \u2022 {doctor.qualification}</p>
                </div>
                <button onClick={() => { setDocForm(doctor); setDocEdit(true); }}
                  className="w-full py-3 rounded-2xl bg-emerald-50 text-emerald-700 font-bold text-sm active:scale-95">
                  {'\u270F\uFE0F'} Edit Doctor Profile
                </button>
              </>
            ) : (
              <div className="space-y-3">
                {[
                  { l: 'Name', k: 'name' }, { l: 'Title', k: 'title' }, { l: 'Qualification', k: 'qualification' },
                  { l: 'Experience', k: 'experience' }, { l: 'Consultation Fee', k: 'consultationFee' },
                ].map(f => (
                  <div key={f.k}>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">{f.l}</label>
                    <input value={(docForm as any)[f.k]} onChange={e => setDocForm({ ...docForm, [f.k]: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-emerald-400 focus:outline-none" />
                  </div>
                ))}
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">About</label>
                  <textarea value={docForm.about} onChange={e => setDocForm({ ...docForm, about: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-emerald-400 focus:outline-none resize-none" rows={4} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Philosophy</label>
                  <textarea value={docForm.philosophy} onChange={e => setDocForm({ ...docForm, philosophy: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-emerald-400 focus:outline-none resize-none" rows={3} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { updateDoctor(docForm); setDocEdit(false); toast.success('Doctor profile updated!'); }}
                    className="flex-1 py-3 rounded-2xl text-white font-bold text-sm" style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}>Save</button>
                  <button onClick={() => setDocEdit(false)} className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-600 font-bold text-sm">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl p-5 text-center max-w-xs" onClick={e => e.stopPropagation()}>
            <span className="text-3xl">{'\u26A0\uFE0F'}</span>
            <h3 className="text-sm font-extrabold mt-2">Delete Product?</h3>
            <p className="text-xs text-gray-500 mt-1">This cannot be undone.</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 bg-gray-100 rounded-xl text-xs font-bold text-gray-600">Cancel</button>
              <button onClick={() => { deleteProduct(confirmDelete); setConfirmDelete(null); toast.success('Deleted'); }}
                className="flex-1 py-2.5 bg-red-500 rounded-xl text-xs font-bold text-white">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
