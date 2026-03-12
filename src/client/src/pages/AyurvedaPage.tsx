// @ts-nocheck
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAyurvedaStore } from '../stores/ayurvedaStore';
import { useCycleStore } from '../stores/cycleStore';
import { useAuthStore } from '../stores/authStore';
import { api, productAPI } from '../services/api';
import type { ProductCategory, AyurvedaProduct, DIYRecipe } from '../stores/ayurvedaStore';
import { useChiefDoctor } from '../hooks/useChiefDoctor';
import { useCart } from '../hooks/useCart';
import BottomNav from '../components/BottomNav';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════
   VEDACLUE AYURVEDA SHOP — Enterprise Grade
   Zepto/Flipkart/Forest Essentials/Kama Ayurveda inspired
   ═══════════════════════════════════════════════════════ */

const catLabels: Record<ProductCategory | 'all', { emoji: string; label: string }> = {
  all: { emoji: '\u{1F33F}', label: 'All' }, hair_oil: { emoji: '\u{1F9F4}', label: 'Hair Oil' },
  body_lotion: { emoji: '\u{1F338}', label: 'Lotion' }, face_wash: { emoji: '\u{1F33B}', label: 'Face Wash' },
  body_wash: { emoji: '\u{1F4A7}', label: 'Body Wash' }, hair_treatment: { emoji: '\u{1F489}', label: 'Treatment' },
  supplement: { emoji: '\u{1F33A}', label: 'Supplement' }, skincare: { emoji: '\u2728', label: 'Skincare' },
};

const SORT_OPTIONS = [
  { k: 'newest', l: 'Newest' }, { k: 'price_asc', l: 'Price: Low' },
  { k: 'price_desc', l: 'Price: High' }, { k: 'rating', l: 'Top Rated' }, { k: 'popular', l: 'Popular' },
];

// Phase-specific product recommendations
const PHASE_RECS: Record<string, { emoji: string; label: string; tagline: string; tags: string[] }> = {
  menstrual: { emoji: '\u{1FA78}', label: 'For Your Period', tagline: 'Iron, warmth & pain relief', tags: ['period', 'iron', 'pain'] },
  follicular: { emoji: '\u{1F331}', label: 'Rising Energy', tagline: 'Nourish & energize', tags: ['energy', 'nourish', 'follicular'] },
  ovulation: { emoji: '\u2728', label: 'Peak Phase', tagline: 'Fertility & glow', tags: ['fertility', 'glow', 'ovulation', 'shatavari'] },
  luteal: { emoji: '\u{1F342}', label: 'Pre-Period Care', tagline: 'Calm PMS naturally', tags: ['pms', 'mood', 'ashwagandha', 'luteal'] },
};

const Stars = ({ r }: { r: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map(i => (
      <span key={i} className="text-[10px]" style={{ color: i <= Math.round(r) ? '#F59E0B' : '#D1D5DB' }}>{'\u2605'}</span>
    ))}
    <span className="text-[10px] text-gray-500 ml-0.5 font-bold">{r}</span>
  </div>
);

// Stock urgency badge (like Flipkart "Only 2 left!")
const StockBadge = ({ stock, inStock }: { stock: number; inStock: boolean }) => {
  if (!inStock || stock <= 0) return <span className="text-[8px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Out of Stock</span>;
  if (stock <= 3) return <span className="text-[8px] font-bold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full animate-pulse">Only {stock} left!</span>;
  if (stock <= 10) return <span className="text-[8px] font-bold bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full">Few left</span>;
  return null;
};

