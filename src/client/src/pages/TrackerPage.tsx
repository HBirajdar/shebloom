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

      // Fertile window from API
      if (fertileStart && fertileEnd) {
        const fs = startOfDay(new Date(fertileStart))
        const fe = startOfDay(new Date(fertileEnd))
        let d = new Date(fs)
        while (d <= fe) {
          markDay(new Date(d), 'fertile')
          d = addDays(d, 1)
        }
      } else if (typeof cycleDay === 'number') {
        // Estimate fertile window around ovulation
        const ovDay = cycleLength - 14
        const lastPeriodStart = addDays(today, -(cycleDay - 1))
        const ovDate = addDays(lastPeriodStart, ovDay - 1)
        for (let i = -2; i <= 2; i++) {
          markDay(addDays(ovDate, i), 'fertile')
        }
        markDay(ovDate, 'ovulation')
      }

      // Ovulation day from API
      if (ovulationDate) {
        markDay(startOfDay(new Date(ovulationDate)), 'ovulation')
      }
    }

    return markers
  }, [cycles, prediction, today])

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
    } else if (types.includes('ovulation')) {
      bg = 'bg-amber-400'
      text = 'text-white font-semibold'
      border = ''
    } else if (types.includes('fertile')) {
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
    return { count, avgCycle, avgDuration, lastPeriod, regularity: count > 1 ? 85 : 0 }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex flex-col" style={{ maxWidth: 430, margin: '0 auto' }}>
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
          {['calendar', 'insights'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-bold capitalize transition-all rounded-2xl ${
                tab === t
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-200'
                  : 'bg-white/60 text-gray-400'
              }`}
            >
              {t === 'calendar' ? '📅 ' : '💡 '}{t.charAt(0).toUpperCase() + t.slice(1)}
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
            {/* Month Navigation */}
            <div className="mx-5 mt-4 bg-white rounded-3xl shadow-lg overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between">
              <button
                onClick={prevMonth}
                className="w-9 h-9 flex items-center justify-center rounded-2xl bg-rose-50 text-rose-500 active:scale-95 transition-all"
              >
                ←
              </button>
              <span className="text-base font-extrabold text-gray-900">
                {MONTHS[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}
              </span>
              <button
                onClick={nextMonth}
                className="w-9 h-9 flex items-center justify-center rounded-2xl bg-rose-50 text-rose-500 active:scale-95 transition-all"
              >
                →
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="px-3 pb-4">
              {/* Day headers */}
              <div className="grid grid-cols-7 mb-1">
                {DAYS_SHORT.map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">
                    {d}
                  </div>
                ))}
              </div>
              {/* Date cells */}
              <div className="grid grid-cols-7 gap-1">
                {calendarCells.map((date, idx) => {
                  if (!date) return <div key={idx} />
                  const key = date.toISOString().slice(0, 10)
                  const types = calendarMarkers[key] || []
                  const { bg, text, border } = getDayCellStyle(date)
                  const isToday = isSameDay(date, today)
                  const hasSymptom = symptomDays.has(key)
                  const isOvulation = types.includes('ovulation')
                  return (
                    <div
                      key={idx}
                      className={`relative flex flex-col items-center justify-center rounded-full aspect-square text-sm font-medium transition-all ${bg} ${text} ${border}`}
                    >
                      <span className={isToday && !bg ? 'font-black text-gray-900' : ''}>
                        {date.getDate()}
                      </span>
                      {isOvulation && (
                        <span className="text-[8px] leading-none">⭐</span>
                      )}
                      {hasSymptom && !isOvulation && (
                        <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-rose-400" />
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 px-1">
                {[
                  { color: 'bg-rose-500', label: 'Period' },
                  { color: 'bg-emerald-100 border border-emerald-300', label: 'Fertile' },
                  { color: 'bg-amber-400', label: 'Ovulation ⭐' },
                  { color: 'bg-purple-100', label: 'PMS' },
                  { color: 'border-2 border-dashed border-rose-300', label: 'Predicted' },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1">
                    <div className={`w-3 h-3 rounded-sm flex-shrink-0 ${color}`} />
                    <span className="text-xs text-gray-500">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            </div>

            {/* Phase Timeline Bar */}
            <div className="bg-white mx-5 mt-3 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-700">Cycle Phase</span>
                {prediction?.cycleDay && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">
                    Day {prediction.cycleDay}
                  </span>
                )}
              </div>
              {/* Bar */}
              <div className="flex rounded-full overflow-hidden h-5 mb-2">
                {[
                  { label: 'M', days: phaseData.menstrual, color: 'bg-rose-400', phase: 'menstrual' },
                  { label: 'F', days: phaseData.follicular, color: 'bg-green-400', phase: 'follicular' },
                  { label: 'O', days: phaseData.ovulation, color: 'bg-purple-400', phase: 'ovulat' },
                  { label: 'L', days: phaseData.luteal, color: 'bg-amber-400', phase: 'luteal' },
                ].map(seg => {
                  const pct = (seg.days / phaseData.cycleLength) * 100
                  const isActive = currentPhase?.toLowerCase().includes(seg.phase.slice(0, 4))
                  return (
                    <div
                      key={seg.phase}
                      className={`${seg.color} flex items-center justify-center text-white text-xs font-bold transition-all ${isActive ? 'opacity-100' : 'opacity-40'}`}
                      style={{ width: `${pct}%` }}
                    >
                      {pct > 12 ? seg.label : ''}
                    </div>
                  )
                })}
              </div>
              <div className="flex text-xs text-gray-400">
                {[
                  { label: '🔴 Men', days: phaseData.menstrual },
                  { label: '🟡 Fol', days: phaseData.follicular },
                  { label: '🟢 Ov', days: phaseData.ovulation },
                  { label: '🟣 Lut', days: phaseData.luteal },
                ].map(s => (
                  <div
                    key={s.label}
                    className="text-center overflow-hidden"
                    style={{ width: `${(s.days / phaseData.cycleLength) * 100}%` }}
                  >
                    {s.days}d
                  </div>
                ))}
              </div>
            </div>

            {/* Cycle Stats Row */}
            <div className="mt-3 px-5">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {[
                  { icon: '📊', label: 'Avg Cycle', value: `${stats.avgCycle} days` },
                  { icon: '📅', label: 'Last Period', value: stats.lastPeriod },
                  { icon: '⏱️', label: 'Avg Duration', value: `${stats.avgDuration} days` },
                  { icon: '📈', label: 'Regularity', value: stats.count > 1 ? '85%' : 'N/A' },
                  { icon: '🔢', label: 'Tracked', value: `${stats.count} cycles` },
                ].map(card => (
                  <div
                    key={card.label}
                    className="bg-white rounded-2xl p-3 shadow-lg flex-shrink-0 min-w-[88px] text-center"
                  >
                    <div className="text-xl mb-1">{card.icon}</div>
                    <div className="text-sm font-bold text-gray-800 whitespace-nowrap">{card.value}</div>
                    <div className="text-xs text-gray-400 mt-0.5 whitespace-nowrap">{card.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Past Period History */}
            <div className="mt-3 px-5">
              <h3 className="text-sm font-bold text-gray-700 mb-2">Period History</h3>
              {sortedCycles.length === 0 ? (
                <div className="bg-white rounded-3xl p-6 text-center text-gray-400 text-sm shadow-lg">
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
                      <div key={cycle.id || i} className="bg-white rounded-3xl shadow-lg overflow-hidden">
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
        ) : (
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
            <div className="grid grid-cols-3 gap-2">
              {prediction?.fertileStart && prediction?.fertileEnd && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
                  <div className="text-xs text-emerald-600 font-semibold mb-1">Fertile</div>
                  <div className="text-base font-black text-emerald-700">
                    {formatMonthDay(new Date(prediction.fertileStart))}
                  </div>
                  <div className="text-xs text-emerald-500 mt-0.5">window open</div>
                </div>
              )}
              {prediction?.ovulationDate && (
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

            {/* Fertility Window Detail */}
            {prediction?.fertileStart && prediction?.fertileEnd && (
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

            {/* Ovulation Countdown */}
            {prediction?.ovulationDate && (
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

            {/* Hormone Levels */}
            <div className="bg-white rounded-3xl p-4 shadow-lg">
              <div className="text-sm font-bold text-gray-700 mb-3">Hormone Levels</div>
              <div className="flex gap-3">
                <HormoneBar label="Estrogen" value={phaseInfo.estrogen} color="bg-rose-400" />
                <HormoneBar label="Progesterone" value={phaseInfo.progesterone} color="bg-purple-400" />
                <HormoneBar label="LH" value={phaseInfo.lh} color="bg-amber-400" />
                <HormoneBar label="FSH" value={phaseInfo.fsh} color="bg-emerald-400" />
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">Approximate relative levels</p>
            </div>

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
          </div>
        )}
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
    </div>
  )
}
