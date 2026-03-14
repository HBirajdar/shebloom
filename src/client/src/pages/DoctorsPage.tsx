import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../services/api';

const CATS = ['All', 'Ayurveda', 'Gynecology', 'Fertility', 'Nutrition', 'Dermatologist', 'Homeopathy'];

export default function DoctorsPage() {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [city, setCity] = useState('All');
  const [maxFee, setMaxFee] = useState(1000);
  const [minRating, setMinRating] = useState(0);
  const [freeOnly, setFreeOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'rating' | 'fee_low' | 'fee_high' | 'experience'>('rating');
  const [showFilters, setShowFilters] = useState(false);
  const [sel, setSel] = useState<any>(null);
  const [doctorsLoading, setDoctorsLoading] = useState(true);

  const CITIES = ['All', 'Mumbai', 'Delhi', 'Bangalore', 'Chennai'];

  // Fetch doctors from API
  const [apiDoctors, setApiDoctors] = useState<any[] | null>(null);
  useEffect(() => {
    api.get('/doctors')
      .then(r => {
        const items = r.data.data || r.data.doctors || [];
        if (items.length > 0) {
          const mapped = items.map((d: any) => ({
            ...d,
            name: d.fullName || d.name || '',
            experience: d.experienceYears || d.experience || 0,
            fee: d.consultationFee || d.fee || 0,
            qualification: (d.qualifications || []).join(', ') || d.qualification || '',
            reviews: d.totalReviews || d.reviews || 0,
            about: d.bio || d.about || '',
            isPublished: d.isPublished !== false,
            isChief: d.isChief || false,
            isPromoted: d.isPromoted || false,
            feeFreeForPoor: d.feeFreeForPoor || false,
            tags: d.tags || [],
            languages: d.languages || [],
            avatarUrl: d.avatarUrl || d.photoUrl || null,
            photoUrl: d.photoUrl || d.avatarUrl || null,
          }));
          setApiDoctors(mapped);
        }
      })
      .catch(() => toast.error('Failed to load doctors'))
      .finally(() => setDoctorsLoading(false));
  }, []);

  const doctors = apiDoctors || [];
  const published = doctors.filter(d => d.isPublished);

  const applyFilters = (list: any[]) => list.filter(d => {
    const matchQ = !q || (d.name || '').toLowerCase().includes(q.toLowerCase()) ||
      (d.specialization || '').toLowerCase().includes(q.toLowerCase()) ||
      (d.tags || []).some((t: string) => t.toLowerCase().includes(q.toLowerCase()));
    const matchCat = cat === 'All' || (d.specialization || '').toLowerCase().includes(cat.toLowerCase());
    const matchCity = city === 'All' || d.city === city;
    const matchFee = (d.fee || 0) <= maxFee;
    const matchRating = (d.rating || 0) >= minRating;
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

  const filtered = sortDoctors(applyFilters(published));

  // Count active filters (advanced only — not category chips)
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
      <Helmet>
        <title>Find Doctors | VedaClue</title>
        <meta name="description" content="Book appointments with verified Ayurvedic and women's health specialists" />
      </Helmet>

      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-xl border-b border-rose-100 px-5 py-3 flex items-center gap-3" style={{ backgroundColor: 'rgba(255,241,242,0.85)' }}>
        <button onClick={() => nav('/dashboard')} className="w-9 h-9 rounded-2xl bg-white/80 flex items-center justify-center text-sm active:scale-95 transition-all shadow-sm">{'\u2190'}</button>
        <h1 className="text-base font-extrabold text-gray-900 flex-1">Doctors</h1>
      </div>

      <div className="px-5 pt-4 space-y-3">
        {/* Search bar */}
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{'\uD83D\uDD0D'}</span>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search doctors, specialization..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-gray-200 text-sm outline-none bg-white focus:border-rose-400 transition-colors shadow-sm" />
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-hide">
          {CATS.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={'px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ' + (cat === c ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-500')}>
              {c}
            </button>
          ))}
        </div>

        {/* Advanced filters toggle */}
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters(!showFilters)}
            className={'px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all active:scale-95 flex items-center gap-1.5 ' +
              (activeFilterCount > 0 ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-white text-gray-500 border border-gray-200')}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </button>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="text-[11px] text-rose-500 font-semibold active:scale-95">Clear all</button>
          )}
          {!doctorsLoading && (
            <span className="ml-auto text-[11px] text-gray-400">{filtered.length} doctor{filtered.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {/* Advanced filter panel (collapsed by default) */}
        {showFilters && (
          <div className="bg-white rounded-2xl p-4 shadow-md border border-gray-100 space-y-3">
            {/* City filter */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">City</label>
              <div className="flex gap-1.5 flex-wrap">
                {CITIES.map(c => (
                  <button key={c} onClick={() => setCity(c)}
                    className={'px-3 py-1 rounded-full text-[10px] font-semibold transition-all ' +
                      (city === c ? 'bg-rose-500 text-white' : 'bg-gray-50 text-gray-500 border border-gray-100')}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Max Fee slider */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Max Fee: {'\u20B9'}{maxFee}</label>
              <input type="range" min={100} max={1000} step={50} value={maxFee} onChange={e => setMaxFee(+e.target.value)}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-rose-500" />
            </div>

            {/* Min Rating slider */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Min Rating: {minRating}+</label>
              <input type="range" min={0} max={5} step={0.5} value={minRating} onChange={e => setMinRating(+e.target.value)}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500" />
            </div>

            {/* Free for needy */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={freeOnly} onChange={e => setFreeOnly(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-300 accent-rose-500" />
              <span className="text-xs text-gray-600">Free consultations only</span>
            </label>

            {/* Sort */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">Sort by</label>
              <div className="flex gap-1.5 flex-wrap">
                {([
                  { k: 'rating', l: 'Rating' },
                  { k: 'fee_low', l: 'Fee (Low)' },
                  { k: 'fee_high', l: 'Fee (High)' },
                  { k: 'experience', l: 'Experience' },
                ] as { k: typeof sortBy; l: string }[]).map(s => (
                  <button key={s.k} onClick={() => setSortBy(s.k)}
                    className={'px-3 py-1 rounded-full text-[10px] font-semibold transition-all ' +
                      (sortBy === s.k ? 'bg-purple-500 text-white' : 'bg-gray-50 text-gray-500 border border-gray-100')}>
                    {s.l}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => setShowFilters(false)} className="w-full py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold active:scale-95 shadow-sm">
              Apply
            </button>
          </div>
        )}

        {/* Loading state */}
        {doctorsLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
            <p className="text-sm text-gray-400 mt-3">Loading doctors...</p>
          </div>
        )}

        {/* Doctor cards — compact list */}
        {!doctorsLoading && filtered.map(d => (
          <button key={d.id} onClick={() => setSel(d)} className="w-full bg-white rounded-2xl px-3 py-2.5 shadow-sm border border-gray-100 text-left active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 overflow-hidden">
                {(d.photoUrl || d.avatarUrl) ? <img src={d.photoUrl || d.avatarUrl} alt={d.name} className="w-full h-full object-cover" /> : d.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-bold text-gray-800 text-sm truncate">{d.name}</p>
                  {d.isChief && <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full flex-shrink-0">{'\uD83D\uDC51'} Chief</span>}
                  {d.isPromoted && !d.isChief && <span className="text-[9px] font-bold bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full flex-shrink-0">{'\u2B50'} Featured</span>}
                  {!d.isChief && !d.isPromoted && d.isPublished && <span className="text-emerald-500 text-[10px] flex-shrink-0" title="Verified">{'\u2713'}</span>}
                </div>
                <p className="text-[11px] text-gray-500 truncate">{d.specialization}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-amber-500 font-semibold">{'\u2B50'} {d.rating}</span>
                  <span className="text-[10px] text-gray-400">({d.reviews})</span>
                </div>
              </div>

              {/* Fee + Book */}
              <div className="flex flex-col items-end flex-shrink-0 gap-1">
                <p className="text-sm font-extrabold text-emerald-600">{'\u20B9'}{d.fee}</p>
                <span className="text-[10px] font-bold text-white bg-gradient-to-r from-rose-500 to-pink-500 px-3 py-1 rounded-full">Book Now</span>
              </div>
            </div>
          </button>
        ))}

        {/* Empty state */}
        {!doctorsLoading && filtered.length === 0 && (
          <div className="text-center py-16">
            <span className="text-5xl block mb-4">{'\uD83C\uDF38'}</span>
            <p className="text-sm font-bold text-gray-700 mb-1">Doctors coming soon</p>
            <p className="text-xs text-gray-400 mb-4">We'll notify you when specialists are available</p>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="px-5 py-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold active:scale-95 shadow-sm">
                Clear Filters
              </button>
            )}
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
            {sel.languages && sel.languages.length > 0 && <p className="text-[10px] text-gray-500 mb-4">{'\uD83D\uDDE3\uFE0F'} {sel.languages.join(', ')}</p>}
            <button onClick={() => nav(`/appointments?doctorId=${sel.id}`)} className="w-full py-3.5 rounded-2xl text-white font-bold active:scale-95 transition-transform shadow-md shadow-rose-200 bg-gradient-to-r from-rose-500 to-pink-500">
              Book Appointment {'\u2192'}
            </button>
            <button onClick={() => setSel(null)} className="w-full py-3 mt-2 border border-gray-200 rounded-2xl text-gray-600 text-sm font-bold active:scale-95">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
