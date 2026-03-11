// @ts-nocheck
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAyurvedaStore } from '../stores/ayurvedaStore';

const CATS = ['All', 'Ayurveda', 'Gynecologist', 'Obstetrician', 'Fertility', 'Dermatologist', 'Nutritionist', 'Homeopathy'];
const CITIES = ['All', 'Mumbai', 'Delhi', 'Bangalore', 'Chennai'];

export default function DoctorsPage() {
  const nav = useNavigate();
  const { doctors, getChiefDoctor } = useAyurvedaStore();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [city, setCity] = useState('All');
  const [maxFee, setMaxFee] = useState(1000);
  const [minRating, setMinRating] = useState(0);
  const [freeOnly, setFreeOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'rating' | 'fee_low' | 'fee_high' | 'experience'>('rating');
  const [showFilters, setShowFilters] = useState(false);
  const [sel, setSel] = useState<any>(null);

  const published = doctors.filter(d => d.isPublished);
  const chief = getChiefDoctor();

  // Promoted (non-chief) doctors shown first after chief
  const promoted = published.filter(d => d.isPromoted && !d.isChief);
  const regular = published.filter(d => !d.isPromoted && !d.isChief);

  const applyFilters = (list: any[]) => list.filter(d => {
    const matchQ = !q || d.name.toLowerCase().includes(q.toLowerCase()) ||
      d.specialization.toLowerCase().includes(q.toLowerCase()) ||
      (d.tags || []).some((t: string) => t.toLowerCase().includes(q.toLowerCase()));
    const matchCat = cat === 'All' || d.specialization.toLowerCase().includes(cat.toLowerCase());
    const matchCity = city === 'All' || d.city === city;
    const matchFee = d.fee <= maxFee;
    const matchRating = d.rating >= minRating;
    const matchFree = !freeOnly || d.feeFreeForPoor;
    return matchQ && matchCat && matchCity && matchFee && matchRating && matchFree;
  });

  const sortDoctors = (list: any[]) => [...list].sort((a, b) => {
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'fee_low') return a.fee - b.fee;
    if (sortBy === 'fee_high') return b.fee - a.fee;
    if (sortBy === 'experience') return b.experience - a.experience;
    return 0;
  });

  const filteredPromoted = sortDoctors(applyFilters(promoted));
  const filteredRegular = sortDoctors(applyFilters(regular));
  const totalShown = filteredPromoted.length + filteredRegular.length;

  // Count active filters
  const activeFilterCount = [
    city !== 'All',
    maxFee < 1000,
    minRating > 0,
    freeOnly,
    sortBy !== 'rating',
  ].filter(Boolean).length;

  const clearFilters = () => {
    setQ(''); setCat('All'); setCity('All'); setMaxFee(1000);
    setMinRating(0); setFreeOnly(false); setSortBy('rating');
  };

  return (
    <div className="min-h-screen pb-24 bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-xl border-b border-rose-100 px-5 py-3 flex items-center gap-3" style={{ backgroundColor: 'rgba(255,241,242,0.85)' }}>
        <button onClick={() => nav('/dashboard')} className="w-9 h-9 rounded-2xl bg-white/80 flex items-center justify-center text-sm active:scale-95 transition-all shadow-sm">{'\u2190'}</button>
        <h1 className="text-base font-extrabold text-gray-900 flex-1">Doctors {'\uD83D\uDC69\u200D\u2695\uFE0F'}</h1>
        {activeFilterCount > 0 && (
          <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">{activeFilterCount}</span>
        )}
      </div>

      <div className="px-5 pt-4 space-y-4">
        {/* Search bar */}
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="\uD83D\uDD0D Search doctors, specialization, tags..."
          className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-100 text-sm outline-none bg-white focus:border-rose-400 focus:bg-white transition-colors shadow-lg" />

        {/* Specialty chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5">
          {CATS.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={'px-3 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 ' + (cat === c ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-200' : 'bg-white border border-gray-100 text-gray-500')}>
              {c}
            </button>
          ))}
        </div>

        {/* Filter toggle button */}
        <button onClick={() => setShowFilters(!showFilters)}
          className={'w-full py-2.5 rounded-2xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ' +
            (showFilters ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-white text-gray-600 border border-gray-100 shadow-sm')}>
          {'\u2699\uFE0F'} Filters {activeFilterCount > 0 ? `(${activeFilterCount} active)` : ''}
          <span className="text-[10px]">{showFilters ? '\u25B2' : '\u25BC'}</span>
        </button>

        {/* Filter panel (collapsible) */}
        {showFilters && (
          <div className="bg-white rounded-3xl p-4 shadow-lg border border-gray-100 space-y-4 animate-in slide-in-from-top">
            {/* City filter */}
            <div>
              <label className="text-[9px] font-bold text-gray-500 uppercase mb-1.5 block">City</label>
              <div className="flex gap-1.5 flex-wrap">
                {CITIES.map(c => (
                  <button key={c} onClick={() => setCity(c)}
                    className={'px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ' +
                      (city === c ? 'bg-rose-500 text-white shadow-sm' : 'bg-gray-50 text-gray-500 border border-gray-100')}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Max Fee slider */}
            <div>
              <label className="text-[9px] font-bold text-gray-500 uppercase mb-1 block">Max Fee: {'\u20B9'}{maxFee}</label>
              <input type="range" min={100} max={1000} step={50} value={maxFee} onChange={e => setMaxFee(+e.target.value)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-rose-500" />
              <div className="flex justify-between text-[8px] text-gray-400 mt-0.5">
                <span>{'\u20B9'}100</span><span>{'\u20B9'}1000</span>
              </div>
            </div>

            {/* Min Rating slider */}
            <div>
              <label className="text-[9px] font-bold text-gray-500 uppercase mb-1 block">{'\u2605'} Min Rating: {minRating}+</label>
              <input type="range" min={0} max={5} step={0.5} value={minRating} onChange={e => setMinRating(+e.target.value)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500" />
              <div className="flex justify-between text-[8px] text-gray-400 mt-0.5">
                <span>Any</span><span>5.0</span>
              </div>
            </div>

            {/* Free for needy checkbox */}
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={freeOnly} onChange={e => setFreeOnly(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-rose-500 focus:ring-rose-400 accent-rose-500" />
              <span className="text-xs text-gray-700 font-medium">Show only free consultations</span>
            </label>

            {/* Sort by pills */}
            <div>
              <label className="text-[9px] font-bold text-gray-500 uppercase mb-1.5 block">Sort by</label>
              <div className="flex gap-1.5 flex-wrap">
                {([
                  { k: 'rating', l: '\u2605 Rating' },
                  { k: 'fee_low', l: '\u20B9 Fee (Low)' },
                  { k: 'fee_high', l: '\u20B9 Fee (High)' },
                  { k: 'experience', l: '\uD83D\uDCBC Experience' },
                ] as { k: typeof sortBy; l: string }[]).map(s => (
                  <button key={s.k} onClick={() => setSortBy(s.k)}
                    className={'px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ' +
                      (sortBy === s.k ? 'bg-purple-500 text-white shadow-sm' : 'bg-gray-50 text-gray-500 border border-gray-100')}>
                    {s.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear / Apply buttons */}
            <div className="flex gap-2 pt-1">
              <button onClick={clearFilters} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 active:scale-95">Clear All</button>
              <button onClick={() => setShowFilters(false)} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold active:scale-95 shadow-md shadow-rose-200">Apply</button>
            </div>
          </div>
        )}

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {city !== 'All' && (
              <button onClick={() => setCity('All')} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold active:scale-95">
                City: {city} {'\u2715'}
              </button>
            )}
            {maxFee < 1000 && (
              <button onClick={() => setMaxFee(1000)} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold active:scale-95">
                {'\u20B9'}{'\u2264'}{maxFee} {'\u2715'}
              </button>
            )}
            {minRating > 0 && (
              <button onClick={() => setMinRating(0)} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold active:scale-95">
                {'\u2605'}{minRating}+ {'\u2715'}
              </button>
            )}
            {freeOnly && (
              <button onClick={() => setFreeOnly(false)} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-pink-100 text-pink-700 text-[10px] font-bold active:scale-95">
                Free only {'\u2715'}
              </button>
            )}
            {sortBy !== 'rating' && (
              <button onClick={() => setSortBy('rating')} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold active:scale-95">
                Sort: {sortBy === 'fee_low' ? 'Fee \u2191' : sortBy === 'fee_high' ? 'Fee \u2193' : 'Exp'} {'\u2715'}
              </button>
            )}
          </div>
        )}

        {/* Chief Doctor Hero Card */}
        {chief && (
          <button onClick={() => setSel(chief)} className="w-full text-left active:scale-[0.98] transition-transform">
            <div className="rounded-3xl p-5 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #065F46, #059669, #10B981)' }}>
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
              <div className="absolute -right-4 -bottom-10 w-24 h-24 bg-white/5 rounded-full" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl text-white font-extrabold border-2 border-white/30 shadow-lg backdrop-blur-sm overflow-hidden">
                  {(chief.photoUrl || chief.avatarUrl) ? <img src={chief.photoUrl || chief.avatarUrl} alt={chief.name} className="w-full h-full object-cover" /> : chief.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[9px] bg-white/20 px-2 py-0.5 rounded-full font-bold backdrop-blur-sm">{'\uD83D\uDC51'} Chief Doctor</p>
                    {chief.feeFreeForPoor && <p className="text-[9px] bg-white/20 px-2 py-0.5 rounded-full font-bold">{'\u2764\uFE0F'} Free for needy</p>}
                  </div>
                  <h2 className="text-lg font-extrabold mt-1">{chief.name}</h2>
                  <p className="text-xs text-white/80">{chief.specialization} {'\u2022'} {chief.qualification}</p>
                  <p className="text-xs text-white/70 mt-0.5">{chief.experience} years {'\u2022'} {'\u2605'} {chief.rating} {chief.city ? `\u2022 ${chief.city}` : ''}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3 relative z-10">
                {chief.tags.map(t => (
                  <span key={t} className="text-[9px] bg-white/15 px-2 py-0.5 rounded-full text-white/90 font-medium backdrop-blur-sm">{t}</span>
                ))}
              </div>
              {chief.availability && (
                <p className="text-[10px] text-white/80 mt-2 relative z-10">{'\uD83D\uDD50'} {chief.availability}</p>
              )}
              <p className="text-[10px] text-white/70 mt-1 relative z-10 leading-relaxed">{chief.about}</p>
            </div>
          </button>
        )}

        {/* Featured Doctors Section */}
        {filteredPromoted.length > 0 && (
          <>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-sm">{'\u2B50'}</span>
              <h3 className="text-sm font-extrabold text-gray-800">Featured Doctors</h3>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{filteredPromoted.length}</span>
            </div>
            {filteredPromoted.map(d => (
              <button key={d.id} onClick={() => setSel(d)} className="w-full bg-white rounded-3xl p-4 shadow-lg text-left active:scale-[0.98] transition-transform border-2 border-amber-200 relative">
                <div className="absolute top-3 right-3">
                  <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">{'\u2B50'} Featured</span>
                </div>
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm overflow-hidden">
                    {(d.photoUrl || d.avatarUrl) ? <img src={d.photoUrl || d.avatarUrl} alt={d.name} className="w-full h-full object-cover" /> : d.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-sm">{d.name}</p>
                    <p className="text-[10px] text-gray-500">{d.specialization} {d.city ? `\u2022 ${d.city}` : ''} {'\u2022'} {d.experience} yrs</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-amber-500 font-bold">{'\u2605'} {d.rating}</span>
                      <span className="text-[10px] text-gray-400">({d.reviews} reviews)</span>
                    </div>
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {d.tags.map(t => <span key={t} className="text-[9px] px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full font-medium">{'\uD83C\uDFF7\uFE0F'} {t}</span>)}
                    </div>
                    {d.availability && <p className="text-[10px] text-gray-400 mt-1">{'\uD83D\uDD50'} {d.availability}</p>}
                    {d.languages && <p className="text-[10px] text-gray-400">{'\uD83D\uDDE3\uFE0F'} {d.languages.join(', ')}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-extrabold text-emerald-600">{'\u20B9'}{d.fee}</p>
                    <p className="text-[9px] text-gray-400">/visit</p>
                    {d.feeFreeForPoor && <p className="text-[8px] text-rose-500 font-bold mt-0.5">{'\u2764\uFE0F'} Free for needy</p>}
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <span className="text-[10px] font-bold text-rose-500">Book Appointment {'\u2192'}</span>
                </div>
              </button>
            ))}
          </>
        )}

        {/* Results count */}
        <p className="text-xs text-gray-400 font-bold">Showing {totalShown} doctor{totalShown !== 1 ? 's' : ''}{cat !== 'All' ? ` in ${cat}` : ''}{city !== 'All' ? ` in ${city}` : ''}</p>

        {/* Regular Doctor cards */}
        {filteredRegular.map(d => (
          <button key={d.id} onClick={() => setSel(d)} className="w-full bg-white rounded-3xl p-4 shadow-lg text-left active:scale-[0.98] transition-transform">
            <div className="flex gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm overflow-hidden">
                {(d.photoUrl || d.avatarUrl) ? <img src={d.photoUrl || d.avatarUrl} alt={d.name} className="w-full h-full object-cover" /> : d.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-sm">{d.name}</p>
                <p className="text-[10px] text-gray-500">{d.specialization} {d.city ? `\u2022 ${d.city}` : ''} {'\u2022'} {d.experience} yrs</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-amber-500 font-bold">{'\u2605'} {d.rating}</span>
                  <span className="text-[10px] text-gray-400">({d.reviews} reviews)</span>
                </div>
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {d.tags.map(t => <span key={t} className="text-[9px] px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full font-medium">{'\uD83C\uDFF7\uFE0F'} {t}</span>)}
                </div>
                {d.availability && <p className="text-[10px] text-gray-400 mt-1">{'\uD83D\uDD50'} {d.availability}</p>}
                {d.languages && <p className="text-[10px] text-gray-400">{'\uD83D\uDDE3\uFE0F'} {d.languages.join(', ')}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-extrabold text-emerald-600">{'\u20B9'}{d.fee}</p>
                <p className="text-[9px] text-gray-400">/visit</p>
                {d.feeFreeForPoor && <p className="text-[8px] text-rose-500 font-bold mt-0.5">{'\u2764\uFE0F'} Free for needy</p>}
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <span className="text-[10px] font-bold text-rose-500">Book Appointment {'\u2192'}</span>
            </div>
          </button>
        ))}

        {/* Empty state */}
        {totalShown === 0 && (
          <div className="text-center py-12 bg-white rounded-3xl shadow-lg">
            <span className="text-4xl">{'\uD83D\uDD0D'}</span>
            <p className="text-sm font-bold text-gray-600 mt-3">No doctors match your filters</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
            <button onClick={clearFilters} className="mt-4 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold active:scale-95 shadow-md shadow-rose-200">
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Doctor Detail Bottom Sheet */}
      {sel && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end" onClick={() => setSel(null)}>
          <div className="bg-white w-full max-w-[430px] mx-auto rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <div className="text-center mb-4">
              <div className={'w-20 h-20 mx-auto rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl mb-3 shadow-lg overflow-hidden ' + (sel.isChief ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : sel.isPromoted ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-rose-400 to-pink-500')}>
                {(sel.photoUrl || sel.avatarUrl) ? <img src={sel.photoUrl || sel.avatarUrl} alt={sel.name} className="w-full h-full object-cover" /> : sel.name.charAt(0)}
              </div>
              {sel.isChief && <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">{'\uD83D\uDC51'} Chief Doctor {'\u2022'} VedaClue</span>}
              {sel.isPromoted && !sel.isChief && <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">{'\u2B50'} Featured Doctor</span>}
              <h3 className="font-extrabold text-xl mt-2">{sel.name}</h3>
              <p className="text-sm text-gray-500">{sel.specialization}</p>
              <p className="text-xs text-gray-400">{sel.qualification}</p>
            </div>
            <div className="flex justify-around mb-4 bg-gray-50 rounded-2xl p-3">
              <div className="text-center"><p className="text-xl font-extrabold text-amber-500">{sel.rating}</p><p className="text-[9px] text-gray-400">Rating</p></div>
              <div className="text-center"><p className="text-xl font-extrabold text-blue-600">{sel.experience}</p><p className="text-[9px] text-gray-400">Years</p></div>
              <div className="text-center"><p className="text-xl font-extrabold text-purple-600">{sel.reviews}</p><p className="text-[9px] text-gray-400">Reviews</p></div>
              <div className="text-center"><p className="text-xl font-extrabold text-emerald-600">{'\u20B9'}{sel.fee}</p><p className="text-[9px] text-gray-400">Fee</p></div>
            </div>

            {/* City & Availability */}
            {(sel.city || sel.availability) && (
              <div className="bg-blue-50 rounded-xl p-3 mb-3 border border-blue-100 space-y-1">
                {sel.city && <p className="text-xs text-blue-700 font-medium">{'\uD83D\uDCCD'} {sel.city}</p>}
                {sel.availability && <p className="text-xs text-blue-600">{'\uD83D\uDD50'} {sel.availability}</p>}
              </div>
            )}

            {sel.about && <p className="text-xs text-gray-600 leading-relaxed mb-3">{sel.about}</p>}
            {sel.feeFreeForPoor && (
              <div className="bg-rose-50 rounded-xl p-3 mb-3 border border-rose-100">
                <p className="text-xs font-bold text-rose-700">{'\u2764\uFE0F'} Free for Those in Need</p>
                <p className="text-[10px] text-rose-600">Doctor provides free consultations for patients who cannot afford treatment.</p>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {sel.tags?.map((t: string) => <span key={t} className="text-[9px] px-2 py-1 bg-purple-50 text-purple-600 rounded-full font-bold">{t}</span>)}
            </div>
            {sel.languages && <p className="text-[10px] text-gray-500 mb-4">{'\uD83D\uDDE3\uFE0F'} {sel.languages.join(', ')}</p>}
            <button onClick={() => nav('/appointments')} className="w-full py-3.5 rounded-2xl text-white font-bold active:scale-95 transition-transform shadow-md shadow-rose-200 bg-gradient-to-r from-rose-500 to-pink-500">
              Book Appointment {'\u2192'}
            </button>
            <button onClick={() => setSel(null)} className="w-full py-3 mt-2 border border-gray-200 rounded-2xl text-gray-600 text-sm font-bold active:scale-95">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
