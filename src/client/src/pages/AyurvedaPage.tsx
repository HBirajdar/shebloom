import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAyurvedaStore } from '../stores/ayurvedaStore';
import { useCycleStore } from '../stores/cycleStore';
import type { ProductCategory, AyurvedaProduct, DIYRecipe } from '../stores/ayurvedaStore';

const catLabels: Record<ProductCategory | 'all', { emoji: string; label: string }> = {
  all: { emoji: '\u{1F33F}', label: 'All' },
  hair_oil: { emoji: '\u{1F9F4}', label: 'Hair Oil' },
  body_lotion: { emoji: '\u{1F338}', label: 'Lotion' },
  face_wash: { emoji: '\u{1F33B}', label: 'Face Wash' },
  body_wash: { emoji: '\u{1F4A7}', label: 'Body Wash' },
  hair_treatment: { emoji: '\u{1F489}', label: 'Treatment' },
  supplement: { emoji: '\u{1F33A}', label: 'Supplement' },
  skincare: { emoji: '\u2728', label: 'Skincare' },
};

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map(i => (
      <span key={i} className="text-[10px]" style={{ color: i <= Math.round(rating) ? '#F59E0B' : '#D1D5DB' }}>{'\u2605'}</span>
    ))}
    <span className="text-[10px] text-gray-500 ml-0.5 font-bold">{rating}</span>
  </div>
);

