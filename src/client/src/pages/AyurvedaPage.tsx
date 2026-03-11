// @ts-nocheck
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAyurvedaStore } from '../stores/ayurvedaStore';
import { useCycleStore } from '../stores/cycleStore';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';
import type { ProductCategory, AyurvedaProduct, DIYRecipe } from '../stores/ayurvedaStore';
import BottomNav from '../components/BottomNav';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════
   VEDACLUE AYURVEDA SHOP — Enterprise Grade
   ═══════════════════════════════════════════════════════ */

const catLabels: Record<ProductCategory | 'all', { emoji: string; label: string }> = {
  all: { emoji: '🌿', label: 'All' }, hair_oil: { emoji: '🧴', label: 'Hair Oil' },
  body_lotion: { emoji: '🌸', label: 'Lotion' }, face_wash: { emoji: '🌻', label: 'Face Wash' },
  body_wash: { emoji: '💧', label: 'Body Wash' }, hair_treatment: { emoji: '💉', label: 'Treatment' },
  supplement: { emoji: '🌺', label: 'Supplement' }, skincare: { emoji: '✨', label: 'Skincare' },
};

// Phase-specific product recommendations
const PHASE_RECS: Record<string, { emoji: string; label: string; tagline: string; tags: string[] }> = {
  menstrual: { emoji: '🩸', label: 'For Your Period', tagline: 'Iron, warmth & pain relief', tags: ['period', 'iron', 'pain'] },
  follicular: { emoji: '🌱', label: 'Rising Energy', tagline: 'Nourish & energize', tags: ['energy', 'nourish', 'follicular'] },
  ovulation: { emoji: '✨', label: 'Peak Phase', tagline: 'Fertility & glow', tags: ['fertility', 'glow', 'ovulation', 'shatavari'] },
  luteal: { emoji: '🍂', label: 'Pre-Period Care', tagline: 'Calm PMS naturally', tags: ['pms', 'mood', 'ashwagandha', 'luteal'] },
};

const Stars = ({ r }: { r: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map(i => (
      <span key={i} className="text-[10px]" style={{ color: i <= Math.round(r) ? '#F59E0B' : '#D1D5DB' }}>★</span>
    ))}
    <span className="text-[10px] text-gray-500 ml-0.5 font-bold">{r}</span>
  </div>
);

