import { useState, useEffect, useRef, useCallback } from 'react'

export interface Doctor {
  id: string
  fullName: string
  specialization: string
  rating: number
  totalReviews: number
  experienceYears: number
  avatarUrl?: string
  photoUrl?: string
  hospitalName?: string
  consultationFee?: number
  isVerified?: boolean
  isChief?: boolean
}

export interface DoctorCarouselProps {
  doctors: Doctor[]
  onBookNow: (doctor: Doctor) => void
  title?: string
  loading?: boolean
}

/* ── Skeleton card shown while loading ── */
const SkeletonDoctorCard = () => (
  <div className="flex-shrink-0 w-[260px] sm:w-[280px] bg-white rounded-3xl shadow-lg overflow-hidden animate-pulse">
    <div className="p-4">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 mx-auto mb-3" />
      <div className="h-4 bg-gray-100 rounded-lg w-3/4 mx-auto mb-2" />
      <div className="h-3 bg-gray-100 rounded-lg w-1/2 mx-auto mb-3" />
      <div className="space-y-2">
        <div className="h-3 bg-gray-100 rounded-lg w-full" />
        <div className="h-3 bg-gray-100 rounded-lg w-2/3" />
        <div className="h-3 bg-gray-100 rounded-lg w-3/4" />
      </div>
      <div className="h-10 bg-gray-100 rounded-2xl w-full mt-4" />
    </div>
  </div>
)

/* ── Individual doctor card ── */
const DoctorCard = ({ doctor, onBookNow }: { doctor: Doctor; onBookNow: (d: Doctor) => void }) => {
  const photo = doctor.photoUrl || doctor.avatarUrl
  const initials = doctor.fullName
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="flex-shrink-0 w-[260px] sm:w-[280px] bg-white rounded-3xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-shadow duration-300">
      <div className="p-4">
        {/* Photo / Avatar */}
        <div className="w-16 h-16 rounded-2xl mx-auto mb-3 overflow-hidden shadow-md flex-shrink-0">
          {photo ? (
            <img
              src={photo}
              alt={doctor.fullName}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white font-extrabold text-lg">
              {initials}
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="flex items-center justify-center gap-1.5 mb-2 min-h-[20px]">
          {doctor.isVerified && (
            <span className="text-[9px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-200">
              {'\u2705'} Verified
            </span>
          )}
          {doctor.isChief && (
            <span className="text-[9px] font-bold bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-200">
              {'\uD83D\uDC51'} Chief
            </span>
          )}
        </div>

        {/* Name */}
        <h3 className="font-bold text-gray-900 text-sm text-center truncate">
          {doctor.fullName}
        </h3>

        {/* Specialization */}
        <p className="text-rose-600 text-xs text-center mt-0.5 truncate">
          {doctor.specialization}
        </p>

        {/* Rating */}
        <div className="flex items-center justify-center gap-1.5 mt-2">
          <span className="text-amber-400 text-xs">{'\u2B50'}</span>
          <span className="text-xs font-bold text-gray-800">{doctor.rating.toFixed(1)}</span>
          <span className="text-[10px] text-gray-400">({doctor.totalReviews} reviews)</span>
        </div>

        {/* Details */}
        <div className="mt-2.5 space-y-1">
          {doctor.hospitalName && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px]">{'\uD83C\uDFE5'}</span>
              <span className="text-[10px] text-gray-500 truncate">{doctor.hospitalName}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px]">{'\uD83D\uDCBC'}</span>
            <span className="text-[10px] text-gray-500">{doctor.experienceYears} yrs experience</span>
          </div>
          {doctor.consultationFee !== undefined && doctor.consultationFee > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px]">{'\uD83D\uDCB0'}</span>
              <span className="text-[10px] text-gray-500">{'\u20B9'}{doctor.consultationFee} consultation</span>
            </div>
          )}
        </div>

        {/* Book Now button */}
        <button
          onClick={(e) => { e.stopPropagation(); onBookNow(doctor); }}
          className="w-full mt-4 py-2.5 rounded-2xl text-white text-xs font-bold active:scale-95 transition-transform shadow-md shadow-rose-200"
          style={{ background: 'linear-gradient(135deg, #E11D48, #F43F5E)' }}
        >
          Book Now {'\u2192'}
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   MAIN CAROUSEL COMPONENT
   ══════════════════════════════════════════════════════ */
