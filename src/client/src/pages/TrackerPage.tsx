// @ts-nocheck
import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCycleStore } from '../stores/cycleStore'
import { cycleAPI } from '../services/api'
import toast from 'react-hot-toast'
import BottomNav from '../components/BottomNav'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function addDays(date: Date, n: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatMonthDay(date: Date) {
  return `${MONTHS[date.getMonth()].slice(0, 3)} ${date.getDate()}`
}

export default function TrackerPage() {
  const navigate = useNavigate()
  const cycleStore = useCycleStore()
  const goal = useCycleStore(s => s.goal)
  const showFertility = goal === 'fertility'

  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [cycles, setCycles] = useState([])
  const [prediction, setPrediction] = useState(null)
  const [showLogSheet, setShowLogSheet] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('calendar')

  // Log form state
  const [logStartDate, setLogStartDate] = useState(new Date())
  const [logEndDate, setLogEndDate] = useState(null)
  const [logFlow, setLogFlow] = useState('')
  const [logPain, setLogPain] = useState(0)
  const [logMoods, setLogMoods] = useState([])
  const [logSymptoms, setLogSymptoms] = useState([])
  const [logNotes, setLogNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedCycle, setExpandedCycle] = useState(null)
  const [customStartInput, setCustomStartInput] = useState('')
  const [customEndInput, setCustomEndInput] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const dateStripRef = useRef<HTMLDivElement>(null)
  const [showFullCalendar, setShowFullCalendar] = useState(false)

  // Advanced fertility tracking state
  const [bbtHistory, setBbtHistory] = useState([])
  const [cmHistory, setCmHistory] = useState([])
  const [fertilityDaily, setFertilityDaily] = useState([])
  const [showFertilitySheet, setShowFertilitySheet] = useState(false)
  const [fertLogDate, setFertLogDate] = useState(new Date().toISOString().slice(0, 10))
  const [fertBBT, setFertBBT] = useState('')
  const [fertCM, setFertCM] = useState('')
  const [fertLH, setFertLH] = useState('')
  const [fertIntercourse, setFertIntercourse] = useState(false)
  const [fertNotes, setFertNotes] = useState('')
  const [fertSaving, setFertSaving] = useState(false)

  // Ayurvedic insights state
  const [ayurvedaData, setAyurvedaData] = useState(null)
  const [ayurvedaLoading, setAyurvedaLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [predRes, listRes] = await Promise.all([
          cycleAPI.predict(),
          cycleAPI.list(),
        ])
        setPrediction(predRes?.data?.data || null)
        setCycles(listRes?.data?.data || [])
      } catch (e) {
        // silent fail
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  // Fetch fertility data when fertility tab is active
  useEffect(() => {
    if (tab !== 'fertility') return
    Promise.all([
      cycleAPI.getBBT(90).catch(() => ({ data: { data: [] } })),
      cycleAPI.getCervicalMucus(90).catch(() => ({ data: { data: [] } })),
      cycleAPI.getFertilityDaily(90).catch(() => ({ data: { data: [] } })),
    ]).then(([bbt, cm, daily]) => {
      setBbtHistory(bbt?.data?.data || [])
      setCmHistory(cm?.data?.data || [])
      setFertilityDaily(daily?.data?.data || [])
    })
  }, [tab])

  // Fetch Ayurvedic insights when tab is active
  useEffect(() => {
    if (tab !== 'ayurveda') return
    setAyurvedaLoading(true)
    cycleAPI.getAyurvedicInsights()
      .then(r => setAyurvedaData(r?.data?.data || null))
      .catch(() => {})
      .finally(() => setAyurvedaLoading(false))
  }, [tab])

  const saveFertilityLog = async () => {
    if (!fertBBT && !fertCM && !fertLH && !fertIntercourse) {
      toast.error('Please log at least one data point'); return
    }
    setFertSaving(true)
    try {
      await cycleAPI.logFertilityDaily({
        logDate: fertLogDate,
        bbt: fertBBT ? parseFloat(fertBBT) : undefined,
        cervicalMucus: fertCM || undefined,
        lhTestResult: fertLH || undefined,
        intercourse: fertIntercourse,
        notes: fertNotes || undefined,
      })
      toast.success('Fertility data logged!')
      setShowFertilitySheet(false)
      setFertBBT(''); setFertCM(''); setFertLH(''); setFertIntercourse(false); setFertNotes('')
      // Refresh prediction + fertility data
      cycleAPI.predict().then(r => setPrediction(r?.data?.data || null)).catch(() => {})
      cycleAPI.getBBT(90).then(r => setBbtHistory(r?.data?.data || [])).catch(() => {})
      cycleAPI.getCervicalMucus(90).then(r => setCmHistory(r?.data?.data || [])).catch(() => {})
      cycleAPI.getFertilityDaily(90).then(r => setFertilityDaily(r?.data?.data || [])).catch(() => {})
    } catch (e) { toast.error('Failed to save fertility data') }
    setFertSaving(false)
  }

  const today = useMemo(() => startOfDay(new Date()), [])

  // Compute calendar markers from prediction + logged cycles
  const calendarMarkers = useMemo(() => {
    const markers: Record<string, string[]> = {}

    const markDay = (date: Date, type: string) => {
      const key = date.toISOString().slice(0, 10)
      if (!markers[key]) markers[key] = []
      if (!markers[key].includes(type)) markers[key].push(type)
    }

    // Mark logged period days
    cycles.forEach(cycle => {
      if (!cycle.startDate) return
      const start = startOfDay(new Date(cycle.startDate))
      const end = cycle.endDate
        ? startOfDay(new Date(cycle.endDate))
        : addDays(start, (cycle.periodLength || 5) - 1)
      let d = new Date(start)
      while (d <= end) {
        markDay(new Date(d), 'period')
        d = addDays(d, 1)
      }
    })

    // Use prediction data to mark predicted/fertile/ovulation/pms
    if (prediction) {
      const {
        cycleDay,
        cycleLength = 28,
        periodLength = 5,
        ovulationDate,
        fertileStart,
        fertileEnd,
        daysUntilPeriod,
      } = prediction

      // Predicted next period
      if (typeof daysUntilPeriod === 'number') {
        const nextPeriodStart = addDays(today, daysUntilPeriod)
        for (let i = 0; i < periodLength; i++) {
          markDay(addDays(nextPeriodStart, i), 'predicted')
        }
        // PMS: 3-5 days before next period
        for (let i = 3; i <= 5; i++) {
          const pmsDay = addDays(nextPeriodStart, -i)
          if (pmsDay > today) markDay(pmsDay, 'pms')
        }
      }

      // Fertile window & ovulation — only mark for fertility goal users
      if (showFertility) {
        if (fertileStart && fertileEnd) {
          const fs = startOfDay(new Date(fertileStart))
          const fe = startOfDay(new Date(fertileEnd))
          let d = new Date(fs)
          while (d <= fe) {
            markDay(new Date(d), 'fertile')
            d = addDays(d, 1)
          }
        } else if (typeof cycleDay === 'number') {
          const ovDay = cycleLength - 14
          const lastPeriodStart = addDays(today, -(cycleDay - 1))
          const ovDate = addDays(lastPeriodStart, ovDay - 1)
          for (let i = -2; i <= 2; i++) {
            markDay(addDays(ovDate, i), 'fertile')
          }
          markDay(ovDate, 'ovulation')
        }
      }

      // Ovulation day from API — only for fertility users
      if (showFertility && ovulationDate) {
        markDay(startOfDay(new Date(ovulationDate)), 'ovulation')
      }
    }

    return markers
  }, [cycles, prediction, today, showFertility])

  // Symptom days from cycles
  const symptomDays = useMemo(() => {
    const days = new Set<string>()
    cycles.forEach(c => {
      if (c.symptoms && c.symptoms.length > 0 && c.startDate) {
        const start = startOfDay(new Date(c.startDate))
        const end = c.endDate
          ? startOfDay(new Date(c.endDate))
          : addDays(start, (c.periodLength || 5) - 1)
        let d = new Date(start)
        while (d <= end) {
          days.add(d.toISOString().slice(0, 10))
          d = addDays(d, 1)
        }
      }
    })
    return days
  }, [cycles])

  // Build 42-cell calendar grid
  const calendarCells = useMemo(() => {
    const year = selectedMonth.getFullYear()
    const month = selectedMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: (Date | null)[] = []
    for (let i = 0; i < firstDay; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
    while (cells.length < 42) cells.push(null)
    return cells
  }, [selectedMonth])

  const getDayCellStyle = (date: Date | null) => {
    if (!date) return { bg: '', text: '', border: '' }
    const key = date.toISOString().slice(0, 10)
    const types = calendarMarkers[key] || []
    const isToday = isSameDay(date, today)
    let bg = ''
    let text = ''
    let border = ''

    if (types.includes('period')) {
      bg = 'bg-rose-500'
      text = 'text-white font-bold'
      border = isToday ? 'ring-2 ring-white ring-offset-1' : ''
    } else if (showFertility && types.includes('ovulation')) {
      bg = 'bg-amber-400'
      text = 'text-white font-semibold'
      border = ''
    } else if (showFertility && types.includes('fertile')) {
      bg = 'bg-emerald-100'
      text = 'text-emerald-700 font-medium'
      border = ''
    } else if (types.includes('pms')) {
      bg = 'bg-purple-100'
      text = 'text-purple-700'
      border = ''
    } else if (types.includes('predicted')) {
      border = 'border-2 border-dashed border-rose-300'
      text = 'text-rose-400 font-medium'
    } else if (isToday) {
      border = 'border-2 border-gray-800'
      text = 'text-gray-900 font-black'
    } else {
      text = 'text-gray-700'
    }

    return { bg, text, border }
  }

  const prevMonth = () => {
    setSelectedMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))
  }
  const nextMonth = () => {
    setSelectedMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))
  }

  // Phase timeline data
  const phaseData = useMemo(() => {
    const cycleLength = prediction?.cycleLength || 28
    const periodLength = prediction?.periodLength || 5
    const ovDay = cycleLength - 14
    const menstrual = periodLength
    const follicular = Math.max(1, ovDay - periodLength - 2)
    const ovulation = 3
    const luteal = cycleLength - ovDay
    return { menstrual, follicular, ovulation, luteal, cycleLength }
  }, [prediction])

  const currentPhase = prediction?.phase || ''

  // Sorted cycles newest first
  const sortedCycles = useMemo(() => {
    return [...cycles].sort(
      (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    )
  }, [cycles])

  // Stats
  const stats = useMemo(() => {
    const count = cycles.length
    const avgCycle = prediction?.cycleLength || 28
    const avgDuration = prediction?.periodLength || 5
    let lastPeriod = '-'
    if (cycles.length > 0) {
      const sorted = [...cycles].sort(
        (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      )
      if (sorted[0]?.startDate) {
        lastPeriod = formatMonthDay(new Date(sorted[0].startDate))
      }
    }
    return { count, avgCycle, avgDuration, lastPeriod, regularity: prediction?.regularityScore || (count > 1 ? 50 : 0) }
  }, [cycles, prediction])

  const saveLog = async () => {
    if (!logFlow) { toast.error('Please select flow intensity'); return }
    setSaving(true)
    try {
      await cycleAPI.log({
        startDate: logStartDate.toISOString(),
        endDate: logEndDate ? logEndDate.toISOString() : undefined,
        flow: logFlow,
        painLevel: logPain,
        mood: logMoods,
        symptoms: logSymptoms,
        notes: logNotes,
      })
      toast.success('Period logged! 🌸')
      setShowLogSheet(false)
      setLogFlow('')
      setLogPain(0)
      setLogMoods([])
      setLogSymptoms([])
      setLogNotes('')
      setLogStartDate(new Date())
      setLogEndDate(null)
      setCustomStartInput('')
      setCustomEndInput('')
      cycleAPI.list().then(r => setCycles(r.data.data || []))
    } catch (e) {
      toast.error('Failed to save. Try again.')
    }
    setSaving(false)
  }

  const toggleMood = (mood: string) => {
    setLogMoods(prev => prev.includes(mood) ? prev.filter(m => m !== mood) : [...prev, mood])
  }

  const toggleSymptom = (sym: string) => {
    setLogSymptoms(prev => prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym])
  }

  const phaseInfo = useMemo(() => {
    const phase = (currentPhase || '').toLowerCase()
    if (phase.includes('menstrual') || phase.includes('period')) {
      return {
        color: 'bg-rose-50 border-rose-200',
        accent: 'text-rose-600',
        name: 'Menstrual Phase',
        description: 'Your body is shedding the uterine lining. Rest and self-care are key.',
        tips: [
          'Use a heating pad to ease cramps',
          'Stay hydrated with warm drinks',
          'Light yoga or walking can help',
          'Prioritize iron-rich foods like spinach',
        ],
        estrogen: 15, progesterone: 10, lh: 20, fsh: 30,
      }
    } else if (phase.includes('follicular')) {
      return {
        color: 'bg-green-50 border-green-200',
        accent: 'text-green-600',
        name: 'Follicular Phase',
        description: 'Estrogen rises as follicles develop. Energy and creativity are building.',
        tips: [
          'Great time to start new projects',
          'Try high-intensity workouts',
          'Eat complex carbs for sustained energy',
          'Social activities feel more natural now',
        ],
        estrogen: 70, progesterone: 15, lh: 30, fsh: 60,
      }
    } else if (phase.includes('ovulat')) {
      return {
        color: 'bg-amber-50 border-amber-200',
        accent: 'text-amber-600',
        name: 'Ovulation Phase',
        description: 'Peak fertility window. Estrogen peaks and LH surges to release the egg.',
        tips: [
          'Most fertile days are here',
          'You may feel more confident and social',
          'Great time for important conversations',
          'Support with zinc-rich foods',
        ],
        estrogen: 95, progesterone: 20, lh: 95, fsh: 50,
      }
    } else {
      return {
        color: 'bg-purple-50 border-purple-200',
        accent: 'text-purple-600',
        name: 'Luteal Phase',
        description: 'Progesterone rises to prepare for potential pregnancy. Wind-down phase.',
        tips: [
          'Reduce caffeine to ease PMS symptoms',
          'Magnesium-rich foods help with mood',
          'Gentle exercise like pilates or swimming',
          'Journaling can help process emotions',
        ],
        estrogen: 50, progesterone: 80, lh: 15, fsh: 20,
      }
    }
  }, [currentPhase])

  const painFaces = ['😊', '🙂', '😐', '😣', '😭']

  const flowOptions = [
    { value: 'heavy', label: 'Heavy', emoji: '🔴', desc: 'Soaking through protection' },
    { value: 'medium', label: 'Medium', emoji: '🟠', desc: 'Regular flow' },
    { value: 'light', label: 'Light', emoji: '🟡', desc: 'Light protection needed' },
    { value: 'spotting', label: 'Spotting', emoji: '⚪', desc: 'Very minimal' },
  ]

  const moodOptions = [
    { value: 'happy', label: 'Happy', emoji: '😊' },
    { value: 'calm', label: 'Calm', emoji: '🙂' },
    { value: 'sad', label: 'Sad', emoji: '😔' },
    { value: 'irritable', label: 'Irritable', emoji: '😤' },
    { value: 'tired', label: 'Tired', emoji: '😴' },
  ]

  const symptomOptions = [
    { value: 'cramps', label: 'Cramps', emoji: '🤕' },
    { value: 'bloating', label: 'Bloating', emoji: '💨' },
    { value: 'headache', label: 'Headache', emoji: '🤯' },
    { value: 'fatigue', label: 'Fatigue', emoji: '😴' },
    { value: 'nausea', label: 'Nausea', emoji: '🤢' },
    { value: 'cravings', label: 'Cravings', emoji: '🍫' },
    { value: 'back_pain', label: 'Back Pain', emoji: '💔' },
    { value: 'acne', label: 'Acne', emoji: '😤' },
    { value: 'insomnia', label: 'Insomnia', emoji: '😪' },
  ]

  const HormoneBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className="flex-1 min-w-0">
      <div className="text-xs text-gray-500 mb-1 text-center truncate">{label}</div>
      <div className="h-16 bg-gray-100 rounded-lg relative flex items-end overflow-hidden">
        <div
          className={`w-full ${color} rounded-lg transition-all duration-700`}
          style={{ height: `${value}%` }}
        />
      </div>
      <div className="text-xs text-center mt-1 text-gray-600">{value}%</div>
    </div>
  )

  // ═══ Cycle Circle Helpers ═══
  const polarToCart = (cx: number, cy: number, r: number, deg: number) => {
    const rad = (deg - 90) * Math.PI / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }

  const svgArc = (cx: number, cy: number, r: number, startDeg: number, endDeg: number) => {
    const s = polarToCart(cx, cy, r, endDeg)
    const e = polarToCart(cx, cy, r, startDeg)
    const large = endDeg - startDeg > 180 ? 1 : 0
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y}`
  }

  const PHASE_COLORS = {
    menstrual: '#FF6B8A',
    follicular: '#5EEFC7',
    ovulation: '#FFD166',
    luteal: '#B491FF',
  }

  const getPhaseForDay = (dayNum: number) => {
    const cl = prediction?.cycleLength || 28
    const pl = prediction?.periodLength || 5
    const ovDay = cl - 14
    if (dayNum <= pl) return { name: 'Menstrual', color: PHASE_COLORS.menstrual, emoji: '🩸' }
    if (dayNum <= ovDay - 2) return { name: 'Follicular', color: PHASE_COLORS.follicular, emoji: '🌱' }
    if (dayNum <= ovDay + 1) return { name: 'Ovulation', color: PHASE_COLORS.ovulation, emoji: '✨' }
    return { name: 'Luteal', color: PHASE_COLORS.luteal, emoji: '🌙' }
  }

  const getCycleDayForDate = (date: Date) => {
    if (!prediction?.cycleDay) return null
    const diffDays = Math.round((date.getTime() - today.getTime()) / 86400000)
    const cl = prediction?.cycleLength || 28
    let day = ((prediction.cycleDay - 1 + diffDays) % cl + cl) % cl + 1
    return day
  }

  // Scrollable dates: 10 past → today → 20 future
  const scrollDates = useMemo(() => {
    const dates: Date[] = []
    for (let i = -10; i <= 20; i++) dates.push(addDays(today, i))
    return dates
  }, [today])

  // Auto-scroll date strip to today
  useEffect(() => {
    const timer = setTimeout(() => {
      if (dateStripRef.current) {
        const el = dateStripRef.current.querySelector('[data-today="true"]')
        if (el) el.scrollIntoView({ inline: 'center', block: 'nearest' })
      }
    }, 150)
    return () => clearTimeout(timer)
  }, [loading])

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex flex-col" style={{ maxWidth: 430, margin: '0 auto' }}>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none }
        .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
      `}</style>
      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-xl border-b border-rose-100" style={{ backgroundColor: 'rgba(255,241,242,0.85)' }}>
        <div className="flex items-center px-5 pt-4 pb-2 gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-9 h-9 flex items-center justify-center rounded-2xl bg-white/80 text-gray-600 active:scale-95 transition-all shadow-sm"
          >
            ←
          </button>
          <h1 className="text-xl font-extrabold text-gray-900 flex-1">My Cycle</h1>
          <button onClick={() => navigate('/cycle/history')}
            className="flex items-center gap-1 bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-100 active:scale-95 transition-transform">
            <span className="text-[10px] font-extrabold text-rose-600">History 📅</span>
          </button>
        </div>
        {/* Tabs */}
        <div className="flex px-5 gap-2 pb-3">
          {[{ key: 'calendar', icon: '📅' }, { key: 'insights', icon: '💡' }, ...(showFertility ? [{ key: 'fertility', icon: '🧬' }] : []), { key: 'ayurveda', icon: '🌿' }].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 text-xs font-bold capitalize transition-all rounded-2xl ${
                tab === t.key
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-200'
                  : 'bg-white/60 text-gray-400'
              }`}
            >
              {t.icon} {t.key.charAt(0).toUpperCase() + t.key.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Main scrollable content */}
      <div className="flex-1 overflow-y-auto pb-28">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
          </div>
        ) : tab === 'calendar' ? (
          <>
            {/* ═══ Premium Cycle Circle ═══ */}
            <div className="mx-4 mt-4 rounded-3xl overflow-hidden shadow-xl" style={{ background: 'linear-gradient(160deg, #2a1631 0%, #1a1028 50%, #150e22 100%)' }}>
              <div className="pt-6 pb-5">
                <svg viewBox="0 0 280 280" className="w-60 h-60 mx-auto" style={{ filter: 'drop-shadow(0 0 20px rgba(255,107,138,0.15))' }}>
                  <defs>
                    <filter id="arcGlow" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <filter id="markerDrop" x="-50%" y="-50%" width="200%" height="200%">
                      <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.4" />
                    </filter>
                  </defs>
                  {/* Background track */}
                  <circle cx="140" cy="140" r="110" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="22" />
                  {/* Phase arcs */}
                  {(() => {
                    const cx = 140, cy = 140, r = 110
                    const cl = prediction?.cycleLength || 28
                    const pl = prediction?.periodLength || 5
                    const ovDay = cl - 14
                    const cd = prediction?.cycleDay || 0
                    const GAP = 4
                    const phases = showFertility ? [
                      { days: pl, color: PHASE_COLORS.menstrual },
                      { days: Math.max(1, ovDay - pl - 2), color: PHASE_COLORS.follicular },
                      { days: 3, color: PHASE_COLORS.ovulation },
                      { days: Math.max(1, cl - ovDay - 1), color: PHASE_COLORS.luteal },
                    ] : [
                      { days: pl, color: PHASE_COLORS.menstrual },
                      { days: Math.max(1, ovDay - pl), color: PHASE_COLORS.follicular },
                      { days: Math.max(1, cl - ovDay), color: PHASE_COLORS.luteal },
                    ]
                    let cum = 0
                    const arcs = phases.map((p) => {
                      const sA = (cum / cl) * 360 + GAP / 2
                      const eA = ((cum + p.days) / cl) * 360 - GAP / 2
                      const start = cum
                      cum += p.days
                      const active = cd > start && cd <= start + p.days
                      return { ...p, sA, eA, active }
                    })
                    const dayAngle = cd > 0 ? ((cd - 0.5) / cl) * 360 : 0
                    const mPos = cd > 0 ? polarToCart(cx, cy, r, dayAngle) : null
                    const activeColor = cd > 0 ? (arcs.find(a => a.active)?.color || PHASE_COLORS.menstrual) : PHASE_COLORS.menstrual
                    return (
                      <>
                        {arcs.map((a, i) => (
                          <path
                            key={i}
                            d={svgArc(cx, cy, r, a.sA, a.eA)}
                            fill="none"
                            stroke={a.color}
                            strokeWidth={a.active ? 22 : 12}
                            strokeLinecap="round"
                            opacity={a.active ? 1 : 0.28}
                            filter={a.active ? 'url(#arcGlow)' : undefined}
                            className="transition-all duration-700"
                          />
                        ))}
                        {mPos && (
                          <g filter="url(#markerDrop)">
                            <circle cx={mPos.x} cy={mPos.y} r={14} fill="white" />
                            <circle cx={mPos.x} cy={mPos.y} r={10.5} fill={activeColor} />
                          </g>
                        )}
                      </>
                    )
                  })()}
                  {/* Center content */}
                  <text x="140" y="116" textAnchor="middle" fontSize="46" fontWeight="900" fill="white" fontFamily="system-ui">
                    {prediction?.cycleDay || '--'}
                  </text>
                  <text x="140" y="138" textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.4)" fontWeight="700" letterSpacing="2.5">
                    {prediction?.cycleDay ? 'CYCLE DAY' : 'NO DATA'}
                  </text>
                  <text x="140" y="160" textAnchor="middle" fontSize="13" fill="rgba(255,255,255,0.8)" fontWeight="600">
                    {phaseInfo.name}
                  </text>
                  {typeof prediction?.daysUntilPeriod === 'number' && (
                    <>
                      <rect x="88" y="172" width="104" height="24" rx="12" fill="rgba(255,107,138,0.2)" />
                      <text x="140" y="188" textAnchor="middle" fontSize="11" fill="#FF8FAB" fontWeight="700">
                        {prediction.daysUntilPeriod === 0 ? '🩸 Period today' : prediction.daysUntilPeriod < 0 ? '🩸 Period started' : `🩸 in ${prediction.daysUntilPeriod} days`}
                      </text>
                    </>
                  )}
                </svg>

                {/* Phase legend */}
                <div className="flex justify-center gap-4 mt-3 px-6">
                  {[
                    { label: 'Period', color: PHASE_COLORS.menstrual },
                    { label: 'Follicular', color: PHASE_COLORS.follicular },
                    ...(showFertility ? [{ label: 'Ovulation', color: PHASE_COLORS.ovulation }] : []),
                    { label: 'Luteal', color: PHASE_COLORS.luteal },
                  ].map(p => (
                    <div key={p.label} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>{p.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ═══ Scrollable Date Strip ═══ */}
            <div className="mt-3 mx-3">
              <div
                ref={dateStripRef}
                className="flex gap-1.5 overflow-x-auto pb-2 px-1 hide-scrollbar"
              >
                {scrollDates.map((date, i) => {
                  const isToday2 = isSameDay(date, today)
                  const key = date.toISOString().slice(0, 10)
                  const types = calendarMarkers[key] || []
                  const cycleDayNum = getCycleDayForDate(date)
                  const phase = cycleDayNum ? getPhaseForDay(cycleDayNum) : null
                  const isSelected2 = selectedDate && isSameDay(date, selectedDate)
                  const isPeriod = types.includes('period')
                  const isOvulation2 = types.includes('ovulation')
                  const isFertile2 = types.includes('fertile')
                  const isPredicted = types.includes('predicted')

                  let bg2 = 'bg-white'
                  let tc2 = 'text-gray-700'
                  if (isPeriod) { bg2 = ''; tc2 = 'text-white' }
                  else if (isOvulation2) { bg2 = ''; tc2 = 'text-white' }
                  else if (isFertile2) { bg2 = 'bg-teal-50 border border-teal-200' }
                  else if (isPredicted) { bg2 = 'bg-rose-50 border border-dashed border-rose-200'; tc2 = 'text-rose-400' }

                  return (
                    <button
                      key={i}
                      data-today={isToday2 ? 'true' : undefined}
                      onClick={() => setSelectedDate(isSelected2 ? null : date)}
                      className={`flex-shrink-0 flex flex-col items-center w-[46px] py-2.5 rounded-2xl transition-all shadow-sm ${bg2} ${
                        isToday2 ? 'ring-2 ring-rose-400 ring-offset-2' : ''
                      } ${isSelected2 && !isToday2 ? 'ring-2 ring-gray-800 ring-offset-1' : ''}`}
                      style={isPeriod ? { backgroundColor: PHASE_COLORS.menstrual } : isOvulation2 ? { backgroundColor: PHASE_COLORS.ovulation } : undefined}
                    >
                      <span className={`text-[9px] font-bold uppercase ${
                        isPeriod || isOvulation2 ? 'text-white/60' : 'text-gray-400'
                      }`}>
                        {['Su','Mo','Tu','We','Th','Fr','Sa'][date.getDay()]}
                      </span>
                      <span className={`text-[15px] font-extrabold leading-none mt-1 ${tc2}`}>
                        {date.getDate()}
                      </span>
                      {phase && !isPeriod && !isOvulation2 && (
                        <div className="w-1.5 h-1.5 rounded-full mt-1.5" style={{ backgroundColor: phase.color }} />
                      )}
                      {(isPeriod || isOvulation2) && (
                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 bg-white/40" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ═══ Selected / Today Detail Card ═══ */}
            {(() => {
              const showDate = selectedDate || today
              const key2 = showDate.toISOString().slice(0, 10)
              const types2 = calendarMarkers[key2] || []
              const cdNum = getCycleDayForDate(showDate)
              const phase2 = cdNum ? getPhaseForDay(cdNum) : null
              const dayLabel = showDate.toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })
              const isToday3 = isSameDay(showDate, today)
              return (
                <div className="mx-4 mt-2 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-800">
                        {isToday3 ? 'Today' : dayLabel}
                        {isToday3 && <span className="text-gray-400 font-normal ml-1.5 text-xs">{dayLabel}</span>}
                      </p>
                      {phase2 && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: phase2.color }} />
                          <span className="text-xs font-semibold" style={{ color: phase2.color }}>{phase2.name} Phase</span>
                          {cdNum && <span className="text-xs text-gray-400 ml-0.5">· Day {cdNum}</span>}
                        </div>
                      )}
                    </div>
                    <span className="text-2xl">{phase2?.emoji || '📅'}</span>
                  </div>
                  {types2.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {types2.includes('period') && <span className="text-[10px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-bold">Period</span>}
                      {showFertility && types2.includes('fertile') && <span className="text-[10px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-bold">Fertile Window</span>}
                      {showFertility && types2.includes('ovulation') && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">Ovulation Day</span>}
                      {types2.includes('predicted') && <span className="text-[10px] bg-rose-50 text-rose-400 px-2 py-0.5 rounded-full font-bold">Predicted Period</span>}
                      {types2.includes('pms') && <span className="text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-bold">PMS</span>}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* ═══ Monthly Calendar (collapsible) ═══ */}
            <div className="mx-4 mt-3">
              <button
                onClick={() => setShowFullCalendar(!showFullCalendar)}
                className="w-full flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 active:scale-[0.99] transition-transform"
              >
                <span className="text-sm font-bold text-gray-700">📅 Monthly Calendar</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{MONTHS[selectedMonth.getMonth()].slice(0, 3)} {selectedMonth.getFullYear()}</span>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${showFullCalendar ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              {showFullCalendar && (
                <div className="bg-white rounded-2xl mt-1 shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-4 py-2.5 flex items-center justify-between border-b border-gray-50">
                    <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-50 text-gray-500 active:scale-95">←</button>
                    <span className="text-sm font-bold text-gray-800">{MONTHS[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}</span>
                    <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-50 text-gray-500 active:scale-95">→</button>
                  </div>
                  <div className="px-3 pb-3 pt-2">
                    <div className="grid grid-cols-7 mb-1">
                      {DAYS_SHORT.map(d => (
                        <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d.slice(0, 2)}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-0.5">
                      {calendarCells.map((date, idx) => {
                        if (!date) return <div key={idx} />
                        const key = date.toISOString().slice(0, 10)
                        const types = calendarMarkers[key] || []
                        const { bg, text, border } = getDayCellStyle(date)
                        const isToday4 = isSameDay(date, today)
                        const hasSymptom = symptomDays.has(key)
                        const isOvulation3 = types.includes('ovulation')
                        return (
                          <div
                            key={idx}
                            onClick={() => setSelectedDate(date)}
                            className={`relative flex flex-col items-center justify-center rounded-full aspect-square text-xs font-medium cursor-pointer transition-all ${bg} ${text} ${border}`}
                          >
                            <span className={isToday4 && !bg ? 'font-black text-gray-900' : ''}>{date.getDate()}</span>
                            {isOvulation3 && <span className="text-[7px] leading-none">⭐</span>}
                            {hasSymptom && !isOvulation3 && <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-rose-400" />}
                          </div>
                        )
                      })}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 px-1">
                      {[
                        { color: 'bg-rose-500', label: 'Period' },
                        ...(showFertility ? [
                          { color: 'bg-emerald-100 border border-emerald-300', label: 'Fertile' },
                          { color: 'bg-amber-400', label: 'Ovulation' },
                        ] : []),
                        { color: 'bg-purple-100', label: 'PMS' },
                        { color: 'border-2 border-dashed border-rose-300', label: 'Predicted' },
                      ].map(({ color, label }) => (
                        <div key={label} className="flex items-center gap-1">
                          <div className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${color}`} />
                          <span className="text-[10px] text-gray-400">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Phase Timeline Bar */}
            <div className="bg-white mx-4 mt-3 rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-sm font-bold text-gray-700">Cycle Timeline</span>
                {prediction?.cycleDay && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full" style={{
                    backgroundColor: getPhaseForDay(prediction.cycleDay).color + '18',
                    color: getPhaseForDay(prediction.cycleDay).color,
                  }}>
                    Day {prediction.cycleDay} of {prediction?.cycleLength || 28}
                  </span>
                )}
              </div>
              <div className="flex rounded-full overflow-hidden h-6 mb-2 bg-gray-100">
                {[
                  { label: 'M', days: phaseData.menstrual, color: PHASE_COLORS.menstrual, phase: 'menstrual' },
                  { label: 'F', days: phaseData.follicular, color: PHASE_COLORS.follicular, phase: 'follicular' },
                  { label: 'O', days: phaseData.ovulation, color: PHASE_COLORS.ovulation, phase: 'ovulat' },
                  { label: 'L', days: phaseData.luteal, color: PHASE_COLORS.luteal, phase: 'luteal' },
                ].map(seg => {
                  const pct = (seg.days / phaseData.cycleLength) * 100
                  const isActive = currentPhase?.toLowerCase().includes(seg.phase.slice(0, 4))
                  return (
                    <div
                      key={seg.phase}
                      className="flex items-center justify-center text-white text-[10px] font-bold transition-all"
                      style={{ width: `${pct}%`, backgroundColor: seg.color, opacity: isActive ? 1 : 0.3 }}
                    >
                      {pct > 12 ? seg.label : ''}
                    </div>
                  )
                })}
              </div>
              <div className="flex text-[10px]">
                {[
                  { label: 'Menstrual', days: phaseData.menstrual, color: PHASE_COLORS.menstrual },
                  { label: 'Follicular', days: phaseData.follicular, color: PHASE_COLORS.follicular },
                  { label: 'Ovulation', days: phaseData.ovulation, color: PHASE_COLORS.ovulation },
                  { label: 'Luteal', days: phaseData.luteal, color: PHASE_COLORS.luteal },
                ].map(s => (
                  <div
                    key={s.label}
                    className="text-center overflow-hidden font-medium"
                    style={{ width: `${(s.days / phaseData.cycleLength) * 100}%`, color: s.color }}
                  >
                    {s.days}d
                  </div>
                ))}
              </div>
            </div>

            {/* Cycle Stats Row */}
            <div className="mt-3 px-4">
              <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                {[
                  { icon: '📊', label: 'Avg Cycle', value: `${stats.avgCycle}d`, accent: PHASE_COLORS.follicular },
                  { icon: '📅', label: 'Last Period', value: stats.lastPeriod, accent: PHASE_COLORS.menstrual },
                  { icon: '⏱️', label: 'Duration', value: `${stats.avgDuration}d`, accent: PHASE_COLORS.ovulation },
                  { icon: '📈', label: 'Regularity', value: stats.regularity > 0 ? `${stats.regularity}%` : 'N/A', accent: PHASE_COLORS.luteal },
                  { icon: '🔢', label: 'Tracked', value: `${stats.count}`, accent: '#6B7280' },
                ].map(card => (
                  <div
                    key={card.label}
                    className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex-shrink-0 min-w-[80px] text-center"
                  >
                    <div className="text-lg mb-0.5">{card.icon}</div>
                    <div className="text-sm font-extrabold whitespace-nowrap" style={{ color: card.accent }}>{card.value}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5 font-medium whitespace-nowrap">{card.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Past Period History */}
            <div className="mt-3 px-4">
              <h3 className="text-sm font-bold text-gray-700 mb-2">Period History</h3>
              {sortedCycles.length === 0 ? (
                <div className="bg-white rounded-2xl p-6 text-center text-gray-400 text-sm shadow-sm border border-gray-100">
                  No periods logged yet. Tap + Log Period to get started!
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {sortedCycles.map((cycle, i) => {
                    const start = cycle.startDate ? new Date(cycle.startDate) : null
                    const end = cycle.endDate ? new Date(cycle.endDate) : null
                    const duration =
                      start && end
                        ? Math.round((end.getTime() - start.getTime()) / 86400000) + 1
                        : cycle.periodLength || '?'
                    const isExpanded = expandedCycle === i
                    return (
                      <div key={cycle.id || i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <button
                          className="w-full flex items-center justify-between px-4 py-3 text-left"
                          onClick={() => setExpandedCycle(isExpanded ? null : i)}
                        >
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-sm font-semibold text-gray-800">
                              {start ? formatMonthDay(start) : '?'}
                              {end ? ` – ${formatMonthDay(end)}` : ''}
                            </span>
                            <span className="text-xs text-gray-400">· {duration} days</span>
                            {cycle.flow && (
                              <span className="text-xs text-gray-400">
                                · {cycle.flow.charAt(0).toUpperCase() + cycle.flow.slice(1)} flow
                              </span>
                            )}
                          </div>
                          <svg
                            className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ml-2 ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-3 border-t border-gray-50 pt-2 space-y-1.5">
                            {cycle.painLevel !== undefined && cycle.painLevel > 0 && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span className="text-gray-400 w-24 text-xs">Pain Level</span>
                                <span>
                                  {painFaces[(cycle.painLevel || 1) - 1] || ''} {cycle.painLevel}/5
                                </span>
                              </div>
                            )}
                            {cycle.mood && cycle.mood.length > 0 && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span className="text-gray-400 w-24 text-xs">Mood</span>
                                <span>{Array.isArray(cycle.mood) ? cycle.mood.join(', ') : cycle.mood}</span>
                              </div>
                            )}
                            {cycle.symptoms && cycle.symptoms.length > 0 && (
                              <div className="flex items-start gap-2 text-sm text-gray-600">
                                <span className="text-gray-400 w-24 text-xs flex-shrink-0">Symptoms</span>
                                <span>{Array.isArray(cycle.symptoms) ? cycle.symptoms.join(', ') : cycle.symptoms}</span>
                              </div>
                            )}
                            {cycle.notes && (
                              <div className="flex items-start gap-2 text-sm text-gray-600">
                                <span className="text-gray-400 w-24 text-xs flex-shrink-0">Notes</span>
                                <span className="flex-1">{cycle.notes}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        ) : tab === 'insights' ? (
          /* INSIGHTS TAB */
          <div className="px-5 py-4 space-y-3">
            {/* Current Phase Card */}
            <div className={`rounded-2xl border p-4 ${phaseInfo.color}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className={`text-xs font-bold uppercase tracking-wide ${phaseInfo.accent}`}>
                    Current Phase
                  </div>
                  <div className="text-lg font-black text-gray-900 mt-0.5">{phaseInfo.name}</div>
                </div>
                {prediction?.cycleDay && (
                  <div className={`text-2xl font-black ${phaseInfo.accent}`}>
                    Day {prediction.cycleDay}
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600">{phaseInfo.description}</p>
            </div>

            {/* Countdown Cards */}
            <div className={`grid ${showFertility ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
              {showFertility && prediction?.fertileStart && prediction?.fertileEnd && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
                  <div className="text-xs text-emerald-600 font-semibold mb-1">Fertile</div>
                  <div className="text-base font-black text-emerald-700">
                    {formatMonthDay(new Date(prediction.fertileStart))}
                  </div>
                  <div className="text-xs text-emerald-500 mt-0.5">window open</div>
                </div>
              )}
              {showFertility && prediction?.ovulationDate && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
                  <div className="text-xs text-amber-600 font-semibold mb-1">Ovulation</div>
                  <div className="text-base font-black text-amber-700">
                    {formatMonthDay(new Date(prediction.ovulationDate))}
                  </div>
                  <div className="text-xs text-amber-500 mt-0.5">predicted</div>
                </div>
              )}
              {typeof prediction?.daysUntilPeriod === 'number' && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3">
                  <div className="text-xs text-rose-500 font-semibold mb-1">Next Period</div>
                  <div className="text-base font-black text-rose-600">
                    {prediction.daysUntilPeriod === 0 ? 'Today' : `${prediction.daysUntilPeriod}d`}
                  </div>
                  <div className="text-xs text-rose-400 mt-0.5">
                    {prediction.daysUntilPeriod === 0 ? 'due' : 'away'}
                  </div>
                </div>
              )}
              {!prediction && (
                <div className="col-span-3 bg-gray-50 rounded-2xl p-4 text-center text-gray-400 text-sm">
                  Log a period to see predictions
                </div>
              )}
            </div>

            {/* Fertility Window Detail — fertility users only */}
            {showFertility && prediction?.fertileStart && prediction?.fertileEnd && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                <div className="text-sm font-bold text-emerald-700 mb-1">Fertile Window</div>
                <div className="text-sm text-emerald-600 font-semibold">
                  {formatMonthDay(new Date(prediction.fertileStart))} – {formatMonthDay(new Date(prediction.fertileEnd))}
                </div>
                <p className="text-xs text-emerald-500 mt-1">
                  Your 5 most fertile days based on predicted ovulation
                </p>
              </div>
            )}

            {/* Ovulation Countdown — fertility users only */}
            {showFertility && prediction?.ovulationDate && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <div className="text-sm font-bold text-amber-700 mb-1">Ovulation Countdown</div>
                {(() => {
                  const ovDate = startOfDay(new Date(prediction.ovulationDate))
                  const diff = Math.round((ovDate.getTime() - today.getTime()) / 86400000)
                  return (
                    <div className="text-sm text-amber-600">
                      {diff > 0
                        ? `Ovulation in ${diff} day${diff !== 1 ? 's' : ''}`
                        : diff === 0
                        ? 'Ovulation day is today!'
                        : `Ovulation was ${Math.abs(diff)} day${Math.abs(diff) !== 1 ? 's' : ''} ago`}
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Next Period Countdown */}
            {typeof prediction?.daysUntilPeriod === 'number' && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
                <div className="text-sm font-bold text-rose-600 mb-1">Next Period</div>
                <div className="text-sm text-rose-500">
                  {prediction.daysUntilPeriod === 0
                    ? 'Your period is due today'
                    : prediction.daysUntilPeriod < 0
                    ? `Period started ${Math.abs(prediction.daysUntilPeriod)} day${Math.abs(prediction.daysUntilPeriod) !== 1 ? 's' : ''} ago`
                    : `Period in ${prediction.daysUntilPeriod} day${prediction.daysUntilPeriod !== 1 ? 's' : ''}`}
                </div>
              </div>
            )}

            {/* Hormone Levels — period users see Estrogen + Progesterone only; fertility users see all 4 */}
            <div className="bg-white rounded-3xl p-4 shadow-lg">
              <div className="text-sm font-bold text-gray-700 mb-3">{showFertility ? 'Hormone Levels' : 'Your Hormones'}</div>
              <div className="flex gap-3">
                <HormoneBar label="Estrogen" value={prediction?.hormones?.estrogen ?? phaseInfo.estrogen} color="bg-rose-400" />
                <HormoneBar label="Progesterone" value={prediction?.hormones?.progesterone ?? phaseInfo.progesterone} color="bg-purple-400" />
                {showFertility && <HormoneBar label="LH" value={prediction?.hormones?.lh ?? phaseInfo.lh} color="bg-amber-400" />}
                {showFertility && <HormoneBar label="FSH" value={prediction?.hormones?.fsh ?? phaseInfo.fsh} color="bg-emerald-400" />}
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                {prediction?.hormones ? 'Based on your cycle day & individual phase lengths' : 'Approximate relative levels'}
              </p>
            </div>

            {/* Confidence & Prediction Quality */}
            {prediction?.confidence && (
              <div className="bg-white rounded-3xl p-4 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-700">Prediction Confidence</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    prediction.confidence.score >= 70 ? 'bg-emerald-100 text-emerald-700' :
                    prediction.confidence.score >= 50 ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{prediction.confidence.score}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                  <div className={`h-2 rounded-full transition-all ${
                    prediction.confidence.score >= 70 ? 'bg-emerald-500' :
                    prediction.confidence.score >= 50 ? 'bg-amber-500' : 'bg-gray-400'
                  }`} style={{ width: `${prediction.confidence.score}%` }} />
                </div>
                <div className="space-y-1">
                  {prediction.confidence.factors?.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="text-emerald-500">✓</span> {f}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fertility Score — fertility users only */}
            {showFertility && prediction?.fertilityScore !== undefined && (
              <div className={`rounded-2xl p-4 border ${
                prediction.fertilityStatus === 'peak' ? 'bg-rose-50 border-rose-200' :
                prediction.fertilityStatus === 'high' ? 'bg-amber-50 border-amber-200' :
                prediction.fertilityStatus === 'moderate' ? 'bg-yellow-50 border-yellow-200' :
                'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-gray-700">Today's Fertility</span>
                  <span className={`text-lg font-black ${
                    prediction.fertilityStatus === 'peak' ? 'text-rose-600' :
                    prediction.fertilityStatus === 'high' ? 'text-amber-600' :
                    'text-gray-600'
                  }`}>{prediction.fertilityScore}%</span>
                </div>
                <p className="text-xs text-gray-500">
                  {prediction.fertilityStatus === 'peak' ? 'Peak fertility — highest chance of conception' :
                   prediction.fertilityStatus === 'high' ? 'High fertility window' :
                   prediction.fertilityStatus === 'moderate' ? 'Moderate fertility' :
                   'Low fertility phase'}
                </p>
                {prediction.biomarkerSignals?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {prediction.biomarkerSignals.map((s, i) => (
                      <span key={i} className="text-[10px] font-bold bg-white/80 px-2 py-0.5 rounded-full text-gray-600">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Phase Tips */}
            <div className="bg-white rounded-3xl p-4 shadow-lg">
              <div className="text-sm font-bold text-gray-700 mb-3">Phase Tips</div>
              <div className="space-y-2">
                {phaseInfo.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0 ${
                        i === 0
                          ? 'bg-rose-400'
                          : i === 1
                          ? 'bg-amber-400'
                          : i === 2
                          ? 'bg-emerald-400'
                          : 'bg-purple-400'
                      }`}
                    >
                      {i + 1}
                    </div>
                    <p className="text-sm text-gray-700 leading-snug">{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Unlock Fertility Features — upsell for non-fertility users (future paywall ready) */}
            {!showFertility && (
              <div className="rounded-2xl p-4 border-2 border-dashed border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">🧬</span>
                  <div className="flex-1">
                    <p className="text-sm font-extrabold text-purple-800">Unlock Fertility Insights</p>
                    <p className="text-xs text-purple-600 mt-1 leading-relaxed">
                      Get ovulation predictions, fertile window tracking, BBT charts, LH monitoring, and conception probability — all powered by your cycle data.
                    </p>
                    <button
                      onClick={() => {
                        useCycleStore.getState().setGoal('fertility')
                        toast.success('Switched to Fertility mode! 💜')
                      }}
                      className="mt-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl active:scale-95 transition-transform shadow-md shadow-purple-200"
                    >
                      💜 Switch to Fertility Tracking
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : tab === 'fertility' ? (
          /* FERTILITY TAB */
          <div className="px-5 py-4 space-y-3">
            {/* Fertility Score Hero */}
            <div className="bg-gradient-to-br from-rose-50 to-purple-50 rounded-3xl p-5 border border-rose-100 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-bold text-rose-500 uppercase tracking-wider">Today's Fertility</p>
                  <p className="text-3xl font-black text-gray-900 mt-1">
                    {prediction?.fertilityScore ?? '--'}
                    <span className="text-sm font-bold text-gray-400">%</span>
                  </p>
                </div>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl ${
                  prediction?.fertilityStatus === 'peak' ? 'bg-rose-100' :
                  prediction?.fertilityStatus === 'high' ? 'bg-amber-100' :
                  prediction?.fertilityStatus === 'moderate' ? 'bg-yellow-100' : 'bg-gray-100'
                }`}>
                  {prediction?.fertilityStatus === 'peak' ? '🔥' :
                   prediction?.fertilityStatus === 'high' ? '✨' :
                   prediction?.fertilityStatus === 'moderate' ? '🌤️' : '🌙'}
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {prediction?.confirmedOvulation
                  ? '🎯 Ovulation confirmed by BBT thermal shift'
                  : prediction?.fertilityStatus === 'peak'
                  ? 'Peak fertility — highest probability of conception (Wilcox et al.)'
                  : prediction?.fertilityStatus === 'high'
                  ? 'High fertility window — sperm survive up to 5 days'
                  : 'Based on cycle analysis, BBT, cervical mucus & LH data'}
              </p>
              {prediction?.conceptionProbability > 0 && (
                <div className="mt-3 bg-white/60 rounded-2xl p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-600">Conception Probability</span>
                    <span className="text-sm font-black text-rose-600">{Math.round(prediction.conceptionProbability * 100)}%</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Per Wilcox et al. (1995 BMJ) day-specific rates</p>
                </div>
              )}
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-2xl p-3 shadow text-center">
                <p className="text-lg font-black text-purple-600">{prediction?.lutealPhase || '--'}</p>
                <p className="text-[10px] text-gray-400 font-bold">Luteal Phase</p>
              </div>
              <div className="bg-white rounded-2xl p-3 shadow text-center">
                <p className="text-lg font-black text-gray-800">{prediction?.cycleVariability ? `±${prediction.cycleVariability}d` : '--'}</p>
                <p className="text-[10px] text-gray-400 font-bold">Variability</p>
              </div>
              <div className="bg-white rounded-2xl p-3 shadow text-center">
                <p className="text-lg font-black text-emerald-600">{prediction?.regularityScore ?? '--'}%</p>
                <p className="text-[10px] text-gray-400 font-bold">Regularity</p>
              </div>
            </div>

            {/* BBT Chart */}
            <div className="bg-white rounded-3xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-gray-700">🌡️ BBT Chart</span>
                <span className="text-[10px] text-gray-400">{bbtHistory.length} readings</span>
              </div>
              {bbtHistory.length > 0 ? (
                <div>
                  {/* Simple BBT chart using bars */}
                  <div className="flex items-end gap-0.5 h-24 overflow-x-auto">
                    {bbtHistory.slice(-30).map((entry, i) => {
                      const temp = entry.temperature || 36.5
                      const minT = 36.0, maxT = 37.5
                      const pct = Math.max(5, Math.min(100, ((temp - minT) / (maxT - minT)) * 100))
                      const isHigh = temp >= (prediction?.thermalShift?.coverlineTemp || 36.5) + 0.2
                      return (
                        <div key={i} className="flex-1 min-w-[8px] flex flex-col items-center" title={`${new Date(entry.logDate).toLocaleDateString()}: ${temp}°C`}>
                          <div className={`w-full rounded-t-sm transition-all ${isHigh ? 'bg-rose-400' : 'bg-blue-300'}`}
                            style={{ height: `${pct}%` }} />
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-between mt-1 text-[9px] text-gray-400">
                    <span>36.0°C</span>
                    {prediction?.thermalShift?.detected && (
                      <span className="text-rose-500 font-bold">↑ Thermal shift detected</span>
                    )}
                    <span>37.5°C</span>
                  </div>
                  <div className="flex gap-3 mt-2">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-300 rounded-sm" /><span className="text-[10px] text-gray-400">Pre-ovulation</span></div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 bg-rose-400 rounded-sm" /><span className="text-[10px] text-gray-400">Post-ovulation</span></div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-3xl mb-2">🌡️</p>
                  <p className="text-xs text-gray-400">No BBT data yet. Log your first reading!</p>
                  <p className="text-[10px] text-gray-300 mt-1">BBT confirms ovulation with 97% accuracy (Baird 2005)</p>
                </div>
              )}
            </div>

            {/* Cervical Mucus Pattern */}
            <div className="bg-white rounded-3xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-gray-700">💧 Cervical Mucus</span>
                <span className="text-[10px] text-gray-400">{cmHistory.length} logs</span>
              </div>
              {cmHistory.length > 0 ? (
                <div className="flex items-end gap-1 h-16">
                  {cmHistory.slice(-30).map((entry, i) => {
                    const cmColors = { dry: 'bg-gray-200', sticky: 'bg-yellow-300', creamy: 'bg-amber-200', watery: 'bg-blue-300', eggWhite: 'bg-emerald-400', spotting: 'bg-rose-300' }
                    const cmHeights = { dry: '20%', sticky: '35%', creamy: '50%', watery: '70%', eggWhite: '95%', spotting: '25%' }
                    return (
                      <div key={i} className="flex-1 min-w-[8px] flex flex-col justify-end" title={`${new Date(entry.logDate).toLocaleDateString()}: ${entry.type}`}>
                        <div className={`w-full rounded-t-sm ${cmColors[entry.type] || 'bg-gray-200'}`}
                          style={{ height: cmHeights[entry.type] || '20%' }} />
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs text-gray-400">No CM data yet</p>
                  <p className="text-[10px] text-gray-300 mt-1">Egg-white CM predicts ovulation with 94.5% sensitivity (Bigelow 2004)</p>
                </div>
              )}
              <div className="flex flex-wrap gap-1 mt-2">
                {[
                  { type: 'dry', color: 'bg-gray-200', label: 'Dry' },
                  { type: 'sticky', color: 'bg-yellow-300', label: 'Sticky' },
                  { type: 'creamy', color: 'bg-amber-200', label: 'Creamy' },
                  { type: 'watery', color: 'bg-blue-300', label: 'Watery' },
                  { type: 'eggWhite', color: 'bg-emerald-400', label: 'Egg White' },
                ].map(c => (
                  <div key={c.type} className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-sm ${c.color}`} />
                    <span className="text-[9px] text-gray-400">{c.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Prediction Windows */}
            {prediction?.periodWindow && (
              <div className="bg-white rounded-3xl p-4 shadow-lg">
                <span className="text-sm font-bold text-gray-700 block mb-2">📊 Prediction Windows</span>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-rose-50 rounded-xl px-3 py-2">
                    <span className="text-xs text-rose-600 font-bold">Next Period</span>
                    <span className="text-xs text-gray-600">
                      {new Date(prediction.periodWindow.early).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                      {' — '}
                      {new Date(prediction.periodWindow.late).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  {prediction?.ovulationWindow && (
                    <div className="flex items-center justify-between bg-amber-50 rounded-xl px-3 py-2">
                      <span className="text-xs text-amber-600 font-bold">Ovulation</span>
                      <span className="text-xs text-gray-600">
                        {new Date(prediction.ovulationWindow.early).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                        {' — '}
                        {new Date(prediction.ovulationWindow.late).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 mt-2 text-center">68% confidence interval based on your cycle variability</p>
              </div>
            )}

            {/* Research Info */}
            <div className="bg-indigo-50 rounded-3xl p-4 border border-indigo-100">
              <p className="text-xs font-bold text-indigo-700 mb-2">🔬 Science Behind Your Predictions</p>
              <div className="space-y-1.5 text-[10px] text-indigo-600">
                <p>• <strong>Ovulation</strong>: Calculated from your individual luteal phase length ({prediction?.lutealPhase || 13}d), not the assumed 14 days (Lenton 1984)</p>
                <p>• <strong>Fertile window</strong>: 6-day window based on sperm survival (5d) + egg life (1d) per Wilcox et al. 1995</p>
                <p>• <strong>Cycle prediction</strong>: Weighted moving average — recent cycles matter more (Bull 2019, 612K cycles)</p>
                <p>• <strong>BBT</strong>: 3-over-6 rule detects 0.2-0.5°C post-ovulation shift with 97% specificity (Baird 2005)</p>
                <p>• <strong>Cervical mucus</strong>: Egg-white CM peak predicts ovulation with 94.5% sensitivity (Bigelow 2004)</p>
              </div>
            </div>

            {/* Log Fertility Data Button */}
            <button
              onClick={() => setShowFertilitySheet(true)}
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold text-sm py-3.5 rounded-2xl shadow-lg shadow-purple-200 active:scale-95 transition-transform"
            >
              🧬 Log Today's Fertility Data
            </button>
          </div>
        ) : tab === 'ayurveda' ? (
          <div className="px-4 py-4 space-y-4">
            {ayurvedaLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
              </div>
            ) : ayurvedaData ? (
              <>
                {/* Dosha Identity Card */}
                <div className="rounded-3xl p-5 text-white" style={{ background: ayurvedaData.dosha === 'Vata' ? 'linear-gradient(135deg,#7C3AED,#A78BFA)' : ayurvedaData.dosha === 'Pitta' ? 'linear-gradient(135deg,#DC2626,#F97316)' : 'linear-gradient(135deg,#059669,#34D399)' }}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-4xl">{ayurvedaData.dosha === 'Vata' ? '🌬️' : ayurvedaData.dosha === 'Pitta' ? '🔥' : '🌿'}</span>
                    <div>
                      <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider">Your Prakriti</p>
                      <p className="text-2xl font-extrabold">{ayurvedaData.doshaDescription?.name}</p>
                    </div>
                  </div>
                  <p className="text-white/80 text-xs leading-relaxed mb-2">{ayurvedaData.doshaDescription?.cyclePattern}</p>
                  <div className="flex gap-2 mt-3">
                    <div className="bg-white/20 rounded-xl px-3 py-1.5 flex-1 text-center">
                      <p className="text-[10px] text-white/60">Phase</p>
                      <p className="text-sm font-bold capitalize">{ayurvedaData.phase}</p>
                    </div>
                    <div className="bg-white/20 rounded-xl px-3 py-1.5 flex-1 text-center">
                      <p className="text-[10px] text-white/60">Day</p>
                      <p className="text-sm font-bold">{ayurvedaData.cycleDay}</p>
                    </div>
                    <div className="bg-white/20 rounded-xl px-3 py-1.5 flex-1 text-center">
                      <p className="text-[10px] text-white/60">Balance</p>
                      <p className="text-sm font-bold">{ayurvedaData.doshaBalance?.score}%</p>
                    </div>
                  </div>
                </div>

                {/* Daily Personalized Tip */}
                {ayurvedaData.dailyTip && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{ayurvedaData.dailyTip.emoji}</span>
                      <p className="text-sm font-extrabold text-amber-800">{ayurvedaData.dailyTip.title}</p>
                    </div>
                    <p className="text-xs text-amber-700 leading-relaxed">{ayurvedaData.dailyTip.body}</p>
                  </div>
                )}

                {/* Dosha Balance Assessment */}
                {ayurvedaData.doshaBalance && (
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <p className="text-xs font-extrabold text-gray-800 mb-3">Dosha Balance</p>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${ayurvedaData.doshaBalance.score}%`, background: ayurvedaData.doshaBalance.score >= 70 ? 'linear-gradient(90deg,#10B981,#34D399)' : ayurvedaData.doshaBalance.score >= 40 ? 'linear-gradient(90deg,#F59E0B,#FBBF24)' : 'linear-gradient(90deg,#EF4444,#F87171)' }} />
                      </div>
                      <span className="text-xs font-bold text-gray-600">{ayurvedaData.doshaBalance.status}</span>
                    </div>
                    {ayurvedaData.doshaBalance.dominantImbalance !== 'None' && (
                      <p className="text-[11px] text-gray-500 leading-relaxed">{ayurvedaData.doshaBalance.tip}</p>
                    )}
                  </div>
                )}

                {/* Phase Guidance: Diet */}
                {ayurvedaData.guidance?.diet?.length > 0 && (
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <p className="text-xs font-extrabold text-gray-800 mb-1">🍽️ Diet — {ayurvedaData.phase} phase</p>
                    <p className="text-[10px] text-gray-400 mb-3">{ayurvedaData.guidance.dominantDosha}</p>
                    <div className="space-y-2">
                      {ayurvedaData.guidance.diet.map((tip, i) => (
                        <div key={i} className="flex gap-2">
                          <span className="text-emerald-500 text-xs mt-0.5">●</span>
                          <p className="text-[11px] text-gray-600 leading-relaxed">{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Phase Guidance: Herbs */}
                {ayurvedaData.guidance?.herbs?.length > 0 && (
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <p className="text-xs font-extrabold text-gray-800 mb-3">🌿 Ayurvedic Herbs</p>
                    <div className="space-y-2">
                      {ayurvedaData.guidance.herbs.map((herb, i) => (
                        <div key={i} className="flex gap-2">
                          <span className="text-purple-500 text-xs mt-0.5">●</span>
                          <p className="text-[11px] text-gray-600 leading-relaxed">{herb}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Phase Guidance: Yoga */}
                {ayurvedaData.guidance?.yoga?.length > 0 && (
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <p className="text-xs font-extrabold text-gray-800 mb-3">🧘 Yoga & Pranayama</p>
                    <div className="space-y-2">
                      {ayurvedaData.guidance.yoga.map((pose, i) => (
                        <div key={i} className="flex gap-2">
                          <span className="text-indigo-500 text-xs mt-0.5">●</span>
                          <p className="text-[11px] text-gray-600 leading-relaxed">{pose}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Phase Guidance: Lifestyle */}
                {ayurvedaData.guidance?.lifestyle?.length > 0 && (
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <p className="text-xs font-extrabold text-gray-800 mb-3">🌸 Lifestyle (Dinacharya)</p>
                    <div className="space-y-2">
                      {ayurvedaData.guidance.lifestyle.map((tip, i) => (
                        <div key={i} className="flex gap-2">
                          <span className="text-rose-400 text-xs mt-0.5">●</span>
                          <p className="text-[11px] text-gray-600 leading-relaxed">{tip}</p>
                        </div>
                      ))}
                    </div>
                    {ayurvedaData.guidance.avoid?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-[10px] font-bold text-red-500 mb-1">⚠️ Avoid</p>
                        <p className="text-[11px] text-gray-500">{ayurvedaData.guidance.avoid.join(' • ')}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Symptom Insights (Ayurvedic interpretation) */}
                {ayurvedaData.symptomInsights?.length > 0 && (
                  <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4">
                    <p className="text-xs font-extrabold text-violet-800 mb-3">🔍 Your Symptoms — Ayurvedic Lens</p>
                    <div className="space-y-2">
                      {ayurvedaData.symptomInsights.map((insight, i) => (
                        <p key={i} className="text-[11px] text-violet-700 leading-relaxed">• {insight}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conception Guide — only for fertility (TTC) users */}
                {showFertility && ayurvedaData.conceptionGuide && (
                  <div className="bg-pink-50 border border-pink-200 rounded-2xl p-4">
                    <p className="text-xs font-extrabold text-pink-800 mb-2">🤰 Conception Guide — Ritu Kala + Modern Science</p>
                    <p className="text-[11px] text-pink-700 leading-relaxed mb-3">{ayurvedaData.conceptionGuide.rituKala}</p>
                    <p className="text-[10px] font-bold text-pink-600 mb-1">Shukra Dhatu (Reproductive Tissue):</p>
                    <div className="space-y-1 mb-3">
                      {ayurvedaData.conceptionGuide.shukraDhatuTips?.map((tip, i) => (
                        <p key={i} className="text-[11px] text-pink-600">• {tip}</p>
                      ))}
                    </div>
                    <p className="text-[10px] font-bold text-pink-600 mb-1">Garbhadhana Diet (Pre-conception):</p>
                    <div className="space-y-1 mb-3">
                      {ayurvedaData.conceptionGuide.diet?.map((d, i) => (
                        <p key={i} className="text-[11px] text-pink-600">• {d}</p>
                      ))}
                    </div>
                    <p className="text-[10px] font-bold text-pink-600 mb-1">Modern Timing Science:</p>
                    <div className="space-y-1">
                      {ayurvedaData.conceptionGuide.timing?.map((t, i) => (
                        <p key={i} className="text-[11px] text-pink-600">• {t}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Seasonal (Ritu) Adjustment */}
                {ayurvedaData.seasonalAdjustment && (
                  <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4">
                    <p className="text-xs font-extrabold text-teal-800 mb-1">🍃 Seasonal Wisdom (Ritucharya)</p>
                    <p className="text-[10px] text-teal-600 mb-3">{ayurvedaData.seasonalAdjustment.currentRitu} — {ayurvedaData.seasonalAdjustment.dominantDosha} season</p>
                    <div className="space-y-1.5">
                      {ayurvedaData.seasonalAdjustment.adjustment?.map((adj, i) => (
                        <p key={i} className="text-[11px] text-teal-700 leading-relaxed">• {adj}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Modern Science Correlation */}
                {ayurvedaData.guidance?.modernCorrelation && (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                    <p className="text-xs font-extrabold text-blue-800 mb-2">🔬 Modern Science Says</p>
                    <p className="text-[11px] text-blue-700 leading-relaxed">{ayurvedaData.guidance.modernCorrelation}</p>
                  </div>
                )}

                {/* Research References */}
                {ayurvedaData.references?.length > 0 && (
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                    <p className="text-[10px] font-bold text-gray-500 mb-2">📚 Research References</p>
                    {ayurvedaData.references.map((ref, i) => (
                      <p key={i} className="text-[10px] text-gray-400 leading-relaxed">• {ref}</p>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <span className="text-5xl block mb-4">🌿</span>
                <p className="text-sm font-bold text-gray-700 mb-1">Complete your Dosha quiz first</p>
                <p className="text-xs text-gray-400">Your Ayurvedic insights will be personalized to your constitution</p>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Log Period Button — fixed above BottomNav */}
      <div
        className="fixed bottom-16 px-4 pb-2 z-20 w-full"
        style={{ maxWidth: 430, left: '50%', transform: 'translateX(-50%)' }}
      >
        <button
          onClick={() => setShowLogSheet(true)}
          className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-base py-4 rounded-2xl shadow-lg shadow-rose-200 active:scale-95 transition-transform flex items-center justify-center gap-2"
        >
          <span className="text-lg font-black">+</span>
          Log Period
        </button>
      </div>

      <BottomNav />

      {/* Log Period Bottom Sheet */}
      {showLogSheet && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          style={{ maxWidth: 430, left: '50%', transform: 'translateX(-50%)' }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowLogSheet(false)}
          />
          {/* Sheet */}
          <div className="relative bg-white rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto z-10">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h2 className="text-lg font-black text-gray-900">Log Period</h2>
              <button
                onClick={() => setShowLogSheet(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="px-5 py-4 space-y-5">
              {/* Start Date */}
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">Start Date</label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: 'Today', date: today },
                    { label: 'Yesterday', date: addDays(today, -1) },
                  ].map(opt => (
                    <button
                      key={opt.label}
                      onClick={() => setLogStartDate(opt.date)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                        isSameDay(logStartDate, opt.date)
                          ? 'bg-rose-500 text-white border-rose-500'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-rose-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                  <input
                    type="date"
                    value={customStartInput || logStartDate.toISOString().slice(0, 10)}
                    onChange={e => {
                      setCustomStartInput(e.target.value)
                      if (e.target.value) setLogStartDate(startOfDay(new Date(e.target.value)))
                    }}
                    className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-rose-400"
                  />
                </div>
              </div>

              {/* End Date */}
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">
                  End Date{' '}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: 'Today', date: today },
                    { label: 'Yesterday', date: addDays(today, -1) },
                  ].map(opt => (
                    <button
                      key={opt.label}
                      onClick={() => setLogEndDate(opt.date)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                        logEndDate && isSameDay(logEndDate, opt.date)
                          ? 'bg-rose-500 text-white border-rose-500'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-rose-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                  <input
                    type="date"
                    value={customEndInput || (logEndDate ? logEndDate.toISOString().slice(0, 10) : '')}
                    onChange={e => {
                      setCustomEndInput(e.target.value)
                      if (e.target.value) setLogEndDate(startOfDay(new Date(e.target.value)))
                      else setLogEndDate(null)
                    }}
                    className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-rose-400"
                  />
                </div>
              </div>

              {/* Flow Selector */}
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">Flow Intensity</label>
                <div className="grid grid-cols-2 gap-2">
                  {flowOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setLogFlow(opt.value)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all ${
                        logFlow === opt.value
                          ? 'border-rose-500 bg-rose-50'
                          : 'border-gray-100 bg-gray-50 hover:border-rose-200'
                      }`}
                    >
                      <span className="text-2xl">{opt.emoji}</span>
                      <span className="text-sm font-bold text-gray-800">{opt.label}</span>
                      <span className="text-xs text-gray-400 text-center leading-tight">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pain Level */}
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">Pain Level</label>
                <div className="flex gap-2 justify-between">
                  {painFaces.map((face, i) => (
                    <button
                      key={i}
                      onClick={() => setLogPain(i + 1)}
                      className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border-2 transition-all ${
                        logPain === i + 1
                          ? 'border-rose-500 bg-rose-50'
                          : 'border-gray-100 bg-gray-50 hover:border-rose-200'
                      }`}
                    >
                      <span className="text-xl">{face}</span>
                      <span className="text-xs text-gray-400">{i + 1}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mood */}
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">Mood</label>
                <div className="flex gap-2 flex-wrap">
                  {moodOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => toggleMood(opt.value)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                        logMoods.includes(opt.value)
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-purple-200'
                      }`}
                    >
                      <span>{opt.emoji}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Symptoms */}
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">Symptoms</label>
                <div className="grid grid-cols-3 gap-2">
                  {symptomOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => toggleSymptom(opt.value)}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all ${
                        logSymptoms.includes(opt.value)
                          ? 'border-rose-500 bg-rose-50'
                          : 'border-gray-100 bg-gray-50 hover:border-rose-200'
                      }`}
                    >
                      <span className="text-xl">{opt.emoji}</span>
                      <span className="text-xs font-semibold text-gray-700 text-center leading-tight">
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">Notes</label>
                <textarea
                  value={logNotes}
                  onChange={e => setLogNotes(e.target.value)}
                  placeholder="How are you feeling? Any additional details..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-rose-400 resize-none"
                />
              </div>

              {/* Save Button */}
              <button
                onClick={saveLog}
                disabled={saving}
                className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black text-base py-4 rounded-2xl shadow-lg shadow-rose-200 active:scale-95 transition-transform disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-2"
              >
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  '🌸 Save Period Log'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fertility Logging Bottom Sheet */}
      {showFertilitySheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ maxWidth: 430, left: '50%', transform: 'translateX(-50%)' }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowFertilitySheet(false)} />
          <div className="relative bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto z-10">
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h2 className="text-lg font-black text-gray-900">Log Fertility Data</h2>
              <button onClick={() => setShowFertilitySheet(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">✕</button>
            </div>
            <div className="px-5 py-4 space-y-5">
              {/* Date */}
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">Date</label>
                <input type="date" value={fertLogDate} onChange={e => setFertLogDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400" />
              </div>

              {/* BBT */}
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">🌡️ Basal Body Temperature (°C)</label>
                <input type="number" step="0.01" min="35" max="39" value={fertBBT} onChange={e => setFertBBT(e.target.value)}
                  placeholder="e.g. 36.45" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400" />
                <p className="text-[10px] text-gray-400 mt-1">Measure immediately upon waking, before any activity</p>
              </div>

              {/* Cervical Mucus */}
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">💧 Cervical Mucus</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'dry', label: 'Dry', emoji: '⚪', desc: 'No mucus' },
                    { value: 'sticky', label: 'Sticky', emoji: '🟡', desc: 'Tacky, crumbly' },
                    { value: 'creamy', label: 'Creamy', emoji: '🟠', desc: 'Lotion-like' },
                    { value: 'watery', label: 'Watery', emoji: '🔵', desc: 'Clear, thin' },
                    { value: 'eggWhite', label: 'Egg White', emoji: '🟢', desc: 'Stretchy, clear' },
                    { value: 'spotting', label: 'Spotting', emoji: '🔴', desc: 'Blood-tinged' },
                  ].map(opt => (
                    <button key={opt.value} onClick={() => setFertCM(fertCM === opt.value ? '' : opt.value)}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all ${
                        fertCM === opt.value ? 'border-purple-500 bg-purple-50' : 'border-gray-100 bg-gray-50'
                      }`}>
                      <span className="text-xl">{opt.emoji}</span>
                      <span className="text-[10px] font-bold text-gray-700">{opt.label}</span>
                      <span className="text-[9px] text-gray-400">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* LH Test */}
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">🧪 LH Test Strip</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 'negative', label: 'Negative', emoji: '⬜' },
                    { value: 'faint', label: 'Faint', emoji: '🟨' },
                    { value: 'positive', label: 'Positive', emoji: '🟧' },
                    { value: 'peak', label: 'Peak', emoji: '🟥' },
                  ].map(opt => (
                    <button key={opt.value} onClick={() => setFertLH(fertLH === opt.value ? '' : opt.value)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                        fertLH === opt.value ? 'border-purple-500 bg-purple-50' : 'border-gray-100 bg-gray-50'
                      }`}>
                      <span className="text-xl">{opt.emoji}</span>
                      <span className="text-[10px] font-bold text-gray-700">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Intercourse */}
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">💑 Intercourse</label>
                <button onClick={() => setFertIntercourse(!fertIntercourse)}
                  className={`px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
                    fertIntercourse ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 bg-gray-50 text-gray-600'
                  }`}>
                  {fertIntercourse ? '✓ Yes' : 'No'}
                </button>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">Notes</label>
                <textarea value={fertNotes} onChange={e => setFertNotes(e.target.value)} placeholder="Any observations..."
                  rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-400 resize-none" />
              </div>

              {/* Save */}
              <button onClick={saveFertilityLog} disabled={fertSaving}
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-black text-base py-4 rounded-2xl shadow-lg shadow-purple-200 active:scale-95 transition-transform disabled:opacity-60 mb-2">
                {fertSaving ? 'Saving...' : '🧬 Save Fertility Log'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