export default function AyurvedaPage() {
  const nav = useNavigate();
  const { products, recipes, doctors } = useAyurvedaStore();
  const doctor = doctors.find(d => d.isChief) || doctors[0];
  const { goal } = useCycleStore();
  const [view, setView] = useState<'shop' | 'diy' | 'doctor'>('shop');
  const [cat, setCat] = useState<ProductCategory | 'all'>('all');
  const [selProduct, setSelProduct] = useState<AyurvedaProduct | null>(null);
  const [selRecipe, setSelRecipe] = useState<DIYRecipe | null>(null);

  // Smart filtering - show products relevant to user's goal
  const visibleProducts = useMemo(() => {
    return products
      .filter(p => p.isPublished)
      .filter(p => p.targetAudience.includes('all') || p.targetAudience.includes(goal as any))
      .filter(p => cat === 'all' || p.category === cat);
  }, [products, goal, cat]);

  const featured = products.filter(p => p.isPublished && p.isFeatured);

  const visibleRecipes = useMemo(() => {
    return recipes
      .filter(r => r.isPublished)
      .filter(r => r.targetAudience.includes('all') || r.targetAudience.includes(goal as any));
  }, [recipes, goal]);

  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: '#FAFAF9' }}>
      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-xl border-b border-gray-100" style={{ backgroundColor: 'rgba(250,250,249,0.92)' }}>
        <div className="px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button onClick={() => nav('/dashboard')} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm active:scale-90">{'\u2190'}</button>
            <div>
              <h1 className="text-base font-extrabold text-gray-900">Ayurveda {'\u{1F33F}'}</h1>
              <p className="text-[9px] text-gray-400">Pure. Handcrafted. Genuine.</p>
            </div>
          </div>
        </div>
        {/* Tabs */}
        <div className="px-5 pb-3 flex gap-2">
          {([['shop', '\u{1F6CD}\uFE0F Shop'], ['diy', '\u{1F52C} DIY Recipes'], ['doctor', '\u{1F469}\u200D\u2695\uFE0F Doctor']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setView(k)}
              className={'px-3.5 py-1.5 rounded-full text-[10px] font-bold transition-all ' + (view === k ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500')}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-4 space-y-4">

        {/* ═══ SHOP TAB ═══ */}
        {view === 'shop' && (<>
          {/* Banner */}
          <div className="rounded-2xl p-5 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #065F46, #059669, #10B981)' }}>
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full" />
            <div className="absolute right-4 top-4 text-4xl">{'\u{1F33F}'}</div>
            <p className="text-white/60 text-[9px] uppercase tracking-widest font-bold">SheBloom Ayurveda</p>
            <h2 className="text-xl font-extrabold mt-1">Handmade with Love</h2>
            <p className="text-xs text-white/80 mt-1 max-w-[200px]">Every product is freshly prepared by our doctor using pure, organic herbs. Zero chemicals. Zero compromise.</p>
            <div className="flex gap-2 mt-3">
              <span className="text-[9px] bg-white/20 px-2 py-1 rounded-full">{'\u2705'} Lab Tested</span>
              <span className="text-[9px] bg-white/20 px-2 py-1 rounded-full">{'\u2705'} No Chemicals</span>
              <span className="text-[9px] bg-white/20 px-2 py-1 rounded-full">{'\u2705'} Fresh Batches</span>
            </div>
          </div>

          {/* Categories */}
          <div className="overflow-x-auto -mx-5 px-5">
            <div className="flex gap-2 min-w-max pb-1">
              {(Object.entries(catLabels) as [ProductCategory | 'all', typeof catLabels['all']][]).map(([k, v]) => (
                <button key={k} onClick={() => setCat(k)}
                  className={'px-3 py-2 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all flex-shrink-0 ' +
                    (cat === k ? 'bg-emerald-100 text-emerald-700 shadow-sm' : 'bg-white text-gray-500 border border-gray-100')}>
                  {v.emoji} {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Featured Products */}
          {cat === 'all' && featured.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{'\u{1F31F}'} Featured</h3>
              <div className="overflow-x-auto -mx-5 px-5">
                <div className="flex gap-3 min-w-max pb-2">
                  {featured.map(p => (
                    <button key={p.id} onClick={() => setSelProduct(p)} className="w-48 bg-white rounded-2xl p-3 shadow-sm text-left active:scale-95 transition-transform flex-shrink-0">
                      <div className="w-full h-24 rounded-xl flex items-center justify-center text-4xl" style={{ backgroundColor: '#ECFDF5' }}>{p.emoji}</div>
                      <div className="mt-2">
                        <p className="text-xs font-bold text-gray-800 line-clamp-1">{p.name}</p>
                        <StarRating rating={p.rating} />
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-extrabold text-emerald-700">{'\u20B9'}{p.discountPrice || p.price}</span>
                          {p.discountPrice && <span className="text-[10px] text-gray-400 line-through">{'\u20B9'}{p.price}</span>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* AyurvedaProduct Grid */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              {cat === 'all' ? 'All Products' : catLabels[cat].label} ({visibleProducts.length})
            </h3>
            <div className="space-y-3">
              {visibleProducts.map(p => (
                <button key={p.id} onClick={() => setSelProduct(p)} className="w-full bg-white rounded-2xl p-3 shadow-sm flex gap-3 text-left active:scale-[0.98] transition-transform">
                  <div className="w-20 h-20 rounded-xl flex items-center justify-center text-3xl flex-shrink-0" style={{ backgroundColor: '#ECFDF5' }}>{p.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-bold text-gray-800 line-clamp-1 flex-1">{p.name}</p>
                      {p.tags.includes('bestseller') && <span className="text-[8px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full ml-1 flex-shrink-0">BEST</span>}
                    </div>
                    <p className="text-[10px] text-gray-500 line-clamp-2 mt-0.5">{p.description}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-emerald-700">{'\u20B9'}{p.discountPrice || p.price}</span>
                        {p.discountPrice && <span className="text-[10px] text-gray-400 line-through">{'\u20B9'}{p.price}</span>}
                        {p.discountPrice && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">{Math.round((1 - p.discountPrice / p.price) * 100)}% OFF</span>}
                      </div>
                      <StarRating rating={p.rating} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>)}

        {/* ═══ DIY TAB ═══ */}
        {view === 'diy' && (<>
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-100">
            <h3 className="text-sm font-extrabold text-amber-800">{'\u{1F52C}'} Make at Home</h3>
            <p className="text-xs text-amber-700 mt-1">Doctor-approved Ayurvedic recipes you can prepare with kitchen ingredients. 100% natural, 100% effective.</p>
          </div>

          <div className="space-y-3">
            {visibleRecipes.map(r => (
              <button key={r.id} onClick={() => setSelRecipe(r)} className="w-full bg-white rounded-2xl p-4 shadow-sm text-left active:scale-[0.98] transition-transform">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{r.emoji}</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-800">{r.title}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{r.description}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-[9px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{'\u23F1'} {r.prepTime}</span>
                      <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">{r.difficulty}</span>
                      <span className="text-[9px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{r.ingredients.length} ingredients</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>)}

        {/* ═══ DOCTOR TAB ═══ */}
        {view === 'doctor' && (<>
          <div className="bg-white rounded-3xl p-5 shadow-sm text-center">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-4xl text-white font-bold shadow-lg">
              {doctor.name.charAt(0)}
            </div>
            <h2 className="text-lg font-extrabold text-gray-900 mt-3">{doctor.name}</h2>
            <p className="text-xs text-emerald-600 font-bold">{doctor.title}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{doctor.qualification} \u2022 {doctor.experience}</p>

            <div className="flex flex-wrap gap-1.5 justify-center mt-3">
              {doctor.specialization.map(s => (
                <span key={s} className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">{s}</span>
              ))}
            </div>
          </div>

          <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
            <h3 className="text-sm font-bold text-emerald-800 mb-2">{'\u{1F49A}'} About</h3>
            <p className="text-xs text-gray-700 leading-relaxed">{doctor.about}</p>
          </div>

          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
            <h3 className="text-sm font-bold text-amber-800 mb-2">{'\u2728'} Philosophy</h3>
            <p className="text-xs text-gray-700 leading-relaxed italic">"{doctor.philosophy}"</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase">Consultation Details</h3>
            {[
              { l: 'Fee', v: doctor.consultationFee, e: '\u{1F4B0}' },
              { l: 'Languages', v: doctor.languages.join(', '), e: '\u{1F5E3}\uFE0F' },
              { l: 'Experience', v: doctor.experience, e: '\u{1F3C6}' },
            ].map(r => (
              <div key={r.l} className="flex items-center gap-3">
                <span className="text-lg">{r.e}</span>
                <div>
                  <p className="text-[10px] text-gray-400">{r.l}</p>
                  <p className="text-xs font-bold text-gray-800">{r.v}</p>
                </div>
              </div>
            ))}
            {doctor.freeForPoor && (
              <div className="bg-rose-50 rounded-xl p-3 border border-rose-100">
                <p className="text-xs font-bold text-rose-700">{'\u2764\uFE0F'} Free Consultation for Those in Need</p>
                <p className="text-[10px] text-rose-600 mt-0.5">Doctor provides free treatment for patients who cannot afford it.</p>
              </div>
            )}
          </div>

          <button onClick={() => nav('/appointments')} className="w-full py-3.5 rounded-2xl text-white font-bold text-sm active:scale-95 transition-transform" style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}>
            Book Consultation {'\u2192'}
          </button>
        </>)}
      </div>

      {/* ═══ PRODUCT DETAIL MODAL ═══ */}
      {selProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={() => setSelProduct(null)}>
          <div className="bg-white w-full max-w-[430px] rounded-t-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3" />

            <div className="w-full h-44 flex items-center justify-center text-7xl" style={{ backgroundColor: '#ECFDF5' }}>{selProduct.emoji}</div>

            <div className="p-5 space-y-4">
              <div>
                <div className="flex items-start justify-between">
                  <h2 className="text-lg font-extrabold text-gray-900 flex-1">{selProduct.name}</h2>
                  <button onClick={() => setSelProduct(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 ml-2">{'\u2715'}</button>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <StarRating rating={selProduct.rating} />
                  <span className="text-[10px] text-gray-400">({selProduct.reviews} reviews)</span>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-2xl font-extrabold text-emerald-700">{'\u20B9'}{selProduct.discountPrice || selProduct.price}</span>
                  {selProduct.discountPrice && <span className="text-sm text-gray-400 line-through">{'\u20B9'}{selProduct.price}</span>}
                  {selProduct.discountPrice && <span className="text-xs font-bold text-white bg-emerald-500 px-2 py-0.5 rounded-full">{Math.round((1 - selProduct.discountPrice / selProduct.price) * 100)}% OFF</span>}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{selProduct.size}</p>
              </div>

              <p className="text-sm text-gray-600 leading-relaxed">{selProduct.description}</p>

              {selProduct.preparationMethod && (
                <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase mb-1">{'\u{1F33F}'} How It's Made</p>
                  <p className="text-xs text-emerald-800">{selProduct.preparationMethod}</p>
                </div>
              )}

              {selProduct.doctorNote && (
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                  <p className="text-[10px] font-bold text-amber-700 uppercase mb-1">{'\u{1F469}\u200D\u2695\uFE0F'} Doctor's Note</p>
                  <p className="text-xs text-amber-800 italic">"{selProduct.doctorNote}"</p>
                </div>
              )}

              <div>
                <p className="text-xs font-bold text-gray-700 mb-2">Ingredients ({selProduct.ingredients.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {selProduct.ingredients.map(ing => (
                    <span key={ing} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-lg font-medium">{ing}</span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-700 mb-2">Benefits</p>
                {selProduct.benefits.map((b, i) => (
                  <div key={i} className="flex items-start gap-2 py-1">
                    <span className="text-emerald-500 text-xs mt-0.5">{'\u2713'}</span>
                    <p className="text-xs text-gray-600">{b}</p>
                  </div>
                ))}
              </div>

              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-gray-700 uppercase mb-1">How to Use</p>
                <p className="text-xs text-gray-600">{selProduct.howToUse}</p>
              </div>

              <div className="flex gap-2 pb-4">
                <button className="flex-1 py-3.5 rounded-2xl text-white font-bold text-sm active:scale-95 transition-transform" style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}>
                  {'\u{1F6D2}'} Add to Cart \u2022 {'\u20B9'}{selProduct.discountPrice || selProduct.price}
                </button>
                <button className="w-14 py-3.5 rounded-2xl bg-gray-100 flex items-center justify-center active:scale-95 transition-transform">
                  {'\u2764\uFE0F'}
                </button>
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
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-3xl">{selRecipe.emoji}</span>
                <div>
                  <h3 className="text-lg font-extrabold text-gray-900">{selRecipe.title}</h3>
                  <div className="flex gap-2 mt-0.5">
                    <span className="text-[9px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{selRecipe.prepTime}</span>
                    <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">{selRecipe.difficulty}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelRecipe(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">{'\u2715'}</button>
            </div>

            <p className="text-xs text-gray-600 mb-4">{selRecipe.description}</p>

            <div className="bg-amber-50 rounded-xl p-3 mb-4">
              <p className="text-xs font-bold text-amber-800 mb-2">{'\u{1F9EA}'} Ingredients</p>
              {selRecipe.ingredients.map((ing, i) => (
                <div key={i} className="flex justify-between py-1 border-b border-amber-100 last:border-0">
                  <span className="text-xs text-gray-700">{ing.name}</span>
                  <span className="text-xs font-bold text-amber-700">{ing.amount}</span>
                </div>
              ))}
            </div>

            <div className="mb-4">
              <p className="text-xs font-bold text-gray-800 mb-2">{'\u{1F4CB}'} Steps</p>
              {selRecipe.steps.map((s, i) => (
                <div key={i} className="flex items-start gap-3 py-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-extrabold flex-shrink-0">{i + 1}</span>
                  <p className="text-xs text-gray-600 leading-relaxed">{s}</p>
                </div>
              ))}
            </div>

            <div className="bg-emerald-50 rounded-xl p-3 mb-4">
              <p className="text-xs font-bold text-emerald-800 mb-1">Benefits</p>
              {selRecipe.benefits.map((b, i) => (
                <p key={i} className="text-xs text-emerald-700">{'\u2713'} {b}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