export default function DoctorCarousel({ doctors, onBookNow, title, loading }: DoctorCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [paused, setPaused] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  const total = doctors.length

  const goNext = useCallback(() => {
    if (total <= 1) return
    setCurrentIndex(prev => (prev + 1) % total)
  }, [total])

  const goPrev = useCallback(() => {
    if (total <= 1) return
    setCurrentIndex(prev => (prev - 1 + total) % total)
  }, [total])

  const goTo = useCallback((idx: number) => {
    setCurrentIndex(idx)
  }, [])

  /* Auto-slide every 4 seconds */
  useEffect(() => {
    if (total <= 1 || paused || hovered) return
    const interval = setInterval(goNext, 4000)
    return () => clearInterval(interval)
  }, [currentIndex, paused, hovered, total, goNext])

  /* Touch / swipe handlers */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchEndX.current = e.touches[0].clientX
    setPaused(true)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback(() => {
    const diff = touchStartX.current - touchEndX.current
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext()
      else goPrev()
    }
    setTimeout(() => setPaused(false), 2000)
  }, [goNext, goPrev])

  /* Loading state */
  if (loading) {
    return (
      <div>
        {title && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">{'\uD83D\uDC69\u200D\u2695\uFE0F'}</span>
            <h3 className="text-sm font-extrabold text-gray-800">{title}</h3>
          </div>
        )}
        <div className="flex gap-3 overflow-hidden">
          <SkeletonDoctorCard />
          <SkeletonDoctorCard />
          <SkeletonDoctorCard />
        </div>
      </div>
    )
  }

  /* Empty state */
  if (!doctors || doctors.length === 0) {
    return (
      <div>
        {title && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">{'\uD83D\uDC69\u200D\u2695\uFE0F'}</span>
            <h3 className="text-sm font-extrabold text-gray-800">{title}</h3>
          </div>
        )}
        <div className="bg-white rounded-3xl p-8 shadow-lg text-center">
          <span className="text-4xl block mb-3">{'\uD83D\uDE4D\u200D\u2640\uFE0F'}</span>
          <p className="text-sm font-bold text-gray-600">No doctors available</p>
          <p className="text-xs text-gray-400 mt-1">Check back soon for new doctor listings.</p>
        </div>
      </div>
    )
  }

  /* Single doctor — no carousel needed */
  if (total === 1) {
    return (
      <div>
        {title && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">{'\uD83D\uDC69\u200D\u2695\uFE0F'}</span>
            <h3 className="text-sm font-extrabold text-gray-800">{title}</h3>
          </div>
        )}
        <div className="flex justify-center">
          <DoctorCard doctor={doctors[0]} onBookNow={onBookNow} />
        </div>
      </div>
    )
  }

  /* Multi-doctor carousel */
  // Card width: 260px on mobile, 280px on sm+. Gap: 12px.
  // We use translateX to slide based on currentIndex.
  // On mobile show 1 card centered; on desktop show up to 3 with overflow hints.

  return (
    <div>
      {title && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">{'\uD83D\uDC69\u200D\u2695\uFE0F'}</span>
            <h3 className="text-sm font-extrabold text-gray-800">{title}</h3>
            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
              {total}
            </span>
          </div>
          {/* Desktop arrows in header */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={goPrev}
              className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 active:scale-90 transition-all shadow-sm"
              aria-label="Previous doctor"
            >
              {'\u2190'}
            </button>
            <button
              onClick={goNext}
              className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 active:scale-90 transition-all shadow-sm"
              aria-label="Next doctor"
            >
              {'\u2192'}
            </button>
          </div>
        </div>
      )}

      {/* Carousel track */}
      <div
        ref={containerRef}
        className="relative overflow-hidden"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex gap-3 transition-transform duration-500 ease-in-out"
          style={{
            transform: `translateX(calc(-${currentIndex} * (260px + 12px)))`,
          }}
        >
          {doctors.map(doctor => (
            <DoctorCard key={doctor.id} doctor={doctor} onBookNow={onBookNow} />
          ))}
        </div>

        {/* Responsive transform override for sm+ screens */}
        <style>{`
          @media (min-width: 640px) {
            [data-doctor-track] {
              transform: translateX(calc(-${currentIndex} * (280px + 12px))) !important;
            }
          }
        `}</style>
      </div>

      {/* Dot indicators */}
      {total > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {doctors.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              className={
                'rounded-full transition-all duration-300 ' +
                (idx === currentIndex
                  ? 'w-6 h-2 bg-gradient-to-r from-rose-500 to-pink-500'
                  : 'w-2 h-2 bg-gray-300 hover:bg-gray-400')
              }
              aria-label={`Go to doctor ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