export default function AyurvedaPage() {
  const nav = useNavigate();
  const store = useAyurvedaStore();
  const { recipes, isAdminUnlocked, getChiefDoctor } = store;
  const { phase, goal } = useCycleStore();
  const user = useAuthStore(s => s.user);

  // Fetch products from API, fall back to zustand defaults
  const [apiProducts, setApiProducts] = useState<AyurvedaProduct[] | null>(null);
  const [productsLoading, setProductsLoading] = useState(true);
  useEffect(() => {
    api.get('/products')
      .then(r => {
        const items = r.data.data || r.data.products || [];
        if (items.length > 0) setApiProducts(items);
      })
      .catch(() => {})
      .finally(() => setProductsLoading(false));
  }, []);
  const products = apiProducts || store.products;

  // Fetch doctors from API, fall back to zustand defaults
  const [apiDoctors, setApiDoctors] = useState<any[] | null>(null);
  useEffect(() => {
    api.get('/doctors')
      .then(r => {
        const items = r.data.data || r.data.doctors || [];
        if (items.length > 0) setApiDoctors(items);
      })
      .catch(() => {});
  }, []);
  const doctors = apiDoctors || store.doctors;

  const [view, setView] = useState<'shop' | 'diy' | 'doctor'>('shop');
  const [cat, setCat] = useState<ProductCategory | 'all'>('all');
  const [selProduct, setSelProduct] = useState<AyurvedaProduct | null>(null);
  const [selRecipe, setSelRecipe] = useState<DIYRecipe | null>(null);

  // Cart state
  const [cart, setCart] = useState<{ product: AyurvedaProduct; qty: number }[]>([]);
  const [showCart, setShowCart] = useState(false);

  // Wishlist state
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());

  // Callback state
  const [showCallback, setShowCallback] = useState(false);
  const [cbProduct, setCbProduct] = useState<AyurvedaProduct | null>(null);
  const [cbName, setCbName] = useState(user?.fullName || '');
  const [cbPhone, setCbPhone] = useState(user?.phone || '');
  const [cbMessage, setCbMessage] = useState('');
  const [cbSent, setCbSent] = useState(false);

  const chief = getChiefDoctor();
  const phaseRec = PHASE_RECS[phase] || PHASE_RECS.follicular;

  const visibleProducts = useMemo(() => {
    return products.filter(p => p.isPublished)
      .filter(p => p.targetAudience.includes('all') || p.targetAudience.includes(goal as any))
      .filter(p => cat === 'all' || p.category === cat);
  }, [products, goal, cat]);

  const featured = products.filter(p => p.isPublished && p.isFeatured);

  // Phase-recommended products (products with matching tags or category)
  const phaseProducts = useMemo(() => {
    return products.filter(p => p.isPublished).filter(p =>
      p.tags?.some((t: string) => phaseRec.tags.some(rt => t.toLowerCase().includes(rt)))
      || (phase === 'menstrual' && p.category === 'supplement')
    ).slice(0, 3);
  }, [products, phase]);

  const visibleRecipes = useMemo(() => recipes.filter(r => r.isPublished).filter(r => r.targetAudience.includes('all') || r.targetAudience.includes(goal as any)), [recipes, goal]);

  // Cart helpers
  const addToCart = (product: AyurvedaProduct) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) return prev.map(item => item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      return [...prev, { product, qty: 1 }];
    });
    toast.success(`${product.name} added to cart! 🛒`);
  };
  const removeFromCart = (id: string) => setCart(prev => prev.filter(item => item.product.id !== id));
  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => item.product.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item));
  };
  const cartTotal = cart.reduce((sum, item) => sum + (item.product.discountPrice || item.product.price) * item.qty, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  // Wishlist helpers
  const toggleWishlist = (id: string) => {
    setWishlist(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); toast('Removed from wishlist'); }
      else { next.add(id); toast.success('Added to wishlist ♡'); }
      return next;
    });
  };

  const openCallback = (product: AyurvedaProduct) => {
    setCbProduct(product); setCbName(user?.fullName || ''); setCbPhone(user?.phone || '');
    setCbMessage('I am interested in ' + product.name); setCbSent(false); setShowCallback(true);
  };

  const submitCallback = async () => {
    if (!cbName.trim() || !cbPhone.trim()) { toast.error('Please enter name and phone'); return; }
    try {
      await api.post('/callbacks', {
        userId: user?.id || undefined,
        productId: cbProduct?.id || undefined,
        userName: cbName,
        userPhone: cbPhone,
        userEmail: user?.email || undefined,
        productName: cbProduct?.name || 'Consultation',
        ownerEmail: (cbProduct as any)?.ownerEmail || undefined,
        ownerPhone: (cbProduct as any)?.ownerPhone || undefined,
        message: cbMessage,
      });
      setCbSent(true);
      toast.success('Callback requested!');
    } catch (e: any) {
      // Fallback to localStorage if API fails
      const requests = JSON.parse(localStorage.getItem('sb_callbacks') || '[]');
      requests.push({
        id: 'cb_' + Date.now(), productId: cbProduct?.id, productName: cbProduct?.name || 'Consultation',
        userName: cbName, userPhone: cbPhone, message: cbMessage,
        timestamp: new Date().toISOString(), status: 'pending',
      });
      localStorage.setItem('sb_callbacks', JSON.stringify(requests));
      setCbSent(true);
      toast.success('Callback requested!');
    }
  };

  return (
    <div className="min-h-screen pb-28" style={{ backgroundColor: '#FAFAF9' }}>

      {/* ─── Header ─── */}
      <div className="sticky top-0 z-20 backdrop-blur-xl border-b border-gray-100" style={{ backgroundColor: 'rgba(250,250,249,0.92)' }}>
        <div className="px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button onClick={() => nav('/dashboard')} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm active:scale-90 transition-transform">←</button>
            <div>
              <h1 className="text-base font-extrabold text-gray-900">Ayurveda 🌿</h1>
              <p className="text-[9px] text-gray-400">Pure. Handcrafted. Genuine.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdminUnlocked && (
              <button onClick={() => nav('/admin')} className="text-[9px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full active:scale-95">🛡️ Admin</button>
            )}
            <button onClick={() => nav('/shop/history')} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-lg active:scale-95 transition-transform">📦</button>
            <button onClick={() => setShowCart(true)} className="relative w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-lg active:scale-95 transition-transform">
              🛒
              {cartCount > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center">
                  <span className="text-[8px] text-white font-extrabold">{cartCount}</span>
                </div>
              )}
            </button>
          </div>
        </div>
        <div className="px-5 pb-3 flex gap-2">
          {([['shop', '🛍️ Shop'], ['diy', '🔬 DIY'], ['doctor', '👩‍⚕️ Doctor']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setView(k)}
              className={'px-3.5 py-1.5 rounded-full text-[10px] font-bold transition-all ' + (view === k ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500')}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-4 space-y-4">

        {/* ═══ SHOP ═══ */}
        {view === 'shop' && (<>

          {/* Hero Banner */}
          <div className="rounded-2xl p-5 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#065F46,#059669,#10B981)' }}>
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full" />
            <div className="absolute -right-3 top-3 w-20 h-20 bg-white/5 rounded-full" />
            <p className="text-white/60 text-[9px] uppercase tracking-widest font-bold">VedaClue Ayurveda</p>
            <h2 className="text-xl font-extrabold mt-1">Handmade with Love 💚</h2>
            <p className="text-xs text-white/80 mt-1 max-w-[220px]">Freshly prepared by {chief?.name || 'our doctor'} using pure organic herbs. No chemicals.</p>
            <div className="flex gap-2 mt-3">
              {['✅ Lab Tested', '✅ No Chemicals', '✅ Fresh Batches'].map(t => (
                <span key={t} className="text-[9px] bg-white/20 px-2 py-1 rounded-full">{t}</span>
              ))}
            </div>
          </div>

          {/* Phase Recommendations */}
          {phaseProducts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{phaseRec.emoji}</span>
                <div>
                  <p className="text-xs font-extrabold text-gray-800">{phaseRec.label}</p>
                  <p className="text-[9px] text-gray-400">{phaseRec.tagline}</p>
                </div>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                {phaseProducts.map(p => (
                  <button key={p.id} onClick={() => setSelProduct(p)}
                    className="flex-shrink-0 w-36 bg-white rounded-2xl overflow-hidden shadow-sm text-left active:scale-[0.97] transition-transform">
                    <div className="h-20 flex items-center justify-center text-3xl overflow-hidden" style={{ backgroundColor: '#ECFDF5' }}>{p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> : p.emoji}</div>
                    <div className="p-2.5">
                      <p className="text-[10px] font-extrabold text-gray-800 line-clamp-1">{p.name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs font-extrabold text-emerald-700">₹{p.discountPrice || p.price}</span>
                        <span className="text-[8px] font-bold bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded-full">Phase Pick</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* How It Works */}
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
            <h3 className="text-xs font-bold text-amber-800 mb-2">📞 How to Order</h3>
            <div className="space-y-2">
              {[
                { n: '1', t: 'Browse & Enquire', d: 'Tap any product and request a callback' },
                { n: '2', t: 'We Call You', d: chief?.name + ' or team will call to discuss' },
                { n: '3', t: 'Personalized Advice', d: 'Get genuine guidance on what suits you' },
                { n: '4', t: 'Order on Call', d: 'Place order directly. Pay on delivery.' },
              ].map(s => (
                <div key={s.n} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-[9px] font-extrabold flex-shrink-0">{s.n}</span>
                  <div><p className="text-[10px] font-bold text-amber-800">{s.t}</p><p className="text-[9px] text-amber-700">{s.d}</p></div>
                </div>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div className="overflow-x-auto -mx-5 px-5">
            <div className="flex gap-2 min-w-max pb-1">
              {(Object.entries(catLabels) as [ProductCategory | 'all', typeof catLabels['all']][]).map(([k, v]) => (
                <button key={k} onClick={() => setCat(k)}
                  className={'px-3 py-2 rounded-xl text-[10px] font-bold whitespace-nowrap ' + (cat === k ? 'bg-emerald-100 text-emerald-700 shadow-sm' : 'bg-white text-gray-500 border border-gray-100')}>
                  {v.emoji} {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Featured */}
          {cat === 'all' && featured.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">⭐ Featured</h3>
              <div className="overflow-x-auto -mx-5 px-5">
                <div className="flex gap-3 min-w-max pb-2">
                  {featured.map(p => (
                    <button key={p.id} onClick={() => setSelProduct(p)}
                      className="w-48 bg-white rounded-2xl p-3 shadow-sm text-left active:scale-95 transition-transform flex-shrink-0">
                      <div className="relative">
                        <div className="w-full h-24 rounded-xl flex items-center justify-center text-4xl overflow-hidden" style={{ backgroundColor: '#ECFDF5' }}>{p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover rounded-xl" /> : p.emoji}</div>
                        <button onClick={e => { e.stopPropagation(); toggleWishlist(p.id); }}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-sm active:scale-90 shadow-sm">
                          {wishlist.has(p.id) ? '❤️' : '🤍'}
                        </button>
                      </div>
                      <p className="text-xs font-bold text-gray-800 line-clamp-1 mt-2">{p.name}</p>
                      <Stars r={p.rating} />
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-extrabold text-emerald-700">₹{p.discountPrice || p.price}</span>
                        {p.discountPrice && <span className="text-[10px] text-gray-400 line-through">₹{p.price}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Product List */}
          <h3 className="text-xs font-bold text-gray-400 uppercase">{cat === 'all' ? 'All Products' : catLabels[cat].label} ({visibleProducts.length})</h3>
          {visibleProducts.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl">🌿</span>
              <p className="text-sm font-bold text-gray-400 mt-3">No products in this category yet</p>
            </div>
          ) : (
            visibleProducts.map(p => (
              <div key={p.id} className="bg-white rounded-2xl p-3 shadow-sm flex gap-3">
                <button onClick={() => setSelProduct(p)} className="flex-1 flex gap-3 text-left active:opacity-90">
                  <div className="w-20 h-20 rounded-xl flex items-center justify-center text-3xl flex-shrink-0 overflow-hidden" style={{ backgroundColor: '#ECFDF5' }}>{p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> : p.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-1">
                      <p className="text-sm font-bold text-gray-800 line-clamp-1 flex-1">{p.name}</p>
                      {p.tags.includes('bestseller') && <span className="text-[8px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full flex-shrink-0">BEST</span>}
                    </div>
                    <p className="text-[10px] text-gray-500 line-clamp-2 mt-0.5">{p.description}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-emerald-700">₹{p.discountPrice || p.price}</span>
                        {p.discountPrice && (
                          <>
                            <span className="text-[10px] text-gray-400 line-through">₹{p.price}</span>
                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">{Math.round((1 - p.discountPrice / p.price) * 100)}% OFF</span>
                          </>
                        )}
                      </div>
                      <Stars r={p.rating} />
                    </div>
                  </div>
                </button>
                <div className="flex flex-col items-center gap-2 justify-center">
                  <button onClick={() => toggleWishlist(p.id)} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-sm active:scale-90 transition-transform">
                    {wishlist.has(p.id) ? '❤️' : '🤍'}
                  </button>
                  <button onClick={() => addToCart(p)} className="w-8 h-8 rounded-full flex items-center justify-center text-sm active:scale-90 transition-transform" style={{ backgroundColor: '#ECFDF5' }}>
                    🛒
                  </button>
                </div>
              </div>
            ))
          )}
        </>)}

        {/* ═══ DIY ═══ */}
        {view === 'diy' && (<>
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-100">
            <h3 className="text-sm font-extrabold text-amber-800">🔬 Make at Home</h3>
            <p className="text-xs text-amber-700 mt-1">Doctor-approved recipes with kitchen ingredients.</p>
          </div>
          {visibleRecipes.length === 0 ? (
            <div className="text-center py-12"><span className="text-4xl">🌿</span><p className="text-sm font-bold text-gray-400 mt-3">No DIY recipes yet</p></div>
          ) : (
            visibleRecipes.map(r => (
              <button key={r.id} onClick={() => setSelRecipe(r)} className="w-full bg-white rounded-2xl p-4 shadow-sm text-left active:scale-[0.98] transition-transform">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{r.emoji}</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-800">{r.title}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{r.description}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-[9px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">⏱ {r.prepTime}</span>
                      <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">{r.difficulty}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </>)}

        {/* ═══ DOCTOR ═══ */}
        {view === 'doctor' && (<>
          <div className="bg-white rounded-3xl p-5 shadow-sm text-center">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-4xl text-white font-bold shadow-lg">{chief.name.charAt(0)}</div>
            <span className="inline-block mt-3 text-[9px] font-bold bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">👑 Chief Doctor</span>
            <h2 className="text-xl font-extrabold text-gray-900 mt-2">{chief.name}</h2>
            <p className="text-xs text-emerald-600 font-bold">{chief.specialization}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{chief.qualification} · {chief.experience} years</p>
            <div className="flex justify-around mt-4 bg-gray-50 rounded-2xl p-3">
              <div className="text-center"><p className="text-lg font-extrabold text-amber-500">{chief.rating}</p><p className="text-[9px] text-gray-400">Rating</p></div>
              <div className="text-center"><p className="text-lg font-extrabold text-blue-600">{chief.experience}</p><p className="text-[9px] text-gray-400">Years</p></div>
              <div className="text-center"><p className="text-lg font-extrabold text-purple-600">{chief.reviews}</p><p className="text-[9px] text-gray-400">Reviews</p></div>
            </div>
            <div className="flex flex-wrap gap-1.5 justify-center mt-3">
              {chief.tags.map((t: string) => <span key={t} className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">{t}</span>)}
            </div>
          </div>
          <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
            <h3 className="text-sm font-bold text-emerald-800 mb-2">💚 About</h3>
            <p className="text-xs text-gray-700 leading-relaxed">{chief.about}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            {[
              { l: 'Consultation Fee', v: '₹' + chief.fee + (chief.feeFreeForPoor ? ' (Free for those in need)' : ''), e: '💰' },
              { l: 'Languages', v: chief.languages.join(', '), e: '🗣️' },
              { l: 'Experience', v: chief.experience + ' years', e: '🏆' },
            ].map(r => (
              <div key={r.l} className="flex items-center gap-3">
                <span className="text-lg">{r.e}</span>
                <div><p className="text-[10px] text-gray-400">{r.l}</p><p className="text-xs font-bold text-gray-800">{r.v}</p></div>
              </div>
            ))}
            {chief.feeFreeForPoor && (
              <div className="bg-rose-50 rounded-xl p-3 border border-rose-100">
                <p className="text-xs font-bold text-rose-700">❤️ Free for Those in Need</p>
                <p className="text-[10px] text-rose-600 mt-0.5">Doctor provides free treatment for patients who cannot afford care.</p>
              </div>
            )}
          </div>
          <button onClick={() => { setCbProduct(null); setCbName(user?.fullName || ''); setCbPhone(user?.phone || ''); setCbMessage('I would like to consult with ' + chief.name); setCbSent(false); setShowCallback(true); }}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-sm active:scale-95 transition-transform" style={{ background: 'linear-gradient(135deg,#059669,#10B981)' }}>
            📞 Request Callback for Consultation
          </button>
          <button onClick={() => nav('/appointments')} className="w-full py-3 rounded-2xl border-2 border-emerald-200 text-emerald-700 font-bold text-sm active:scale-95 transition-transform">
            📅 Book Appointment Online
          </button>
        </>)}
      </div>

      {/* ═══ PRODUCT DETAIL MODAL ═══ */}
      {selProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={() => setSelProduct(null)}>
          <div className="bg-white w-full max-w-[430px] rounded-t-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3" />
            <div className="relative">
              <div className="w-full h-44 flex items-center justify-center text-7xl overflow-hidden" style={{ backgroundColor: '#ECFDF5' }}>{selProduct.imageUrl ? <img src={selProduct.imageUrl} alt={selProduct.name} className="w-full h-full object-cover" /> : selProduct.emoji}</div>
              <button onClick={() => toggleWishlist(selProduct.id)} className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-xl active:scale-90 transition-transform">
                {wishlist.has(selProduct.id) ? '❤️' : '🤍'}
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <div className="flex items-start justify-between">
                  <h2 className="text-lg font-extrabold text-gray-900 flex-1">{selProduct.name}</h2>
                  <button onClick={() => setSelProduct(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 ml-2 active:scale-90">✕</button>
                </div>
                <div className="flex items-center gap-2 mt-1"><Stars r={selProduct.rating} /><span className="text-[10px] text-gray-400">({selProduct.reviews} reviews)</span></div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-2xl font-extrabold text-emerald-700">₹{selProduct.discountPrice || selProduct.price}</span>
                  {selProduct.discountPrice && <span className="text-sm text-gray-400 line-through">₹{selProduct.price}</span>}
                  {selProduct.discountPrice && <span className="text-xs font-bold text-white bg-emerald-500 px-2 py-0.5 rounded-full">{Math.round((1 - selProduct.discountPrice / selProduct.price) * 100)}% OFF</span>}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{selProduct.size}</p>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{selProduct.description}</p>
              {selProduct.doctorNote && (
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                  <p className="text-[10px] font-bold text-amber-700 uppercase mb-1">👩‍⚕️ {chief?.name || 'Doctor'}'s Note</p>
                  <p className="text-xs text-amber-800 italic">"{selProduct.doctorNote}"</p>
                </div>
              )}
              <div><p className="text-xs font-bold text-gray-700 mb-2">Ingredients</p>
                <div className="flex flex-wrap gap-1.5">{selProduct.ingredients.map((ing: string) => <span key={ing} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">{ing}</span>)}</div>
              </div>
              <div><p className="text-xs font-bold text-gray-700 mb-2">Benefits</p>
                {selProduct.benefits.map((b: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 py-1"><span className="text-emerald-500 text-xs">✓</span><p className="text-xs text-gray-600">{b}</p></div>
                ))}
              </div>
              <div className="bg-gray-50 rounded-xl p-3"><p className="text-[10px] font-bold text-gray-700 uppercase mb-1">How to Use</p><p className="text-xs text-gray-600">{selProduct.howToUse}</p></div>
              <div className="space-y-2 pb-2">
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { addToCart(selProduct); setSelProduct(null); }}
                    className="py-3 rounded-2xl font-bold text-sm active:scale-95 transition-transform border-2 border-emerald-400 text-emerald-700">
                    🛒 Add to Cart
                  </button>
                  <button onClick={() => { setSelProduct(null); openCallback(selProduct); }}
                    className="py-3 rounded-2xl text-white font-bold text-sm active:scale-95 transition-transform"
                    style={{ background: 'linear-gradient(135deg,#059669,#10B981)' }}>
                    📞 Enquire
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ RECIPE DETAIL MODAL ═══ */}
      {selRecipe && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={() => setSelRecipe(null)}>
          <div className="bg-white w-full max-w-[430px] rounded-t-3xl max-h-[90vh] overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto -mt-1 mb-4" />
            <div className="flex items-center gap-2 mb-3">
              <span className="text-3xl">{selRecipe.emoji}</span>
              <div className="flex-1">
                <h3 className="text-lg font-extrabold text-gray-900">{selRecipe.title}</h3>
                <div className="flex gap-2 mt-0.5">
                  <span className="text-[9px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{selRecipe.prepTime}</span>
                  <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">{selRecipe.difficulty}</span>
                </div>
              </div>
              <button onClick={() => setSelRecipe(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 active:scale-90">✕</button>
            </div>
            <p className="text-xs text-gray-600 mb-4">{selRecipe.description}</p>
            <div className="bg-amber-50 rounded-xl p-3 mb-4">
              <p className="text-xs font-bold text-amber-800 mb-2">🧪 Ingredients</p>
              {selRecipe.ingredients.map((ing: any, i: number) => (
                <div key={i} className="flex justify-between py-1 border-b border-amber-100 last:border-0">
                  <span className="text-xs text-gray-700">{ing.name}</span><span className="text-xs font-bold text-amber-700">{ing.amount}</span>
                </div>
              ))}
            </div>
            <div><p className="text-xs font-bold text-gray-800 mb-2">📋 Steps</p>
              {selRecipe.steps.map((s: string, i: number) => (
                <div key={i} className="flex items-start gap-3 py-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-extrabold flex-shrink-0">{i + 1}</span>
                  <p className="text-xs text-gray-600 leading-relaxed">{s}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ CART MODAL ═══ */}
      {showCart && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowCart(false)}>
          <div className="bg-white w-full max-w-[430px] rounded-t-3xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-4" />
            <div className="px-5 pb-1 flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-gray-900">Your Cart 🛒</h3>
              <button onClick={() => setShowCart(false)} className="text-gray-400 active:scale-90">✕</button>
            </div>
            {cart.length === 0 ? (
              <div className="py-16 text-center px-5">
                <span className="text-5xl block mb-3">🛒</span>
                <p className="text-sm font-bold text-gray-400">Your cart is empty</p>
                <button onClick={() => setShowCart(false)} className="mt-4 text-emerald-600 font-bold text-sm active:scale-95 transition-transform">Browse Products →</button>
              </div>
            ) : (
              <div className="px-5 space-y-3">
                {cart.map(item => (
                  <div key={item.product.id} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ backgroundColor: '#ECFDF5' }}>{item.product.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800 line-clamp-1">{item.product.name}</p>
                      <p className="text-sm font-extrabold text-emerald-700 mt-0.5">₹{(item.product.discountPrice || item.product.price) * item.qty}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.product.id, -1)} className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center font-bold text-sm active:scale-90 transition-transform">−</button>
                      <span className="text-sm font-extrabold w-5 text-center">{item.qty}</span>
                      <button onClick={() => updateQty(item.product.id, 1)} className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm active:scale-90 transition-transform">+</button>
                      <button onClick={() => removeFromCart(item.product.id)} className="w-7 h-7 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center text-xs active:scale-90 transition-transform ml-1">✕</button>
                    </div>
                  </div>
                ))}
                <div className="bg-white rounded-2xl p-4 border border-gray-100">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-500">Subtotal</span>
                    <span className="text-xs font-bold text-gray-800">₹{cartTotal}</span>
                  </div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-500">Delivery</span>
                    <span className="text-xs font-bold text-emerald-600">Free</span>
                  </div>
                  <div className="border-t border-gray-100 mt-2 pt-2 flex justify-between items-center">
                    <span className="text-sm font-extrabold text-gray-800">Total</span>
                    <span className="text-base font-extrabold text-emerald-700">₹{cartTotal}</span>
                  </div>
                </div>
                <button onClick={() => {
                  const existing = JSON.parse(localStorage.getItem('sb_order_history') || '[]');
                  const order = {
                    id: 'SB' + Date.now(),
                    items: cart.map(i => ({ name: i.product.name, price: i.product.discountPrice || i.product.price, qty: i.qty || 1, emoji: i.product.emoji || '🌿' })),
                    total: cartTotal,
                    date: new Date().toISOString(),
                    status: 'Processing',
                  };
                  localStorage.setItem('sb_order_history', JSON.stringify([order, ...existing].slice(0, 50)));
                  toast.success('Order placed! We\'ll call you shortly 📞');
                  setShowCart(false); setCart([]);
                }}
                  className="w-full py-4 rounded-2xl text-white font-extrabold text-sm active:scale-95 transition-transform mb-5"
                  style={{ background: 'linear-gradient(135deg,#059669,#10B981)' }}>
                  📞 Request Callback to Order
                </button>
                <div className="flex gap-2 mb-5">
                  {['UPI', 'Card', 'COD'].map(m => (
                    <div key={m} className="flex-1 bg-gray-50 rounded-xl py-2 text-center text-[9px] font-bold text-gray-500 border border-gray-100">{m}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ CALLBACK MODAL ═══ */}
      {showCallback && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowCallback(false)}>
          <div className="bg-white w-full max-w-[430px] rounded-t-3xl p-6" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto -mt-1 mb-4" />
            {!cbSent ? (<>
              <div className="text-center mb-5">
                <span className="text-4xl">📞</span>
                <h3 className="text-lg font-extrabold text-gray-900 mt-2">Request a Callback</h3>
                <p className="text-xs text-gray-500 mt-1">{cbProduct ? 'Interested in ' + cbProduct.name + '? We\'ll call you!' : 'We\'ll call you to schedule a consultation.'}</p>
              </div>
              {cbProduct && (
                <div className="bg-emerald-50 rounded-xl p-3 flex items-center gap-3 mb-4">
                  <span className="text-2xl">{cbProduct.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800 truncate">{cbProduct.name}</p>
                    <p className="text-sm font-extrabold text-emerald-700">₹{cbProduct.discountPrice || cbProduct.price}</p>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                <div><label className="text-[10px] font-bold text-gray-500 uppercase">Your Name *</label>
                  <input value={cbName} onChange={e => setCbName(e.target.value)} placeholder="Your full name" className="w-full mt-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:outline-none" /></div>
                <div><label className="text-[10px] font-bold text-gray-500 uppercase">Phone Number *</label>
                  <input value={cbPhone} onChange={e => setCbPhone(e.target.value)} placeholder="+91 98765 43210" type="tel" className="w-full mt-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:outline-none" /></div>
                <div><label className="text-[10px] font-bold text-gray-500 uppercase">Message (optional)</label>
                  <textarea value={cbMessage} onChange={e => setCbMessage(e.target.value)} className="w-full mt-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:outline-none resize-none" rows={3} /></div>
              </div>
              <button onClick={submitCallback} className="w-full mt-5 py-3.5 rounded-2xl text-white font-bold text-sm active:scale-95 transition-transform" style={{ background: 'linear-gradient(135deg,#059669,#10B981)' }}>
                📞 Request Callback
              </button>
              <p className="text-[9px] text-gray-400 text-center mt-2">We typically call back within 2-4 hours during business hours</p>
            </>) : (
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-3xl mb-3">✅</div>
                <h3 className="text-lg font-extrabold text-gray-900">Request Received!</h3>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                  {chief?.name || 'Our team'} will call you at <strong>{cbPhone}</strong> within 2-4 hours.
                </p>
                <button onClick={() => setShowCallback(false)} className="mt-5 w-full py-3 rounded-2xl bg-gray-100 text-gray-700 font-bold text-sm active:scale-95 transition-transform">Done</button>
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