export default function AyurvedaPage() {
  const nav = useNavigate();
  const store = useAyurvedaStore();
  const { recipes } = store;
  const { phase, goal } = useCycleStore();
  const user = useAuthStore(s => s.user);
  const isAdminUnlocked = user?.role === 'ADMIN';

  // Fetch products from API
  const [apiProducts, setApiProducts] = useState<AyurvedaProduct[] | null>(null);
  const [productsLoading, setProductsLoading] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [showSort, setShowSort] = useState(false);
  const [cat, setCat] = useState<ProductCategory | 'all'>('all');

  // UI state
  const [view, setView] = useState<'shop' | 'diy' | 'doctor'>('shop');
  const [selProduct, setSelProduct] = useState<AyurvedaProduct | null>(null);
  const [selRecipe, setSelRecipe] = useState<DIYRecipe | null>(null);

  // Shared cart (persisted via useCart hook — same data CheckoutPage reads)
  const { items: cartItems, count: cartCount, total: cartTotal, addToCart: hookAddToCart, removeFromCart: hookRemoveFromCart, updateQty: hookUpdateQty, fetchCart } = useCart();
  const [showCart, setShowCart] = useState(false);

  // Fetch server cart on mount
  useEffect(() => { fetchCart(); }, [fetchCart]);

  // Wishlist state (server-synced)
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());

  // Reviews state
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState<any>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Related products
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);

  // Callback state
  const [showCallback, setShowCallback] = useState(false);
  const [cbProduct, setCbProduct] = useState<AyurvedaProduct | null>(null);
  const [cbName, setCbName] = useState(user?.fullName || '');
  const [cbPhone, setCbPhone] = useState(user?.phone || '');
  const [cbMessage, setCbMessage] = useState('');
  const [cbSent, setCbSent] = useState(false);

  const { chief } = useChiefDoctor();
  const phaseRec = PHASE_RECS[phase] || PHASE_RECS.follicular;
  const products = apiProducts || store.products;

  // Fetch products with search/filter/sort
  const fetchProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const params: any = {};
      if (cat !== 'all') params.category = cat;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (sortBy !== 'newest') params.sort = sortBy;
      params.inStock = 'true';
      const r = await api.get('/products', { params });
      const d = r.data?.data || r.data;
      const items = Array.isArray(d?.products) ? d.products : Array.isArray(d) ? d : [];
      setApiProducts(items);
      setTotalProducts(d?.total || items.length);
    } catch {
      setApiProducts([]);
      toast.error('Failed to load products');
    }
    setProductsLoading(false);
  }, [cat, searchQuery, sortBy]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Fetch doctors from API
  const [apiDoctors, setApiDoctors] = useState<any[] | null>(null);
  useEffect(() => {
    api.get('/doctors').then(r => {
      const items = r.data.data || r.data.doctors || [];
      if (items.length > 0) setApiDoctors(items);
    }).catch(() => {});
  }, []);
  const doctors = apiDoctors || [];

  // Fetch wishlist IDs on mount (if logged in)
  useEffect(() => {
    if (!user) return;
    productAPI.getWishlistIds().then(r => {
      const ids = r.data?.data || r.data || [];
      setWishlistIds(new Set(ids));
    }).catch(() => {});
  }, [user]);

  // Search suggestions (debounced)
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const r = await productAPI.searchSuggestions(searchQuery);
        setSearchResults(r.data?.data || r.data || []);
        setShowSearchSuggestions(true);
      } catch { }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const visibleProducts = useMemo(() => {
    return products.filter(p => p.isPublished);
  }, [products]);

  const featured = products.filter(p => p.isPublished && p.isFeatured);

  // Phase-recommended products
  const phaseProducts = useMemo(() => {
    return products.filter(p => p.isPublished).filter(p =>
      p.tags?.some((t: string) => phaseRec.tags.some(rt => t.toLowerCase().includes(rt)))
      || (phase === 'menstrual' && p.category === 'supplement')
    ).slice(0, 4);
  }, [products, phase]);

  const visibleRecipes = useMemo(() => recipes.filter(r => r.isPublished).filter(r => r.targetAudience.includes('all') || r.targetAudience.includes(goal as any)), [recipes, goal]);

  // Cart helpers — delegate to shared useCart hook so CheckoutPage sees same items
  const addToCart = (product: AyurvedaProduct) => {
    if (!product.inStock || (product as any).stock <= 0) { toast.error('This product is out of stock'); return; }
    hookAddToCart({
      productId: product.id,
      name: product.name,
      price: product.discountPrice || product.price,
      image: (product as any).imageUrl || product.emoji || '',
      qty: 1,
    });
  };
  const removeFromCart = (id: string) => hookRemoveFromCart(id);
  const updateQty = (id: string, delta: number) => {
    const item = cartItems.find(i => i.id === id || i.productId === id);
    if (item) hookUpdateQty(item.id, item.qty + delta);
  };

  // Wishlist helpers (server-synced)
  const toggleWishlist = async (id: string) => {
    if (!user) { toast.error('Please login to save to wishlist'); return; }
    const wasWishlisted = wishlistIds.has(id);
    const newSet = new Set(wishlistIds);
    if (wasWishlisted) { newSet.delete(id); toast('Removed from wishlist'); }
    else { newSet.add(id); toast.success('Added to wishlist'); }
    setWishlistIds(newSet);
    try { await productAPI.toggleWishlist(id); } catch {
      // Rollback on failure
      const rollback = new Set(wishlistIds);
      if (wasWishlisted) rollback.add(id); else rollback.delete(id);
      setWishlistIds(rollback);
      toast.error('Failed to update wishlist');
    }
  };

  // Load reviews when product detail opens
  const loadReviews = async (productId: string) => {
    try {
      const r = await productAPI.getReviews(productId);
      const d = r.data?.data || r.data;
      setReviews(d?.reviews || []);
      setReviewStats(d);
    } catch { setReviews([]); setReviewStats(null); }
  };

  // Load related products
  const loadRelated = async (productId: string) => {
    try {
      const r = await productAPI.related(productId);
      setRelatedProducts(r.data?.data || r.data || []);
    } catch { setRelatedProducts([]); }
  };

  const openProductDetail = (p: AyurvedaProduct) => {
    setSelProduct(p);
    setShowReviewForm(false);
    setReviewRating(5); setReviewTitle(''); setReviewComment('');
    loadReviews(p.id);
    loadRelated(p.id);
  };

  // Submit review
  const submitReview = async () => {
    if (!user) { toast.error('Please login to review'); return; }
    if (!selProduct) return;
    setSubmittingReview(true);
    try {
      await productAPI.submitReview(selProduct.id, {
        rating: reviewRating, title: reviewTitle || undefined, comment: reviewComment || undefined,
      });
      toast.success('Review submitted!');
      setShowReviewForm(false);
      loadReviews(selProduct.id);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to submit review');
    }
    setSubmittingReview(false);
  };

  // Share product
  const shareProduct = async (p: AyurvedaProduct) => {
    const url = window.location.origin + '/ayurveda?product=' + p.id;
    const text = `Check out ${p.name} on VedaClue - Pure Ayurvedic product for \u20B9${p.discountPrice || p.price}`;
    if (navigator.share) {
      try { await navigator.share({ title: p.name, text, url }); } catch { }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    }
  };

  const openCallback = (product: AyurvedaProduct) => {
    setCbProduct(product); setCbName(user?.fullName || ''); setCbPhone(user?.phone || '');
    setCbMessage('I am interested in ' + product.name); setCbSent(false); setShowCallback(true);
  };

  const submitCallback = async () => {
    if (!cbName.trim() || !cbPhone.trim()) { toast.error('Please enter name and phone'); return; }
    try {
      await api.post('/callbacks', {
        userId: user?.id || undefined, productId: cbProduct?.id || undefined,
        userName: cbName, userPhone: cbPhone, userEmail: user?.email || undefined,
        productName: cbProduct?.name || 'Consultation',
        ownerEmail: (cbProduct as any)?.ownerEmail || undefined,
        ownerPhone: (cbProduct as any)?.ownerPhone || undefined,
        message: cbMessage,
      });
      setCbSent(true); toast.success('Callback requested!');
    } catch {
      const requests = JSON.parse(localStorage.getItem('sb_callbacks') || '[]');
      requests.push({ id: 'cb_' + Date.now(), productId: cbProduct?.id, productName: cbProduct?.name || 'Consultation', userName: cbName, userPhone: cbPhone, message: cbMessage, timestamp: new Date().toISOString(), status: 'pending' });
      localStorage.setItem('sb_callbacks', JSON.stringify(requests));
      setCbSent(true); toast.success('Saved locally — will be sent when connection is restored');
    }
  };

  return (
    <div className="min-h-screen pb-28" style={{ backgroundColor: '#FAFAF9' }}>

      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-xl border-b border-gray-100" style={{ backgroundColor: 'rgba(250,250,249,0.92)' }}>
        <div className="px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button onClick={() => nav('/dashboard')} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm active:scale-90 transition-transform">{'\u2190'}</button>
            <div>
              <h1 className="text-base font-extrabold text-gray-900">Ayurveda {'\u{1F33F}'}</h1>
              <p className="text-[9px] text-gray-400">Pure. Handcrafted. Genuine.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdminUnlocked && (
              <button onClick={() => nav('/admin')} className="text-[9px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full active:scale-95">{'\u{1F6E1}\uFE0F'} Admin</button>
            )}
            <button onClick={() => nav('/shop/history')} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-lg active:scale-95 transition-transform">{'\u{1F4E6}'}</button>
            <button onClick={() => setShowCart(true)} className="relative w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-lg active:scale-95 transition-transform">
              {'\u{1F6D2}'}
              {cartCount > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center">
                  <span className="text-[8px] text-white font-extrabold">{cartCount}</span>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="px-5 pb-3 flex gap-2">
          {([['shop', '\u{1F6CD}\uFE0F Shop'], ['diy', '\u{1F52C} DIY'], ['doctor', '\u{1F469}\u200D\u2695\uFE0F Doctor']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setView(k)}
              className={'px-3.5 py-1.5 rounded-full text-[10px] font-bold transition-all ' + (view === k ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500')}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-4 space-y-4">

        {/* SHOP */}
        {view === 'shop' && (<>

          {/* Search Bar (like Zepto/Flipkart) */}
          <div className="relative">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{'\u{1F50D}'}</span>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowSearchSuggestions(true)}
                placeholder="Search hair oil, ashwagandha, skincare..."
                className="w-full pl-10 pr-20 py-3 border border-gray-200 rounded-2xl text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 focus:outline-none bg-white shadow-sm"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="absolute right-12 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold">{'\u2715'}</button>
              )}
              <button onClick={() => setShowSort(!showSort)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm active:scale-90">{'\u2B73'}</button>
            </div>

            {/* Search suggestions dropdown */}
            {showSearchSuggestions && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-lg border border-gray-100 z-30 overflow-hidden">
                {searchResults.map((p: any) => (
                  <button key={p.id} onClick={() => { setShowSearchSuggestions(false); setSearchQuery(''); openProductDetail(p); }}
                    className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0 overflow-hidden" style={{ backgroundColor: '#ECFDF5' }}>
                      {p.imageUrl ? <img src={p.imageUrl} alt="" className="w-full h-full object-cover" /> : p.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800 truncate">{p.name}</p>
                      <p className="text-[10px] text-emerald-600 font-bold">{'\u20B9'}{p.discountPrice || p.price}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Sort dropdown */}
            {showSort && (
              <div className="absolute top-full right-0 mt-1 bg-white rounded-2xl shadow-lg border border-gray-100 z-30 overflow-hidden w-40">
                <p className="px-3 py-2 text-[9px] font-bold text-gray-400 uppercase border-b border-gray-50">Sort by</p>
                {SORT_OPTIONS.map(s => (
                  <button key={s.k} onClick={() => { setSortBy(s.k); setShowSort(false); }}
                    className={'w-full px-3 py-2.5 text-left text-xs font-medium hover:bg-gray-50 ' + (sortBy === s.k ? 'text-emerald-600 font-bold bg-emerald-50' : 'text-gray-700')}>
                    {s.l}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Click overlay to close dropdowns */}
          {(showSearchSuggestions || showSort) && (
            <div className="fixed inset-0 z-20" onClick={() => { setShowSearchSuggestions(false); setShowSort(false); }} />
          )}

          {/* Hero Banner */}
          <div className="rounded-2xl p-5 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#065F46,#059669,#10B981)' }}>
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full" />
            <div className="absolute -right-3 top-3 w-20 h-20 bg-white/5 rounded-full" />
            <p className="text-white/60 text-[9px] uppercase tracking-widest font-bold">VedaClue Ayurveda</p>
            <h2 className="text-xl font-extrabold mt-1">Handmade with Love {'\u{1F49A}'}</h2>
            <p className="text-xs text-white/80 mt-1 max-w-[220px]">Freshly prepared by {chief?.name || 'our doctor'} using pure organic herbs. No chemicals.</p>
            <div className="flex gap-2 mt-3">
              {['\u2705 Lab Tested', '\u2705 No Chemicals', '\u2705 Fresh Batches'].map(t => (
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
                  <button key={p.id} onClick={() => openProductDetail(p)}
                    className="flex-shrink-0 w-36 bg-white rounded-2xl overflow-hidden shadow-sm text-left active:scale-[0.97] transition-transform">
                    <div className="h-20 flex items-center justify-center text-3xl overflow-hidden" style={{ backgroundColor: '#ECFDF5' }}>{p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> : p.emoji}</div>
                    <div className="p-2.5">
                      <p className="text-[10px] font-extrabold text-gray-800 line-clamp-1">{p.name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs font-extrabold text-emerald-700">{'\u20B9'}{p.discountPrice || p.price}</span>
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
            <h3 className="text-xs font-bold text-amber-800 mb-2">{'\u{1F4DE}'} How to Order</h3>
            <div className="space-y-2">
              {[
                { n: '1', t: 'Browse & Add to Cart', d: 'Select products and proceed to checkout' },
                { n: '2', t: 'Pay Online or COD', d: 'Razorpay, UPI, Card, or Cash on Delivery' },
                { n: '3', t: 'Personalized Advice', d: chief?.name + ' provides guidance on usage' },
                { n: '4', t: 'Delivered to You', d: 'Fresh, handcrafted products at your doorstep' },
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
          {cat === 'all' && !searchQuery && featured.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">{'\u2B50'} Featured</h3>
              <div className="overflow-x-auto -mx-5 px-5">
                <div className="flex gap-3 min-w-max pb-2">
                  {featured.map(p => (
                    <button key={p.id} onClick={() => openProductDetail(p)}
                      className="w-48 bg-white rounded-2xl p-3 shadow-sm text-left active:scale-95 transition-transform flex-shrink-0">
                      <div className="relative">
                        <div className="w-full h-24 rounded-xl flex items-center justify-center text-4xl overflow-hidden" style={{ backgroundColor: '#ECFDF5' }}>{p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover rounded-xl" /> : p.emoji}</div>
                        <button onClick={e => { e.stopPropagation(); toggleWishlist(p.id); }}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-sm active:scale-90 shadow-sm">
                          {wishlistIds.has(p.id) ? '\u2764\uFE0F' : '\u{1F90D}'}
                        </button>
                        <StockBadge stock={(p as any).stock} inStock={p.inStock} />
                      </div>
                      <p className="text-xs font-bold text-gray-800 line-clamp-1 mt-2">{p.name}</p>
                      <Stars r={p.rating} />
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-extrabold text-emerald-700">{'\u20B9'}{p.discountPrice || p.price}</span>
                        {p.discountPrice && <span className="text-[10px] text-gray-400 line-through">{'\u20B9'}{p.price}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Product List */}
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-400 uppercase">
              {searchQuery ? `Results for "${searchQuery}"` : (cat === 'all' ? 'All Products' : catLabels[cat].label)} ({visibleProducts.length})
            </h3>
            {sortBy !== 'newest' && (
              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                {SORT_OPTIONS.find(s => s.k === sortBy)?.l}
              </span>
            )}
          </div>

          {productsLoading ? (
            <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-3 border-emerald-400 border-t-transparent rounded-full" /></div>
          ) : visibleProducts.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl">{'\u{1F33F}'}</span>
              <p className="text-sm font-bold text-gray-400 mt-3">{searchQuery ? 'No products found' : 'No products in this category yet'}</p>
              {searchQuery && <button onClick={() => setSearchQuery('')} className="mt-2 text-emerald-600 font-bold text-sm">Clear search</button>}
            </div>
          ) : (
            visibleProducts.map(p => (
              <div key={p.id} className="bg-white rounded-2xl p-3 shadow-sm flex gap-3">
                <button onClick={() => openProductDetail(p)} className="flex-1 flex gap-3 text-left active:opacity-90">
                  <div className="w-20 h-20 rounded-xl flex items-center justify-center text-3xl flex-shrink-0 overflow-hidden relative" style={{ backgroundColor: '#ECFDF5' }}>
                    {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> : p.emoji}
                    {(p as any).stock > 0 && (p as any).stock <= 3 && (
                      <div className="absolute bottom-0 left-0 right-0 bg-orange-500 text-white text-[7px] font-bold text-center py-0.5">Only {(p as any).stock} left!</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-1">
                      <p className="text-sm font-bold text-gray-800 line-clamp-1 flex-1">{p.name}</p>
                      {p.tags.includes('bestseller') && <span className="text-[8px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full flex-shrink-0">BEST</span>}
                    </div>
                    <p className="text-[10px] text-gray-500 line-clamp-2 mt-0.5">{p.description}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-emerald-700">{'\u20B9'}{p.discountPrice || p.price}</span>
                        {p.discountPrice && (
                          <>
                            <span className="text-[10px] text-gray-400 line-through">{'\u20B9'}{p.price}</span>
                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">{Math.round((1 - p.discountPrice / p.price) * 100)}% OFF</span>
                          </>
                        )}
                      </div>
                      <Stars r={p.rating} />
                    </div>
                    {/* Trust badges — based on seller/product certificates */}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(p as any).ayushApproved && <span className="text-[7px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full">{'\u{1F33F}'} AYUSH</span>}
                      {(p as any).labReportUrl && <span className="text-[7px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full">{'\u{1F52C}'} Lab Tested</span>}
                      {(p as any).certifiedOrganic && <span className="text-[7px] font-bold bg-lime-50 text-lime-700 px-1.5 py-0.5 rounded-full">{'\u{1F331}'} Organic</span>}
                      {(p as any).seller?.fssaiStatus === 'VERIFIED' && <span className="text-[7px] font-bold bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full">{'\u2705'} FSSAI</span>}
                      {(p as any).seller?.ayushStatus === 'VERIFIED' && !(p as any).ayushApproved && <span className="text-[7px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full">{'\u{1F33F}'} AYUSH Seller</span>}
                      {(p as any).certifications?.length > 0 && (p as any).certifications.slice(0, 2).map((c: string) => (
                        <span key={c} className="text-[7px] font-bold bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full">{'\u2705'} {c}</span>
                      ))}
                    </div>
                  </div>
                </button>
                <div className="flex flex-col items-center gap-2 justify-center">
                  <button onClick={() => toggleWishlist(p.id)} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-sm active:scale-90 transition-transform">
                    {wishlistIds.has(p.id) ? '\u2764\uFE0F' : '\u{1F90D}'}
                  </button>
                  <button onClick={() => addToCart(p)} disabled={!p.inStock || (p as any).stock <= 0}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm active:scale-90 transition-transform disabled:opacity-30" style={{ backgroundColor: '#ECFDF5' }}>
                    {'\u{1F6D2}'}
                  </button>
                  <button onClick={() => shareProduct(p)} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-sm active:scale-90 transition-transform">
                    {'\u{1F517}'}
                  </button>
                </div>
              </div>
            ))
          )}
        </>)}

        {/* DIY */}
        {view === 'diy' && (<>
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-100">
            <h3 className="text-sm font-extrabold text-amber-800">{'\u{1F52C}'} Make at Home</h3>
            <p className="text-xs text-amber-700 mt-1">Doctor-approved recipes with kitchen ingredients.</p>
          </div>
          {visibleRecipes.length === 0 ? (
            <div className="text-center py-12"><span className="text-4xl">{'\u{1F33F}'}</span><p className="text-sm font-bold text-gray-400 mt-3">No DIY recipes yet</p></div>
          ) : (
            visibleRecipes.map(r => (
              <button key={r.id} onClick={() => setSelRecipe(r)} className="w-full bg-white rounded-2xl p-4 shadow-sm text-left active:scale-[0.98] transition-transform">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{r.emoji}</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-800">{r.title}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{r.description}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-[9px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{'\u23F1'} {r.prepTime}</span>
                      <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">{r.difficulty}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </>)}

        {/* DOCTOR */}
        {view === 'doctor' && (<>
          <div className="bg-white rounded-3xl p-5 shadow-sm text-center">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-4xl text-white font-bold shadow-lg">{chief.name.charAt(0)}</div>
            <span className="inline-block mt-3 text-[9px] font-bold bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">{'\u{1F451}'} Chief Doctor</span>
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
            <h3 className="text-sm font-bold text-emerald-800 mb-2">{'\u{1F49A}'} About</h3>
            <p className="text-xs text-gray-700 leading-relaxed">{chief.about}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            {[
              { l: 'Consultation Fee', v: '\u20B9' + chief.fee + (chief.feeFreeForPoor ? ' (Free for those in need)' : ''), e: '\u{1F4B0}' },
              { l: 'Languages', v: chief.languages.join(', '), e: '\u{1F5E3}\uFE0F' },
              { l: 'Experience', v: chief.experience + ' years', e: '\u{1F3C6}' },
            ].map(r => (
              <div key={r.l} className="flex items-center gap-3">
                <span className="text-lg">{r.e}</span>
                <div><p className="text-[10px] text-gray-400">{r.l}</p><p className="text-xs font-bold text-gray-800">{r.v}</p></div>
              </div>
            ))}
            {chief.feeFreeForPoor && (
              <div className="bg-rose-50 rounded-xl p-3 border border-rose-100">
                <p className="text-xs font-bold text-rose-700">{'\u2764\uFE0F'} Free for Those in Need</p>
                <p className="text-[10px] text-rose-600 mt-0.5">Doctor provides free treatment for patients who cannot afford care.</p>
              </div>
            )}
          </div>
          <button onClick={() => { setCbProduct(null); setCbName(user?.fullName || ''); setCbPhone(user?.phone || ''); setCbMessage('I would like to consult with ' + chief.name); setCbSent(false); setShowCallback(true); }}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-sm active:scale-95 transition-transform" style={{ background: 'linear-gradient(135deg,#059669,#10B981)' }}>
            {'\u{1F4DE}'} Request Callback for Consultation
          </button>
          <button onClick={() => nav('/appointments')} className="w-full py-3 rounded-2xl border-2 border-emerald-200 text-emerald-700 font-bold text-sm active:scale-95 transition-transform">
            {'\u{1F4C5}'} Book Appointment Online
          </button>
        </>)}
      </div>

      {/* PRODUCT DETAIL MODAL */}
      {selProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={() => setSelProduct(null)}>
          <div className="bg-white w-full max-w-[430px] rounded-t-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3" />
            <div className="relative">
              <div className="w-full h-44 flex items-center justify-center text-7xl overflow-hidden" style={{ backgroundColor: '#ECFDF5' }}>{selProduct.imageUrl ? <img src={selProduct.imageUrl} alt={selProduct.name} className="w-full h-full object-cover" /> : selProduct.emoji}</div>
              <div className="absolute top-3 right-3 flex gap-2">
                <button onClick={() => shareProduct(selProduct)} className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-xl active:scale-90 transition-transform">{'\u{1F517}'}</button>
                <button onClick={() => toggleWishlist(selProduct.id)} className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-xl active:scale-90 transition-transform">
                  {wishlistIds.has(selProduct.id) ? '\u2764\uFE0F' : '\u{1F90D}'}
                </button>
              </div>
              {/* Stock urgency on image */}
              <div className="absolute bottom-2 left-2">
                <StockBadge stock={(selProduct as any).stock} inStock={selProduct.inStock} />
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <div className="flex items-start justify-between">
                  <h2 className="text-lg font-extrabold text-gray-900 flex-1">{selProduct.name}</h2>
                  <button onClick={() => setSelProduct(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 ml-2 active:scale-90">{'\u2715'}</button>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Stars r={selProduct.rating} />
                  <span className="text-[10px] text-gray-400">({selProduct.reviews} reviews)</span>
                  <div className="flex flex-wrap gap-1 ml-1">
                    {(selProduct as any).ayushApproved && <span className="text-[7px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full">{'\u{1F33F}'} AYUSH Approved</span>}
                    {(selProduct as any).labReportUrl && <span className="text-[7px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full">{'\u{1F52C}'} Lab Tested</span>}
                    {(selProduct as any).certifiedOrganic && <span className="text-[7px] font-bold bg-lime-50 text-lime-700 px-1.5 py-0.5 rounded-full">{'\u{1F331}'} Certified Organic</span>}
                    {(selProduct as any).seller?.fssaiStatus === 'VERIFIED' && <span className="text-[7px] font-bold bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full">{'\u2705'} FSSAI Certified</span>}
                    {(selProduct as any).certifications?.length > 0 && (selProduct as any).certifications.map((c: string) => (
                      <span key={c} className="text-[7px] font-bold bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full">{'\u2705'} {c}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-2xl font-extrabold text-emerald-700">{'\u20B9'}{selProduct.discountPrice || selProduct.price}</span>
                  {selProduct.discountPrice && <span className="text-sm text-gray-400 line-through">{'\u20B9'}{selProduct.price}</span>}
                  {selProduct.discountPrice && <span className="text-xs font-bold text-white bg-emerald-500 px-2 py-0.5 rounded-full">{Math.round((1 - selProduct.discountPrice / selProduct.price) * 100)}% OFF</span>}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-gray-400">{selProduct.size}</p>
                  {(selProduct as any).weight && <span className="text-[10px] text-gray-400">· {(selProduct as any).weight}</span>}
                  {(selProduct as any).shelfLife && <span className="text-[10px] text-gray-400">· Shelf: {(selProduct as any).shelfLife}</span>}
                </div>
              </div>

              <p className="text-sm text-gray-600 leading-relaxed">{selProduct.description}</p>

              {/* Dosha suitability badges */}
              {(selProduct as any).doshaTypes?.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-500">Suits:</span>
                  {(selProduct as any).doshaTypes.map((d: string) => (
                    <span key={d} className="text-[9px] font-bold bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full">{d}</span>
                  ))}
                </div>
              )}

              {/* Product origin & certifications */}
              {((selProduct as any).manufacturerName || (selProduct as any).countryOfOrigin || (selProduct as any).ingredientList) && (
                <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                  <p className="text-[10px] font-bold text-gray-600 uppercase">{'\u{1F3ED}'} Product Info</p>
                  {(selProduct as any).manufacturerName && <p className="text-[10px] text-gray-600">Manufacturer: <span className="font-bold">{(selProduct as any).manufacturerName}</span></p>}
                  {(selProduct as any).countryOfOrigin && <p className="text-[10px] text-gray-600">Origin: <span className="font-bold">{(selProduct as any).countryOfOrigin}</span></p>}
                  {(selProduct as any).ingredientList && <p className="text-[10px] text-gray-500 mt-1">{(selProduct as any).ingredientList}</p>}
                </div>
              )}

              {(selProduct as any).preparationMethod && (
                <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase">{'\u{1F9EA}'} Preparation</p>
                  <p className="text-xs text-emerald-800 mt-0.5">{(selProduct as any).preparationMethod}</p>
                </div>
              )}

              {selProduct.doctorNote && (
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                  <p className="text-[10px] font-bold text-amber-700 uppercase mb-1">{'\u{1F469}\u200D\u2695\uFE0F'} {chief?.name || 'Doctor'}'s Note</p>
                  <p className="text-xs text-amber-800 italic">"{selProduct.doctorNote}"</p>
                </div>
              )}
              <div><p className="text-xs font-bold text-gray-700 mb-2">Ingredients</p>
                <div className="flex flex-wrap gap-1.5">{selProduct.ingredients.map((ing: string) => <span key={ing} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">{ing}</span>)}</div>
              </div>
              <div><p className="text-xs font-bold text-gray-700 mb-2">Benefits</p>
                {selProduct.benefits.map((b: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 py-1"><span className="text-emerald-500 text-xs">{'\u2713'}</span><p className="text-xs text-gray-600">{b}</p></div>
                ))}
              </div>
              <div className="bg-gray-50 rounded-xl p-3"><p className="text-[10px] font-bold text-gray-700 uppercase mb-1">How to Use</p><p className="text-xs text-gray-600">{selProduct.howToUse}</p></div>

              {/* Reviews Section */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-extrabold text-gray-800">Reviews ({reviewStats?.totalReviews || 0})</h3>
                  {user && (
                    <button onClick={() => setShowReviewForm(!showReviewForm)}
                      className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full active:scale-95">
                      {showReviewForm ? 'Cancel' : '\u270F\uFE0F Write Review'}
                    </button>
                  )}
                </div>

                {/* Rating breakdown */}
                {reviewStats?.breakdown && (
                  <div className="flex items-center gap-4 mb-3">
                    <div className="text-center">
                      <p className="text-2xl font-extrabold text-gray-800">{reviewStats.avgRating}</p>
                      <Stars r={reviewStats.avgRating} />
                      <p className="text-[9px] text-gray-400 mt-0.5">{reviewStats.totalReviews} reviews</p>
                    </div>
                    <div className="flex-1 space-y-1">
                      {[5, 4, 3, 2, 1].map(star => {
                        const count = reviewStats.breakdown[star] || 0;
                        const pct = reviewStats.totalReviews > 0 ? (count / reviewStats.totalReviews) * 100 : 0;
                        return (
                          <div key={star} className="flex items-center gap-1.5">
                            <span className="text-[9px] text-gray-500 w-3">{star}</span>
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-400 rounded-full" style={{ width: pct + '%' }} />
                            </div>
                            <span className="text-[8px] text-gray-400 w-5">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Review form */}
                {showReviewForm && (
                  <div className="bg-gray-50 rounded-2xl p-4 space-y-3 mb-3">
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Your Rating</p>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <button key={s} onClick={() => setReviewRating(s)} className="text-2xl active:scale-90">
                            {s <= reviewRating ? '\u2B50' : '\u2606'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input value={reviewTitle} onChange={e => setReviewTitle(e.target.value)} placeholder="Review title (optional)"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:outline-none" />
                    <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder="Share your experience..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:outline-none resize-none" rows={3} />
                    <button onClick={submitReview} disabled={submittingReview}
                      className="w-full py-2.5 rounded-xl text-white font-bold text-sm active:scale-95 disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg,#059669,#10B981)' }}>
                      {submittingReview ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </div>
                )}

                {/* Review list */}
                {reviews.length > 0 ? reviews.slice(0, 5).map((rv: any) => (
                  <div key={rv.id} className="border-b border-gray-50 py-3 last:border-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Stars r={rv.rating} />
                      {rv.isVerifiedPurchase && <span className="text-[8px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">{'\u2705'} Verified</span>}
                    </div>
                    {rv.title && <p className="text-xs font-bold text-gray-800">{rv.title}</p>}
                    {rv.comment && <p className="text-[11px] text-gray-600 mt-0.5">{rv.comment}</p>}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[9px] text-gray-400">{rv.user?.fullName || 'User'}</span>
                      <span className="text-[9px] text-gray-300">·</span>
                      <span className="text-[9px] text-gray-400">{new Date(rv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                    {rv.adminReply && (
                      <div className="bg-emerald-50 rounded-lg p-2 mt-2">
                        <p className="text-[9px] font-bold text-emerald-700">Seller Reply:</p>
                        <p className="text-[10px] text-emerald-800">{rv.adminReply}</p>
                      </div>
                    )}
                  </div>
                )) : (
                  <p className="text-xs text-gray-400 text-center py-4">No reviews yet. Be the first!</p>
                )}
              </div>

              {/* Related Products */}
              {relatedProducts.length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <h3 className="text-sm font-extrabold text-gray-800 mb-3">You Might Also Like</h3>
                  <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                    {relatedProducts.map((rp: any) => (
                      <button key={rp.id} onClick={() => openProductDetail(rp)}
                        className="flex-shrink-0 w-32 bg-gray-50 rounded-2xl overflow-hidden text-left active:scale-95 transition-transform">
                        <div className="h-20 flex items-center justify-center text-2xl overflow-hidden" style={{ backgroundColor: '#ECFDF5' }}>
                          {rp.imageUrl ? <img src={rp.imageUrl} alt={rp.name} className="w-full h-full object-cover" /> : rp.emoji}
                        </div>
                        <div className="p-2">
                          <p className="text-[10px] font-bold text-gray-800 line-clamp-1">{rp.name}</p>
                          <p className="text-xs font-extrabold text-emerald-700">{'\u20B9'}{rp.discountPrice || rp.price}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pb-2">
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { addToCart(selProduct); setSelProduct(null); }}
                    disabled={!selProduct.inStock || (selProduct as any).stock <= 0}
                    className="py-3 rounded-2xl font-bold text-sm active:scale-95 transition-transform border-2 border-emerald-400 text-emerald-700 disabled:opacity-40 disabled:border-gray-300 disabled:text-gray-400">
                    {selProduct.inStock && (selProduct as any).stock > 0 ? '\u{1F6D2} Add to Cart' : 'Out of Stock'}
                  </button>
                  <button onClick={() => {
                    if (!selProduct.inStock || (selProduct as any).stock <= 0) return;
                    addToCart(selProduct); setSelProduct(null);
                    nav('/checkout');
                  }}
                    disabled={!selProduct.inStock || (selProduct as any).stock <= 0}
                    className="py-3 rounded-2xl text-white font-bold text-sm active:scale-95 transition-transform disabled:opacity-40"
                    style={{ background: selProduct.inStock && (selProduct as any).stock > 0 ? 'linear-gradient(135deg,#059669,#10B981)' : '#9CA3AF' }}>
                    {'\u26A1'} Buy Now
                  </button>
                </div>
                <button onClick={() => { setSelProduct(null); openCallback(selProduct); }}
                  className="w-full py-2.5 rounded-2xl border border-gray-200 text-gray-600 font-bold text-sm active:scale-95 transition-transform">
                  {'\u{1F4DE}'} Enquire / Request Callback
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RECIPE DETAIL MODAL */}
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
              <button onClick={() => setSelRecipe(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 active:scale-90">{'\u2715'}</button>
            </div>
            <p className="text-xs text-gray-600 mb-4">{selRecipe.description}</p>
            <div className="bg-amber-50 rounded-xl p-3 mb-4">
              <p className="text-xs font-bold text-amber-800 mb-2">{'\u{1F9EA}'} Ingredients</p>
              {selRecipe.ingredients.map((ing: any, i: number) => (
                <div key={i} className="flex justify-between py-1 border-b border-amber-100 last:border-0">
                  <span className="text-xs text-gray-700">{ing.name}</span><span className="text-xs font-bold text-amber-700">{ing.amount}</span>
                </div>
              ))}
            </div>
            <div><p className="text-xs font-bold text-gray-800 mb-2">{'\u{1F4CB}'} Steps</p>
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

      {/* CART MODAL */}
      {showCart && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowCart(false)}>
          <div className="bg-white w-full max-w-[430px] rounded-t-3xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-4" />
            <div className="px-5 pb-1 flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-gray-900">Your Cart {'\u{1F6D2}'}</h3>
              <button onClick={() => setShowCart(false)} className="text-gray-400 active:scale-90">{'\u2715'}</button>
            </div>
            {cartItems.length === 0 ? (
              <div className="py-16 text-center px-5">
                <span className="text-5xl block mb-3">{'\u{1F6D2}'}</span>
                <p className="text-sm font-bold text-gray-400">Your cart is empty</p>
                <button onClick={() => setShowCart(false)} className="mt-4 text-emerald-600 font-bold text-sm active:scale-95 transition-transform">Browse Products {'\u2192'}</button>
              </div>
            ) : (
              <div className="px-5 space-y-3">
                {cartItems.map(item => (
                  <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden" style={{ backgroundColor: '#ECFDF5' }}>
                      {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : '\u{1F33F}'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800 line-clamp-1">{item.name}</p>
                      <p className="text-sm font-extrabold text-emerald-700 mt-0.5">{'\u20B9'}{item.price * item.qty}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center font-bold text-sm active:scale-90 transition-transform">{'\u2212'}</button>
                      <span className="text-sm font-extrabold w-5 text-center">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm active:scale-90 transition-transform">+</button>
                      <button onClick={() => removeFromCart(item.id)} className="w-7 h-7 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center text-xs active:scale-90 transition-transform ml-1">{'\u2715'}</button>
                    </div>
                  </div>
                ))}
                <div className="bg-white rounded-2xl p-4 border border-gray-100">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-500">Subtotal ({cartCount} items)</span>
                    <span className="text-xs font-bold text-gray-800">{'\u20B9'}{cartTotal}</span>
                  </div>
                  <div className="border-t border-gray-100 mt-2 pt-2 flex justify-between items-center">
                    <span className="text-sm font-extrabold text-gray-800">Total</span>
                    <span className="text-base font-extrabold text-emerald-700">{'\u20B9'}{cartTotal}</span>
                  </div>
                  <p className="text-[9px] text-gray-400 mt-1">Delivery charges calculated at checkout</p>
                </div>
                <button onClick={() => { setShowCart(false); nav('/checkout'); }}
                  className="w-full py-4 rounded-2xl text-white font-extrabold text-sm active:scale-95 transition-transform mb-3"
                  style={{ background: 'linear-gradient(135deg,#059669,#10B981)' }}>
                  Proceed to Checkout {'\u2192'}
                </button>
                <button onClick={() => { setShowCart(false); openCallback({ name: 'Cart Items', id: '', price: cartTotal, emoji: '\u{1F6D2}' } as any); }}
                  className="w-full py-3 rounded-2xl border border-gray-200 text-gray-600 font-bold text-sm active:scale-95 transition-transform mb-5">
                  {'\u{1F4DE}'} Or Request Callback to Order
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CALLBACK MODAL */}
      {showCallback && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowCallback(false)}>
          <div className="bg-white w-full max-w-[430px] rounded-t-3xl p-6" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto -mt-1 mb-4" />
            {!cbSent ? (<>
              <div className="text-center mb-5">
                <span className="text-4xl">{'\u{1F4DE}'}</span>
                <h3 className="text-lg font-extrabold text-gray-900 mt-2">Request a Callback</h3>
                <p className="text-xs text-gray-500 mt-1">{cbProduct ? 'Interested in ' + cbProduct.name + '? We\'ll call you!' : 'We\'ll call you to schedule a consultation.'}</p>
              </div>
              {cbProduct && cbProduct.id && (
                <div className="bg-emerald-50 rounded-xl p-3 flex items-center gap-3 mb-4">
                  <span className="text-2xl">{cbProduct.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800 truncate">{cbProduct.name}</p>
                    <p className="text-sm font-extrabold text-emerald-700">{'\u20B9'}{cbProduct.discountPrice || cbProduct.price}</p>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                <div><label className="text-[10px] font-bold text-gray-500 uppercase">Your Name *</label>
                  <input value={cbName} onChange={e => setCbName(e.target.value)} placeholder="Sugandhika" className="w-full mt-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:outline-none" /></div>
                <div><label className="text-[10px] font-bold text-gray-500 uppercase">Phone Number *</label>
                  <input value={cbPhone} onChange={e => setCbPhone(e.target.value)} placeholder="+91 9405424185" type="tel" className="w-full mt-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:outline-none" /></div>
                <div><label className="text-[10px] font-bold text-gray-500 uppercase">Message (optional)</label>
                  <textarea value={cbMessage} onChange={e => setCbMessage(e.target.value)} className="w-full mt-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:outline-none resize-none" rows={3} /></div>
              </div>
              <button onClick={submitCallback} className="w-full mt-5 py-3.5 rounded-2xl text-white font-bold text-sm active:scale-95 transition-transform" style={{ background: 'linear-gradient(135deg,#059669,#10B981)' }}>
                {'\u{1F4DE}'} Request Callback
              </button>
              <p className="text-[9px] text-gray-400 text-center mt-2">We typically call back within 2-4 hours during business hours</p>
            </>) : (
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-3xl mb-3">{'\u2705'}</div>
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
