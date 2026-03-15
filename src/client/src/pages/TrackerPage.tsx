import { Helmet } from 'react-helmet-async'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCycleStore } from '../stores/cycleStore'
import { cycleAPI } from '../services/api'
import { useSubscriptionStore } from '../stores/subscriptionStore'
import UpgradePrompt from '../components/UpgradePrompt'
import PremiumBadge from '../components/PremiumBadge'
import toast from 'react-hot-toast'
import BottomNav from '../components/BottomNav'
import { useTranslation } from 'react-i18next'

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
  const { t: tr } = useTranslation()
  const navigate = useNavigate()
  const cycleStore = useCycleStore()
  const goal = useCycleStore(s => s.goal)
  const showFertility = goal === 'fertility'
  const { isPremium, hasFeature, fetchSubscription } = useSubscriptionStore()

  useEffect(() => { fetchSubscription() }, [])

  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [cycles, setCycles] = useState<any[]>([])
  const [prediction, setPrediction] = useState<any>(null)
  const [showLogSheet, setShowLogSheet] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('calendar')

  // Log form state
  const [logStartDate, setLogStartDate] = useState(new Date())
  const [logEndDate, setLogEndDate] = useState<Date | null>(null)
  const [logFlow, setLogFlow] = useState('')
  const [logPain, setLogPain] = useState(0)
  const [logMoods, setLogMoods] = useState<string[]>([])
  const [logSymptoms, setLogSymptoms] = useState<string[]>([])
  const [logNotes, setLogNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedCycle, setExpandedCycle] = useState<any>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [editingCycle, setEditingCycle] = useState<any>(null)
  const [editFlow, setEditFlow] = useState('')
  const [editPain, setEditPain] = useState(0)
  const [editMoods, setEditMoods] = useState<string[]>([])
  const [editSymptoms, setEditSymptoms] = useState<string[]>([])
  const [editNotes, setEditNotes] = useState('')
  const [editStartDate, setEditStartDate] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [customStartInput, setCustomStartInput] = useState('')
  const [customEndInput, setCustomEndInput] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const dateStripRef = useRef<HTMLDivElement>(null)
  const [showFullCalendar, setShowFullCalendar] = useState(false)

  // Advanced fertility tracking state
  const [bbtHistory, setBbtHistory] = useState<any[]>([])
  const [cmHistory, setCmHistory] = useState<any[]>([])
  const [fertilityDaily, setFertilityDaily] = useState<any[]>([])
  const [showFertilitySheet, setShowFertilitySheet] = useState(false)
  const [fertLogDate, setFertLogDate] = useState(new Date().toISOString().slice(0, 10))
  const [fertBBT, setFertBBT] = useState('')
  const [fertCM, setFertCM] = useState('')
  const [fertLH, setFertLH] = useState('')
  const [fertIntercourse, setFertIntercourse] = useState(false)
  const [fertNotes, setFertNotes] = useState('')
  const [fertSaving, setFertSaving] = useState(false)

  // Ayurvedic insights state
  const [ayurvedaData, setAyurvedaData] = useState<any>(null)
  const [ayurvedaLoading, setAyurvedaLoading] = useState(false)
  const [showMedWarnings, setShowMedWarnings] = useState(false)
  const [showRefLibrary, setShowRefLibrary] = useState(false)
  const [expandedHerb, setExpandedHerb] = useState<string | null>(null)
  const [showMentalHealth, setShowMentalHealth] = useState(false)
  const [showPredictionInfo, setShowPredictionInfo] = useState(false)

  // Import past periods state
  const [showImportSheet, setShowImportSheet] = useState(false)
  const [importPeriods, setImportPeriods] = useState<{ startDate: string; endDate: string; errors: { startDate?: string; endDate?: string } }[]>([{ startDate: '', endDate: '', errors: {} }])
  const [importSaving, setImportSaving] = useState(false)
  const [importDismissed, setImportDismissed] = useState(() => localStorage.getItem('sb_import_dismissed') === '1')

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const twelveMonthsAgoStr = useMemo(() => new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10), [])

  const updateImportPeriod = (idx: number, field: 'startDate' | 'endDate', value: string) => {
    setImportPeriods(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value, errors: { ...p.errors, [field]: undefined } } : p))
  }
  const removeImportPeriod = (idx: number) => {
    setImportPeriods(prev => prev.length === 1 ? [{ startDate: '', endDate: '', errors: {} }] : prev.filter((_, i) => i !== idx))
  }
  const addImportPeriod = () => {
    if (importPeriods.length < 3) setImportPeriods(prev => [...prev, { startDate: '', endDate: '', errors: {} }])
  }

  const validateImportPeriods = (): boolean => {
    const filled = importPeriods.filter(p => p.startDate)
    if (filled.length === 0) { toast.error('Add at least one period'); return false }

    let valid = true
    const updated = importPeriods.map(p => {
      const errors: { startDate?: string; endDate?: string } = {}
      if (!p.startDate && !p.endDate) return { ...p, errors }
      if (!p.startDate) { errors.startDate = 'Start date is required'; valid = false }
      else {
        if (p.startDate > todayStr) { errors.startDate = 'Cannot be in the future'; valid = false }
        if (p.startDate < twelveMonthsAgoStr) { errors.startDate = 'Must be within last 12 months'; valid = false }
      }
      if (p.endDate) {
        if (p.endDate > todayStr) { errors.endDate = 'Cannot be in the future'; valid = false }
        if (p.startDate && p.endDate <= p.startDate) { errors.endDate = 'Must be after start date'; valid = false }
      }
      return { ...p, errors }
    })

    // Overlap check
    const filledEntries = updated.filter(p => p.startDate)
    for (let i = 0; i < filledEntries.length; i++) {
      const aS = new Date(filledEntries[i].startDate).getTime()
      const aE = filledEntries[i].endDate ? new Date(filledEntries[i].endDate).getTime() : aS + 5 * 86400000
      for (let j = i + 1; j < filledEntries.length; j++) {
        const bS = new Date(filledEntries[j].startDate).getTime()
        const bE = filledEntries[j].endDate ? new Date(filledEntries[j].endDate).getTime() : bS + 5 * 86400000
        if (aS <= bE && bS <= aE) {
          filledEntries[i].errors.startDate = 'Overlaps with another period'
          filledEntries[j].errors.startDate = 'Overlaps with another period'
          valid = false
        }
      }
    }

    // Duplicate start dates
    const starts = filledEntries.map(p => p.startDate)
    starts.forEach((d, i) => {
      if (starts.indexOf(d) !== i) {
        filledEntries.find(p => p.startDate === d)!.errors.startDate = 'Duplicate start date'
        valid = false
      }
    })

    setPastPeriods(updated)
    return valid
  }

  // Alias for validation (uses same state)
  const setPastPeriods = setImportPeriods

  const saveImportPeriods = async () => {
    if (!validateImportPeriods()) return
    setImportSaving(true)
    const filled = importPeriods.filter(p => p.startDate)
    const sorted = [...filled].sort((a, b) => a.startDate.localeCompare(b.startDate))
    let saved = 0
    for (const p of sorted) {
      try {
        await cycleAPI.log({
          startDate: new Date(p.startDate).toISOString(),
          endDate: p.endDate ? new Date(p.endDate).toISOString() : new Date(new Date(p.startDate).getTime() + 4 * 86400000).toISOString(),
          flow: 'medium',
        })
        saved++
      } catch {}
    }
    if (saved > 0) {
      toast.success(`${saved} period${saved > 1 ? 's' : ''} imported!`)
      await refreshCycleData()
    } else {
      toast.error('Could not save — periods may already exist')
    }
    setImportSaving(false)
    setShowImportSheet(false)
    setImportPeriods([{ startDate: '', endDate: '', errors: {} }])
  }

  const dismissImportBanner = () => {
    setImportDismissed(true)
    localStorage.setItem('sb_import_dismissed', '1')
  }

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
        toast.error('Failed to load cycle data. Pull down to retry.');
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  // Fetch fertility data when fertility tab is active
  useEffect(() => {
    if (tab !== 'fertility') return
    let active = true
    Promise.all([
      cycleAPI.getBBT(90).catch(() => ({ data: { data: [] } })),
      cycleAPI.getCervicalMucus(90).catch(() => ({ data: { data: [] } })),
      cycleAPI.getFertilityDaily(90).catch(() => ({ data: { data: [] } })),
    ]).then(([bbt, cm, daily]) => {
      if (!active) return
      setBbtHistory(bbt?.data?.data || [])
      setCmHistory(cm?.data?.data || [])
      setFertilityDaily(daily?.data?.data || [])
    })
    return () => { active = false }
  }, [tab])

  // Fetch Ayurvedic insights when tab is active
  const [ayurvedaError, setAyurvedaError] = useState<string | null>(null)
  useEffect(() => {
    if (tab !== 'ayurveda') return
    let active = true
    setAyurvedaLoading(true)
    setAyurvedaError(null)
    cycleAPI.getAyurvedicInsights()
      .then(r => { if (active) setAyurvedaData(r?.data?.data || null) })
      .catch((err: any) => {
        if (!active) return
        if (err?.response?.status === 403 && err?.response?.data?.upgrade) {
          setAyurvedaError('upgrade')
        } else {
          setAyurvedaError('error')
          toast.error('Failed to load Ayurvedic insights. Please try again.')
        }
      })
      .finally(() => { if (active) setAyurvedaLoading(false) })
    return () => { active = false }
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

    // Use local date to avoid UTC timezone shift (e.g., IST 1AM → previous day in UTC)
    const toLocalKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const markDay = (date: Date, type: string) => {
      const key = toLocalKey(date)
      if (!markers[key]) markers[key] = []
      if (!markers[key].includes(type)) markers[key].push(type)
    }

    // Mark logged period days — use periodLength (or 5) as the max span
    // endDate from DB can be unreliable (imported before cap fix), so always sanity-check
    cycles.forEach(cycle => {
      if (!cycle.startDate) return
      const start = startOfDay(new Date(cycle.startDate))
      const maxDays = Math.min(cycle.periodLength || 5, 10) // never more than 10 days
      const endFromData = cycle.endDate ? startOfDay(new Date(cycle.endDate)) : null
      const endFromLength = addDays(start, maxDays - 1)
      // Use endDate only if it's reasonable (within maxDays), otherwise fall back to periodLength
      const end = endFromData && endFromData <= endFromLength ? endFromData : endFromLength
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

  // Symptom days from cycles (same sanity-check as calendarMarkers)
  const symptomDays = useMemo(() => {
    const days = new Set<string>()
    cycles.forEach(c => {
      if (c.symptoms && c.symptoms.length > 0 && c.startDate) {
        const start = startOfDay(new Date(c.startDate))
        const maxDays = Math.min(c.periodLength || 5, 10)
        const endFromData = c.endDate ? startOfDay(new Date(c.endDate)) : null
        const endFromLength = addDays(start, maxDays - 1)
        const end = endFromData && endFromData <= endFromLength ? endFromData : endFromLength
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
      toast.success(tr('tracker.periodLogged') + ' 🌸')
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
      await refreshCycleData()
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

  const refreshCycleData = async () => {
    try {
      const [predRes, listRes] = await Promise.all([cycleAPI.predict(), cycleAPI.list()])
      setPrediction(predRes?.data?.data || null)
      setCycles(listRes?.data?.data || [])
    } catch {}
  }

  const handleDeleteCycle = async (cycleId: string) => {
    try {
      await cycleAPI.delete(cycleId)
      toast.success(tr('tracker.periodDeleted'))
      setDeleteConfirm(null)
      setExpandedCycle(null)
      await refreshCycleData()
    } catch {
      toast.error('Failed to delete entry')
    }
  }

  const openEditCycle = (cycle: any) => {
    setEditingCycle(cycle)
    setEditFlow(cycle.flow || '')
    setEditPain(cycle.painLevel || 0)
    setEditMoods(cycle.mood || [])
    setEditSymptoms(cycle.symptoms || [])
    setEditNotes(cycle.notes || '')
    setEditStartDate(cycle.startDate ? new Date(cycle.startDate).toISOString().slice(0, 10) : '')
    setEditEndDate(cycle.endDate ? new Date(cycle.endDate).toISOString().slice(0, 10) : '')
  }

  const handleUpdateCycle = async () => {
    if (!editingCycle) return
    setEditSaving(true)
    try {
      await cycleAPI.update(editingCycle.id, {
        startDate: new Date(editStartDate).toISOString(),
        endDate: editEndDate ? new Date(editEndDate).toISOString() : null,
        flow: editFlow || undefined,
        painLevel: editPain,
        mood: editMoods,
        symptoms: editSymptoms,
        notes: editNotes,
      })
      toast.success(tr('tracker.periodUpdated'))
      setEditingCycle(null)
      await refreshCycleData()
    } catch {
      toast.error('Failed to update entry')
    }
    setEditSaving(false)
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
      <Helmet>
        <title>Period Tracker | VedaClue</title>
        <meta name="description" content="Log your period, track symptoms, and get personalized cycle predictions" />
      </Helmet>
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
              {t.icon} {t.key === 'calendar' ? tr('tracker.calendar') : t.key === 'insights' ? tr('tracker.insights') : t.key.charAt(0).toUpperCase() + t.key.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Main scrollable content */}
      <div className="flex-1 overflow-y-auto pb-40">
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
                        {prediction.daysUntilPeriod === 0 ? '🩸 Period due today' : prediction.daysUntilPeriod < 0 ? `🩸 ${Math.abs(prediction.daysUntilPeriod)}d late` : `🩸 in ${prediction.daysUntilPeriod} days`}
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

                {/* Prediction Accuracy Notice */}
                {cycles.length >= 3 && prediction?.confidence?.score != null && (
                  <div style={{ borderRadius: 8, padding: '6px 12px', margin: '8px 12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                      {prediction.confidence.score >= 70 ? 'High confidence' : prediction.confidence.score >= 50 ? 'Medium confidence' : 'Low confidence'}
                    </span>
                    <button
                      onClick={() => setShowPredictionInfo(true)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'rgba(255,255,255,0.4)', padding: 0, lineHeight: 1 }}
                    >ⓘ</button>
                  </div>
                )}
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

            {/* ═══ Premium Cycle Timeline ═══ */}
            <div className="mx-4 mt-3 rounded-3xl overflow-hidden shadow-lg" style={{ background: 'linear-gradient(135deg, #1a1028 0%, #2a1631 50%, #1e1235 100%)' }}>
              <div className="px-5 pt-5 pb-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-white tracking-wide">{tr('tracker.cycleTimeline')}</h3>
                    <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {prediction?.cycleLength || 28}-day cycle
                    </p>
                  </div>
                  {prediction?.cycleDay && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl" style={{ backgroundColor: getPhaseForDay(prediction.cycleDay).color + '25' }}>
                      <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: getPhaseForDay(prediction.cycleDay).color }} />
                      <span className="text-xs font-black" style={{ color: getPhaseForDay(prediction.cycleDay).color }}>
                        Day {prediction.cycleDay}
                      </span>
                    </div>
                  )}
                </div>

                {/* Timeline Track */}
                <div className="relative mb-3">
                  {/* Background track */}
                  <div className="flex rounded-2xl overflow-hidden h-10 bg-white/5 backdrop-blur-sm border border-white/10">
                    {(() => {
                      const phases = [
                        { label: 'Menstrual', shortLabel: 'Period', days: phaseData.menstrual, color: PHASE_COLORS.menstrual, emoji: '🩸', phase: 'menstrual' },
                        { label: 'Follicular', shortLabel: 'Follicular', days: phaseData.follicular, color: PHASE_COLORS.follicular, emoji: '🌱', phase: 'follicular' },
                        ...(showFertility ? [{ label: 'Ovulation', shortLabel: 'Ovulation', days: phaseData.ovulation, color: PHASE_COLORS.ovulation, emoji: '✨', phase: 'ovulat' }] : []),
                        { label: 'Luteal', shortLabel: 'Luteal', days: showFertility ? phaseData.luteal : phaseData.ovulation + phaseData.luteal, color: PHASE_COLORS.luteal, emoji: '🌙', phase: 'luteal' },
                      ]
                      const totalDays = phases.reduce((sum, p) => sum + p.days, 0)
                      return phases.map((seg) => {
                        const pct = (seg.days / totalDays) * 100
                        const isActive = currentPhase?.toLowerCase().includes(seg.phase.slice(0, 4))
                        return (
                          <div
                            key={seg.phase}
                            className="relative flex items-center justify-center transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              background: isActive
                                ? `linear-gradient(135deg, ${seg.color}CC, ${seg.color}88)`
                                : `${seg.color}18`,
                              borderRight: '1px solid rgba(255,255,255,0.06)',
                            }}
                          >
                            {isActive && (
                              <div className="absolute inset-0 animate-pulse" style={{
                                background: `linear-gradient(135deg, ${seg.color}40, transparent)`,
                                borderRadius: 'inherit',
                              }} />
                            )}
                            <div className="relative flex flex-col items-center">
                              {pct > 15 && <span className="text-[10px]">{seg.emoji}</span>}
                              {pct > 20 && (
                                <span className="text-[8px] font-bold leading-none mt-0.5" style={{
                                  color: isActive ? 'white' : 'rgba(255,255,255,0.3)',
                                }}>
                                  {seg.shortLabel}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })
                    })()}
                  </div>

                  {/* Progress marker — current day position */}
                  {prediction?.cycleDay > 0 && (
                    <div
                      className="absolute top-0 h-10 flex items-center transition-all duration-700"
                      style={{
                        left: `${((prediction.cycleDay - 0.5) / (prediction?.cycleLength || 28)) * 100}%`,
                        transform: 'translateX(-50%)',
                        zIndex: 10,
                      }}
                    >
                      <div className="relative">
                        <div className="w-4 h-4 rounded-full bg-white shadow-lg shadow-black/30 border-2" style={{ borderColor: getPhaseForDay(prediction.cycleDay).color }} />
                        <div className="absolute inset-0 w-4 h-4 rounded-full animate-ping opacity-30" style={{ backgroundColor: getPhaseForDay(prediction.cycleDay).color }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Phase day counts row */}
                <div className="flex mb-4">
                  {(() => {
                    const phases = [
                      { label: 'Menstrual', days: phaseData.menstrual, color: PHASE_COLORS.menstrual },
                      { label: 'Follicular', days: phaseData.follicular, color: PHASE_COLORS.follicular },
                      ...(showFertility ? [{ label: 'Ovulation', days: phaseData.ovulation, color: PHASE_COLORS.ovulation }] : []),
                      { label: 'Luteal', days: showFertility ? phaseData.luteal : phaseData.ovulation + phaseData.luteal, color: PHASE_COLORS.luteal },
                    ]
                    const totalDays = phases.reduce((sum, p) => sum + p.days, 0)
                    return phases.map(s => (
                      <div
                        key={s.label}
                        className="text-center overflow-hidden"
                        style={{ width: `${(s.days / totalDays) * 100}%` }}
                      >
                        <span className="text-[10px] font-bold" style={{ color: s.color }}>
                          {s.days}d
                        </span>
                      </div>
                    ))
                  })()}
                </div>

                {/* Current Phase Detail Card */}
                {prediction?.cycleDay && (
                  <div className="rounded-2xl p-3.5 border border-white/10" style={{
                    background: `linear-gradient(135deg, ${getPhaseForDay(prediction.cycleDay).color}15, ${getPhaseForDay(prediction.cycleDay).color}08)`,
                  }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{
                        backgroundColor: getPhaseForDay(prediction.cycleDay).color + '25',
                      }}>
                        {getPhaseForDay(prediction.cycleDay).emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-extrabold text-white">{getPhaseForDay(prediction.cycleDay).name} Phase</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                          Day {prediction.cycleDay} of {prediction?.cycleLength || 28} · {typeof prediction?.daysUntilPeriod === 'number'
                            ? prediction.daysUntilPeriod === 0 ? 'Period due today' : prediction.daysUntilPeriod < 0 ? `${Math.abs(prediction.daysUntilPeriod)}d late` : `${prediction.daysUntilPeriod}d until next period`
                            : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black" style={{ color: getPhaseForDay(prediction.cycleDay).color }}>
                          {Math.round((prediction.cycleDay / (prediction?.cycleLength || 28)) * 100)}%
                        </div>
                        <div className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>complete</div>
                      </div>
                    </div>
                  </div>
                )}
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

            {/* Import Past Periods Prompt — shown once when < 2 cycles */}
            {!importDismissed && cycles.length < 2 && !loading && (
              <div className="mt-3 px-4">
                <div className="bg-gradient-to-r from-rose-50 to-purple-50 rounded-2xl p-4 border border-rose-100 shadow-sm relative">
                  <button onClick={dismissImportBanner} className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-white/80 flex items-center justify-center text-gray-400 hover:text-gray-600 text-xs">✕</button>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🌸</span>
                    <div className="flex-1">
                      <p className="text-sm font-extrabold text-gray-800">Get instant predictions</p>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        {tr('tracker.importDesc')}
                      </p>
                      <button
                        onClick={() => setShowImportSheet(true)}
                        className="mt-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold px-4 py-2 rounded-xl active:scale-95 transition-transform shadow-sm"
                      >
                        + {tr('tracker.importPastPeriods')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Past Period History */}
            <div className="mt-3 px-4">
              <h3 className="text-sm font-bold text-gray-700 mb-2">{tr('tracker.periodHistory')}</h3>
              {sortedCycles.length === 0 ? (
                <div className="bg-white rounded-2xl p-6 text-center text-gray-400 text-sm shadow-sm border border-gray-100">
                  {tr('tracker.noPeriods')}
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
                            {/* Edit & Delete actions */}
                            <div className="flex gap-2 pt-2 border-t border-gray-100 mt-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); openEditCycle(cycle) }}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-indigo-50 text-indigo-600 text-xs font-semibold hover:bg-indigo-100 transition"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                {tr('common.edit')}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleteConfirm(cycle.id) }}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-50 text-red-500 text-xs font-semibold hover:bg-red-100 transition"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                {tr('common.delete')}
                              </button>
                            </div>
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
                    {tr('tracker.currentPhase')}
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
                <div className={`rounded-2xl p-3 border ${prediction.daysUntilPeriod < 0 ? 'bg-red-50 border-red-200' : 'bg-rose-50 border-rose-200'}`}>
                  <div className={`text-xs font-semibold mb-1 ${prediction.daysUntilPeriod < 0 ? 'text-red-500' : 'text-rose-500'}`}>{prediction.daysUntilPeriod < 0 ? 'Period Late' : 'Next Period'}</div>
                  <div className={`text-base font-black ${prediction.daysUntilPeriod < 0 ? 'text-red-600' : 'text-rose-600'}`}>
                    {prediction.daysUntilPeriod === 0 ? 'Today' : prediction.daysUntilPeriod < 0 ? `${Math.abs(prediction.daysUntilPeriod)}d` : `${prediction.daysUntilPeriod}d`}
                  </div>
                  <div className={`text-xs mt-0.5 ${prediction.daysUntilPeriod < 0 ? 'text-red-400' : 'text-rose-400'}`}>
                    {prediction.daysUntilPeriod === 0 ? 'due now' : prediction.daysUntilPeriod < 0 ? 'late' : 'away'}
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
                  Your 6-day fertile window based on predicted ovulation
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

            {/* Next Period Countdown + Late Period Guidance */}
            {typeof prediction?.daysUntilPeriod === 'number' && (() => {
              const daysLate = prediction.daysUntilPeriod <= 0 ? Math.abs(prediction.daysUntilPeriod) : 0;
              const isLate = prediction.daysUntilPeriod < 0;
              const isDueToday = prediction.daysUntilPeriod === 0;
              const dosha = ayurvedaData?.dosha || localStorage.getItem('sb_dosha') || '';

              return (
                <>
                  <div className={`rounded-2xl p-4 border ${isLate ? 'bg-red-50 border-red-200' : isDueToday ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-200'}`}>
                    <div className="text-sm font-bold mb-1" style={{ color: isLate ? '#DC2626' : isDueToday ? '#D97706' : '#E11D48' }}>
                      {isLate ? `Period is ${daysLate} Day${daysLate !== 1 ? 's' : ''} Late` : isDueToday ? 'Period Due Today' : 'Next Period'}
                    </div>
                    <div className="text-sm" style={{ color: isLate ? '#EF4444' : isDueToday ? '#F59E0B' : '#F43F5E' }}>
                      {isLate
                        ? `Your period was expected ${daysLate} day${daysLate !== 1 ? 's' : ''} ago. ${daysLate < 7 ? "A few days' delay is normal." : 'See guidance below.'}`
                        : isDueToday
                        ? 'Your period is expected to start today.'
                        : `Period in ${prediction.daysUntilPeriod} day${prediction.daysUntilPeriod !== 1 ? 's' : ''}`}
                    </div>
                  </div>

                  {/* Late Period — Ayurvedic Guidance Card */}
                  {daysLate > 7 && (
                    <div className="bg-white rounded-3xl p-4 shadow-lg border border-rose-100">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">{'\u{1F33F}'}</span>
                        <p className="text-sm font-extrabold text-gray-800">
                          {dosha ? `${dosha} Dosha — Late Period Remedies` : 'Ayurvedic Remedies for Delayed Period'}
                        </p>
                      </div>

                      {/* Quick causes */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {['Stress', 'Sleep issues', 'Diet changes', 'Weight shift', ...(daysLate >= 7 ? ['PCOS', 'Thyroid', 'Pregnancy'] : [])].map(c => (
                          <span key={c} className="text-[9px] font-semibold bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full">{c}</span>
                        ))}
                      </div>

                      {/* Remedies based on dosha — verified from Charaka Samhita, Sushruta Samhita, Ashtanga Hridaya */}
                      {dosha === 'Vata' && (
                        <div className="space-y-2">
                          <div className="bg-purple-50 rounded-xl p-3">
                            <p className="text-[10px] font-bold text-purple-700 mb-1">{'\u{1F32C}\u{FE0F}'} Vata Balance \u2014 Warm & Ground (Apana Vata)</p>
                            <p className="text-[9px] text-purple-400 mb-1.5 italic">Vata governs Apana Vayu \u2014 downward flow. Delay = Apana Vata blockage [Charaka Chi. 30]</p>
                            <div className="space-y-0.5">
                              {['Shatavari (Asparagus racemosus) \u2014 primary Artavajanana herb', 'Ashwagandha \u2014 reduces cortisol, calms HPA axis', 'Dashmool Kwath \u2014 10-root decoction for Apana Vata', 'Warm sesame oil Abhyanga daily [Ashtanga Hridaya]', 'Ginger-jaggery water morning & evening', 'Yoga: Baddha Konasana, Viparita Karani, Supta Virasana', 'Sleep by 10 PM \u2014 Dinacharya routine is critical for Vata'].map(r => (
                                <p key={r} className="text-[10px] text-gray-600 flex items-start gap-1"><span className="text-purple-500 mt-0.5">{'\u2713'}</span>{r}</p>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      {dosha === 'Pitta' && (
                        <div className="space-y-2">
                          <div className="bg-orange-50 rounded-xl p-3">
                            <p className="text-[10px] font-bold text-orange-700 mb-1">{'\u{1F525}'} Pitta Balance \u2014 Cool & Soothe</p>
                            <p className="text-[9px] text-orange-400 mb-1.5 italic">Pitta excess heats Rakta dhatu. Cooling herbs restore balance [Sushruta]</p>
                            <div className="space-y-0.5">
                              {['Ashoka bark (Saraca asoca) \u2014 #1 uterine tonic [Bhavaprakasha]', 'Shatavari \u2014 cooling phytoestrogen support', 'Guduchi (Tinospora cordifolia) \u2014 Rasayana, immune balance', 'Gulkand (rose petal preserve) after meals', 'Cooling foods: coconut water, pomegranate, cucumber', 'Sheetali & Chandrabhedana pranayama (cooling breath)', 'Avoid spicy food, excess sun & intense exercise'].map(r => (
                                <p key={r} className="text-[10px] text-gray-600 flex items-start gap-1"><span className="text-orange-500 mt-0.5">{'\u2713'}</span>{r}</p>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      {dosha === 'Kapha' && (
                        <div className="space-y-2">
                          <div className="bg-emerald-50 rounded-xl p-3">
                            <p className="text-[10px] font-bold text-emerald-700 mb-1">{'\u{1F33F}'} Kapha Balance \u2014 Stimulate & Activate</p>
                            <p className="text-[9px] text-emerald-400 mb-1.5 italic">Kapha blocks Artava Vaha Srotas. Stimulate Agni & movement [Charaka]</p>
                            <div className="space-y-0.5">
                              {['Lodhra (Symplocos racemosa) \u2014 classical uterine astringent', 'Manjistha (Rubia cordifolia) \u2014 Rakta Shodhaka, blood purifier', 'Triphala \u2014 detox, activates Agni & hormone regulation', 'Honey + warm water every morning (Kapha reducing)', 'Light, spiced meals: ginger, black pepper, fenugreek', 'Vigorous exercise: brisk walk, Surya Namaskar before 6 AM', 'Kapalbhati & Bhastrika pranayama daily'].map(r => (
                                <p key={r} className="text-[10px] text-gray-600 flex items-start gap-1"><span className="text-emerald-500 mt-0.5">{'\u2713'}</span>{r}</p>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      {!dosha && (
                        <div className="space-y-2">
                          <div className="bg-rose-50 rounded-xl p-3">
                            <p className="text-[10px] font-bold text-rose-700 mb-1">{'\u{1F33F}'} General Ayurvedic Remedies [Charaka Samhita]</p>
                            <div className="space-y-0.5">
                              {['Shatavari (Asparagus racemosus) \u2014 primary Artavajanana herb', 'Ashoka bark (Saraca asoca) \u2014 uterine tonic [Bhavaprakasha]', 'Warm ginger-jaggery water twice daily', 'Sesame seeds (Tila) with honey \u2014 1 tsp daily', 'Fennel seed water \u2014 gentle, safe uterine tonic', 'Yoga: Baddha Konasana, Malasana, Viparita Karani', 'Warm oil Abhyanga + Dinacharya (regular routine)'].map(r => (
                                <p key={r} className="text-[10px] text-gray-600 flex items-start gap-1"><span className="text-rose-500 mt-0.5">{'\u2713'}</span>{r}</p>
                              ))}
                            </div>
                          </div>
                          <button onClick={() => navigate('/dosha-assessment')} className="w-full py-2 bg-purple-50 border border-purple-200 text-purple-600 rounded-xl text-[10px] font-bold active:scale-95 transition-transform">
                            {'\u2728'} Take Dosha Assessment for Personalized Remedies
                          </button>
                        </div>
                      )}

                      {/* CRITICAL: Pregnancy + Herb Safety Warning */}
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3 mt-2">
                        <p className="text-[10px] font-bold text-red-700 mb-1">{'\u{26A0}\u{FE0F}'} Safety First</p>
                        <p className="text-[10px] text-red-600 leading-relaxed">If pregnancy is possible, take a test BEFORE any herbal remedy. Herbs like Ashoka, Guggulu & Aloe vera stimulate uterine contractions. On prescription medication? Consult your doctor first.</p>
                      </div>

                      {/* Doctor warning — always show, expanded for 7+ days */}
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-2">
                        <p className="text-[10px] font-bold text-amber-700">{'\u{26A0}\u{FE0F}'} When to See a Doctor</p>
                        <div className="space-y-0.5 mt-1">
                          {[
                            'Take a pregnancy test if sexually active',
                            ...(daysLate >= 7 ? ['Period delayed more than 2 weeks', 'Unusual pain, discharge, or spotting', 'History of PCOS or thyroid issues', 'Previously regular cycles becoming irregular'] : ['Delay persists beyond 7 days']),
                          ].map(w => (
                            <p key={w} className="text-[10px] text-amber-600 flex items-start gap-1"><span>{'\u2022'}</span>{w}</p>
                          ))}
                        </div>
                      </div>

                      {/* Medical disclaimer */}
                      <p className="text-[8px] text-gray-400 text-center leading-relaxed mt-2">
                        For educational purposes only. Not medical advice. Refs: Charaka Samhita Chi. 30, Sushruta Samhita Sha. 2/29, Ashtanga Hridaya, Bhavaprakasha Nighantu.
                      </p>

                      {/* Quick actions */}
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => { setShowLogSheet(true); }} className="flex-1 py-2 bg-rose-500 text-white rounded-xl text-[10px] font-bold active:scale-95 transition-transform">
                          {'\u{1F4C5}'} Log Period Now
                        </button>
                        <button onClick={() => navigate('/doctors')} className="flex-1 py-2 bg-white border border-rose-200 text-rose-600 rounded-xl text-[10px] font-bold active:scale-95 transition-transform">
                          {'\u{1F469}\u200D\u2695\u{FE0F}'} Book Consultation
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {/* Hormone Levels — period users see Estrogen + Progesterone only; fertility users see all 4 */}
            <div className="bg-white rounded-3xl p-4 shadow-lg">
              <div className="text-sm font-bold text-gray-700 mb-3">{showFertility ? 'Hormone Levels' : 'Your Hormones'}</div>
              <div className="flex gap-3">
                <HormoneBar label="Estrogen" value={prediction?.hormones?.estrogen ?? phaseInfo.estrogen} color="bg-rose-400" />
                <HormoneBar label="Progesterone" value={prediction?.hormones?.progesterone ?? phaseInfo.progesterone} color="bg-purple-400" />
                {showFertility && <HormoneBar label="LH" value={prediction?.hormones?.lh ?? phaseInfo.lh} color="bg-amber-400" />}
                {showFertility && <HormoneBar label="FSH" value={prediction?.hormones?.fsh ?? phaseInfo.fsh} color="bg-emerald-400" />}
              </div>
              <p className="text-[10px] text-gray-500 text-center mt-2 italic">Estimated patterns based on cycle phase, not measured levels</p>
            </div>

            {/* Confidence & Prediction Quality */}
            {prediction?.confidence && cycles.length >= 3 && (
              <div className="bg-white rounded-3xl p-4 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-700">Prediction Confidence</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    prediction.confidence.score >= 70 ? 'bg-emerald-100 text-emerald-700' :
                    prediction.confidence.score >= 50 ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{prediction.confidence.score >= 70 ? 'High' : prediction.confidence.score >= 50 ? 'Medium' : 'Low'}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                  <div className={`h-2 rounded-full transition-all ${
                    prediction.confidence.score >= 70 ? 'bg-emerald-500' :
                    prediction.confidence.score >= 50 ? 'bg-amber-500' : 'bg-gray-400'
                  }`} style={{ width: `${prediction.confidence.score}%` }} />
                </div>
                <div className="space-y-1">
                  {prediction.confidence.factors?.map((f: any, i: number) => (
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
                    {prediction.biomarkerSignals.map((s: any, i: number) => (
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

            {/* Import Past Periods — always accessible in Insights */}
            <div className="rounded-2xl p-4 border border-gray-100 bg-white shadow-sm">
              <div className="flex items-start gap-3">
                <span className="text-2xl">📥</span>
                <div className="flex-1">
                  <p className="text-sm font-extrabold text-gray-800">{tr('tracker.importPastPeriods')}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Add previous period dates to improve prediction accuracy. The more data, the better your forecasts.
                  </p>
                  <button
                    onClick={() => setShowImportSheet(true)}
                    className="mt-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold px-4 py-2 rounded-xl active:scale-95 transition-transform shadow-sm"
                  >
                    + Add Past Periods
                  </button>
                </div>
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
                  <p className="text-[10px] text-gray-400 mt-1">Per Wilcox et al. (1995 NEJM) day-specific rates</p>
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

            {/* BBT Chart [PREMIUM] */}
            {!isPremium ? (
              <UpgradePrompt feature="cycle:bbt" title="BBT Temperature Tracking" description="Track your basal body temperature to pinpoint ovulation with precision." />
            ) : (
            <div className="bg-white rounded-3xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-gray-700">🌡️ BBT Chart <PremiumBadge /></span>
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
                  <p className="text-[10px] text-gray-300 mt-1">BBT can retrospectively confirm ovulation occurred (sustained thermal shift)</p>
                </div>
              )}
            </div>
            )}

            {/* Cervical Mucus Pattern [PREMIUM] */}
            {!isPremium ? (
              <UpgradePrompt feature="cycle:cervical-mucus" title="Cervical Mucus Tracking" description="Track cervical mucus patterns to identify your most fertile days." />
            ) : (
            <div className="bg-white rounded-3xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-gray-700">💧 Cervical Mucus <PremiumBadge /></span>
                <span className="text-[10px] text-gray-400">{cmHistory.length} logs</span>
              </div>
              {cmHistory.length > 0 ? (
                <div className="flex items-end gap-1 h-16">
                  {cmHistory.slice(-30).map((entry, i) => {
                    const cmColors: Record<string, string> = { dry: 'bg-gray-200', sticky: 'bg-yellow-300', creamy: 'bg-amber-200', watery: 'bg-blue-300', eggWhite: 'bg-emerald-400', spotting: 'bg-rose-300' }
                    const cmHeights: Record<string, string> = { dry: '20%', sticky: '35%', creamy: '50%', watery: '70%', eggWhite: '95%', spotting: '25%' }
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
            )}

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
            <p className="text-[10px] text-gray-400 text-center"><button onClick={() => navigate('/about-us#research')} className="text-indigo-500 hover:underline">Evidence-based — 40+ research citations →</button></p>

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
                    <p className="text-[10px] text-gray-400 mb-3">{ayurvedaData.guidance?.dominantDosha}</p>
                    <div className="space-y-2">
                      {ayurvedaData.guidance?.diet?.map((tip: any, i: number) => (
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
                      {ayurvedaData.guidance?.herbs?.map((herb: any, i: number) => (
                        <div key={i} className="flex gap-2">
                          <span className="text-purple-500 text-xs mt-0.5">●</span>
                          <p className="text-[11px] text-gray-600 leading-relaxed">{herb}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Herb Safety Classification — Compact Chips */}
                {ayurvedaData?.herbSafetyProfiles && Object.keys(ayurvedaData.herbSafetyProfiles).length > 0 && (
                  <div style={{ borderRadius: 10, padding: 12, margin: '12px 0' }}>
                    <p className="text-xs font-extrabold text-gray-800 mb-2">🌿 Herb Safety</p>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(ayurvedaData.herbSafetyProfiles).map(([name, profile]: [string, any]) => profile && (
                        <button
                          key={name}
                          onClick={() => setExpandedHerb(expandedHerb === name ? null : name)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all active:scale-95 ${
                            expandedHerb === name ? 'border-gray-400 bg-gray-50 shadow-sm' : 'border-gray-200 bg-white'
                          }`}
                        >
                          <span className="text-[8px]">{profile.pregnancySafety === 'CONTRAINDICATED' ? '🔴' : profile.pregnancySafety === 'AVOID' ? '🟠' : profile.pregnancySafety === 'CAUTION' ? '🟡' : '🟢'}</span>
                          <span className="text-gray-700">{profile.sanskritName || name}</span>
                        </button>
                      ))}
                    </div>
                    {expandedHerb && ayurvedaData.herbSafetyProfiles[expandedHerb] && (() => {
                      const profile = ayurvedaData.herbSafetyProfiles[expandedHerb];
                      return (
                        <div style={{ marginTop: 8, padding: 8, background:
                          profile.pregnancySafety === 'CONTRAINDICATED' ? '#FFE0E0' :
                          profile.pregnancySafety === 'AVOID' ? '#FFF0E0' :
                          profile.pregnancySafety === 'CAUTION' ? '#FFFFF0' : '#F0FFF0',
                          borderRadius: 6 }}>
                          <div style={{ fontWeight: 600, fontSize: 12, color: '#333' }}>
                            {profile.pregnancySafety === 'CONTRAINDICATED' ? '🚫' : profile.pregnancySafety === 'AVOID' ? '⚠️' : profile.pregnancySafety === 'CAUTION' ? '⚡' : '✅'} {profile.sanskritName} ({profile.botanicalName})
                          </div>
                          <p style={{ fontSize: 10.5, margin: '4px 0 2px', color: '#555' }}>
                            <strong>Pregnancy:</strong> <span style={{ color: profile.pregnancySafety === 'CONTRAINDICATED' || profile.pregnancySafety === 'AVOID' ? '#CC0000' : '#666' }}>{profile.pregnancySafety} — {profile.pregnancyNote}</span>
                          </p>
                          {profile.generalContraindications?.length > 0 && (
                            <p style={{ fontSize: 10, margin: '2px 0', color: '#777' }}>
                              <strong>Contraindications:</strong> {profile.generalContraindications.join('; ')}
                            </p>
                          )}
                          <p style={{ fontSize: 10, margin: '2px 0', color: '#777' }}>
                            <strong>Evidence:</strong> {profile.modernEvidence}
                          </p>
                          <p style={{ fontSize: 10, margin: '2px 0', color: '#888', fontStyle: 'italic' }}>
                            📜 {profile.classicalReference}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Phase Guidance: Yoga */}
                {ayurvedaData.guidance?.yoga?.length > 0 && (
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <p className="text-xs font-extrabold text-gray-800 mb-3">🧘 Yoga & Pranayama</p>
                    <div className="space-y-2">
                      {ayurvedaData.guidance?.yoga?.map((pose: any, i: number) => (
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
                      {ayurvedaData.guidance?.lifestyle?.map((tip: any, i: number) => (
                        <div key={i} className="flex gap-2">
                          <span className="text-rose-400 text-xs mt-0.5">●</span>
                          <p className="text-[11px] text-gray-600 leading-relaxed">{tip}</p>
                        </div>
                      ))}
                    </div>
                    {ayurvedaData.guidance?.avoid?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-[10px] font-bold text-red-500 mb-1">⚠️ Avoid</p>
                        <p className="text-[11px] text-gray-500">{ayurvedaData.guidance?.avoid?.join(' • ')}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Symptom Insights (Ayurvedic interpretation) */}
                {ayurvedaData.symptomInsights?.length > 0 && (
                  <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4">
                    <p className="text-xs font-extrabold text-violet-800 mb-3">🔍 Your Symptoms — Ayurvedic Lens</p>
                    <div className="space-y-2">
                      {ayurvedaData.symptomInsights?.map((insight: any, i: number) => (
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
                      {ayurvedaData.conceptionGuide.shukraDhatuTips?.map((tip: any, i: number) => (
                        <p key={i} className="text-[11px] text-pink-600">• {tip}</p>
                      ))}
                    </div>
                    <p className="text-[10px] font-bold text-pink-600 mb-1">Garbhadhana Diet (Pre-conception):</p>
                    <div className="space-y-1 mb-3">
                      {ayurvedaData.conceptionGuide.diet?.map((d: any, i: number) => (
                        <p key={i} className="text-[11px] text-pink-600">• {d}</p>
                      ))}
                    </div>
                    <p className="text-[10px] font-bold text-pink-600 mb-1">Modern Timing Science:</p>
                    <div className="space-y-1">
                      {ayurvedaData.conceptionGuide.timing?.map((t: any, i: number) => (
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
                      {ayurvedaData.seasonalAdjustment.adjustment?.map((adj: any, i: number) => (
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


                {/* Mental Health & Cycle Phase — Collapsible */}
                {ayurvedaData?.mentalHealthInsight && (
                  <div style={{ margin: '12px 0' }}>
                    <button
                      onClick={() => setShowMentalHealth(!showMentalHealth)}
                      className="w-full text-left bg-purple-50 border border-purple-200 rounded-2xl px-4 py-3 active:scale-[0.99] transition-transform"
                    >
                      <span className="text-xs font-bold text-purple-700">💜 Mood insight for {ayurvedaData.phase} phase →</span>
                    </button>
                    {showMentalHealth && (
                      <div style={{ background: '#F5F0FF', borderRadius: 10, padding: 12, marginTop: 4 }}>
                        <h4 style={{ margin: '0 0 8px', fontSize: 13, color: '#4A2380' }}>💜 Mental Health & Your Cycle Phase</h4>
                        <p style={{ fontSize: 11, color: '#333', margin: '0 0 8px', lineHeight: 1.5 }}>{ayurvedaData.mentalHealthInsight.insight}</p>

                        <div style={{ margin: '8px 0' }}>
                          <strong style={{ fontSize: 11, color: '#4A2380' }}>Risk Factors This Phase:</strong>
                          {ayurvedaData.mentalHealthInsight.riskFactors?.map((r: string, i: number) => (
                            <p key={i} style={{ fontSize: 10.5, color: '#555', margin: '2px 0 2px 8px' }}>• {r}</p>
                          ))}
                        </div>

                        <div style={{ margin: '8px 0' }}>
                          <strong style={{ fontSize: 11, color: '#4A2380' }}>Support Strategies:</strong>
                          {ayurvedaData.mentalHealthInsight.supportStrategies?.map((s: string, i: number) => (
                            <p key={i} style={{ fontSize: 10.5, color: '#555', margin: '2px 0 2px 8px' }}>✓ {s}</p>
                          ))}
                        </div>

                        <p style={{ fontSize: 10.5, color: '#4A2380', margin: '8px 0 4px', fontWeight: 600 }}>Ayurvedic Approach:</p>
                        <p style={{ fontSize: 10.5, color: '#555', margin: '0 0 8px', lineHeight: 1.4 }}>{ayurvedaData.mentalHealthInsight.ayurvedicApproach}</p>

                        <div style={{ background: '#EDE4FF', borderRadius: 6, padding: 8, marginTop: 8 }}>
                          <p style={{ fontSize: 10, color: '#4A2380', margin: 0, lineHeight: 1.5 }}>
                            <strong>🆘 When to Seek Help:</strong> {ayurvedaData.mentalHealthInsight.whenToSeekHelp}
                          </p>
                        </div>
                        <p style={{ fontSize: 9.5, color: '#888', margin: '6px 0 0', fontStyle: 'italic' }}>Ref: {ayurvedaData.mentalHealthInsight.reference}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Research link */}
                <p className="text-[10px] text-gray-400 text-center"><button onClick={() => navigate('/about-us#research')} className="text-indigo-500 hover:underline">Evidence-based — 40+ research citations →</button></p>

                {/* Bottom Disclaimer */}
                <p className="text-[10px] text-gray-400 text-center mt-4 leading-relaxed">VedaClue is a wellness education app, not a medical device. Not a substitute for professional medical advice.</p>
              </>
            ) : ayurvedaError === 'upgrade' ? (
              <UpgradePrompt feature="cycle:ayurvedic-insights" title="Unlock Ayurvedic Insights" description="Upgrade to VedaClue Premium for personalized Ayurvedic guidance based on your dosha and cycle phase." />
            ) : ayurvedaError === 'error' ? (
              <div className="text-center py-16">
                <span className="text-5xl block mb-4">⚠️</span>
                <p className="text-sm font-bold text-gray-700 mb-1">Could not load Ayurvedic insights</p>
                <p className="text-xs text-gray-400 mb-4">Please check your connection and try again.</p>
                <button onClick={() => setTab('calendar')} className="text-xs text-rose-500 font-semibold">Back to Calendar</button>
              </div>
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

      {/* Log Period Button — fixed above BottomNav (70px nav + 8px gap) */}
      <div
        className="fixed px-4 pb-2 z-30 w-full"
        style={{ bottom: 78, maxWidth: 430, left: '50%', transform: 'translateX(-50%)' }}
      >
        <button
          onClick={() => setShowLogSheet(true)}
          className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-base py-4 rounded-2xl shadow-lg shadow-rose-200 active:scale-95 transition-transform flex items-center justify-center gap-2"
        >
          <span className="text-lg font-black">+</span>
          {tr('tracker.logPeriod')}
        </button>
      </div>

      <BottomNav />

      {/* Log Period Full-Screen Sheet */}
      {showLogSheet && (
        <div className="fixed inset-0 z-50 flex flex-col">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-md"
            onClick={() => setShowLogSheet(false)}
          />
          {/* Full-screen Sheet */}
          <div className="relative flex flex-col bg-white shadow-2xl z-10 w-full h-full">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1.5 bg-gray-300 rounded-full" />
            </div>
            {/* Header — fixed at top */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 className="text-xl font-black text-gray-900">{tr('tracker.logPeriod')}</h2>
                <p className="text-xs text-gray-400 mt-0.5">Track your cycle accurately</p>
              </div>
              <button
                onClick={() => setShowLogSheet(false)}
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
              {/* Start Date */}
              <div>
                <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5 mb-3">
                  <span className="w-5 h-5 rounded-lg bg-rose-100 flex items-center justify-center text-[10px]">📅</span>
                  Start Date
                </label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: 'Today', date: today },
                    { label: 'Yesterday', date: addDays(today, -1) },
                    { label: '2 days ago', date: addDays(today, -2) },
                  ].map(opt => (
                    <button
                      key={opt.label}
                      onClick={() => setLogStartDate(opt.date)}
                      className={`px-4 py-2.5 rounded-2xl text-sm font-semibold border-2 transition-all ${
                        isSameDay(logStartDate, opt.date)
                          ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-200'
                          : 'bg-white text-gray-700 border-gray-100 hover:border-rose-300'
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
                    className="px-4 py-2.5 rounded-2xl border-2 border-gray-100 text-sm text-gray-700 focus:outline-none focus:border-rose-400"
                  />
                </div>
              </div>

              {/* End Date */}
              <div>
                <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5 mb-3">
                  <span className="w-5 h-5 rounded-lg bg-purple-100 flex items-center justify-center text-[10px]">🏁</span>
                  End Date
                  <span className="text-gray-400 font-normal text-xs">(optional — add later)</span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: 'Today', date: today },
                    { label: 'Yesterday', date: addDays(today, -1) },
                  ].map(opt => (
                    <button
                      key={opt.label}
                      onClick={() => setLogEndDate(logEndDate && isSameDay(logEndDate, opt.date) ? null : opt.date)}
                      className={`px-4 py-2.5 rounded-2xl text-sm font-semibold border-2 transition-all ${
                        logEndDate && isSameDay(logEndDate, opt.date)
                          ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-200'
                          : 'bg-white text-gray-700 border-gray-100 hover:border-rose-300'
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
                    className="px-4 py-2.5 rounded-2xl border-2 border-gray-100 text-sm text-gray-700 focus:outline-none focus:border-rose-400"
                  />
                </div>
              </div>

              {/* Flow Selector */}
              <div>
                <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5 mb-3">
                  <span className="w-5 h-5 rounded-lg bg-red-100 flex items-center justify-center text-[10px]">💧</span>
                  Flow Intensity
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {flowOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setLogFlow(opt.value)}
                      className={`flex flex-col items-center gap-1.5 py-3.5 px-1 rounded-2xl border-2 transition-all ${
                        logFlow === opt.value
                          ? 'border-rose-500 bg-rose-50 shadow-md shadow-rose-100'
                          : 'border-gray-100 bg-gray-50/80 hover:border-rose-200'
                      }`}
                    >
                      <span className="text-2xl">{opt.emoji}</span>
                      <span className="text-xs font-bold text-gray-800">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pain Level */}
              <div>
                <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5 mb-3">
                  <span className="w-5 h-5 rounded-lg bg-amber-100 flex items-center justify-center text-[10px]">😣</span>
                  Pain Level
                  {logPain > 0 && <span className="ml-auto text-xs font-bold text-rose-500">{logPain}/5</span>}
                </label>
                <div className="flex gap-2.5 justify-between">
                  {painFaces.map((face, i) => (
                    <button
                      key={i}
                      onClick={() => setLogPain(logPain === i + 1 ? 0 : i + 1)}
                      className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl border-2 transition-all ${
                        logPain === i + 1
                          ? 'border-rose-500 bg-rose-50 shadow-md shadow-rose-100 scale-110'
                          : 'border-gray-100 bg-gray-50/80 hover:border-rose-200'
                      }`}
                    >
                      <span className="text-2xl">{face}</span>
                      <span className="text-[10px] text-gray-400 font-semibold">{['None', 'Mild', 'Medium', 'Bad', 'Severe'][i]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mood */}
              <div>
                <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5 mb-3">
                  <span className="w-5 h-5 rounded-lg bg-purple-100 flex items-center justify-center text-[10px]">🧠</span>
                  Mood
                  {logMoods.length > 0 && <span className="ml-auto text-xs text-purple-500 font-bold">{logMoods.length} selected</span>}
                </label>
                <div className="flex gap-2 flex-wrap">
                  {moodOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => toggleMood(opt.value)}
                      className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border-2 text-sm font-semibold transition-all ${
                        logMoods.includes(opt.value)
                          ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-md shadow-purple-100'
                          : 'border-gray-100 bg-gray-50/80 text-gray-600 hover:border-purple-200'
                      }`}
                    >
                      <span className="text-lg">{opt.emoji}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Symptoms */}
              <div>
                <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5 mb-3">
                  <span className="w-5 h-5 rounded-lg bg-teal-100 flex items-center justify-center text-[10px]">🩺</span>
                  Symptoms
                  {logSymptoms.length > 0 && <span className="ml-auto text-xs text-rose-500 font-bold">{logSymptoms.length} selected</span>}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {symptomOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => toggleSymptom(opt.value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all ${
                        logSymptoms.includes(opt.value)
                          ? 'border-rose-500 bg-rose-50 shadow-md shadow-rose-100'
                          : 'border-gray-100 bg-gray-50/80 hover:border-rose-200'
                      }`}
                    >
                      <span className="text-2xl">{opt.emoji}</span>
                      <span className="text-[11px] font-bold text-gray-700 text-center leading-tight">
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5 mb-3">
                  <span className="w-5 h-5 rounded-lg bg-blue-100 flex items-center justify-center text-[10px]">📝</span>
                  Notes
                </label>
                <textarea
                  value={logNotes}
                  onChange={e => setLogNotes(e.target.value)}
                  placeholder="How are you feeling? Any additional details..."
                  rows={3}
                  className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-rose-400 resize-none"
                />
              </div>

              {/* Bottom spacer for save button */}
              <div className="h-4" />
            </div>

            {/* Fixed Save Button at bottom */}
            <div className="flex-shrink-0 px-5 pb-5 pt-3 border-t border-gray-100 bg-white">
              <button
                onClick={saveLog}
                disabled={saving}
                className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black text-base py-4 rounded-2xl shadow-lg shadow-rose-200 active:scale-95 transition-transform disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

      {/* Prediction Info Bottom Sheet */}
      {showPredictionInfo && (
        <div className="fixed inset-0 z-50" style={{ maxWidth: 430, left: '50%', transform: 'translateX(-50%)' }}>
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowPredictionInfo(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 shadow-2xl z-10">
            <div className="flex justify-center mb-4"><div className="w-10 h-1.5 bg-gray-300 rounded-full" /></div>
            <p className="text-sm font-bold text-gray-800 mb-2">How we predict your cycle</p>
            <p className="text-xs text-gray-500 leading-relaxed mb-4">Based on your cycle history using research-backed methods including weighted moving averages, individual luteal phase estimation, and biomarker analysis.</p>
            <button onClick={() => navigate('/about-us#research')} className="text-xs text-indigo-500 font-semibold hover:underline">View 40+ research sources →</button>
            <button onClick={() => setShowPredictionInfo(false)} className="w-full mt-4 py-2.5 bg-gray-100 rounded-xl text-sm font-semibold text-gray-600">Close</button>
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

      {/* Import Past Periods Sheet */}
      {showImportSheet && (
        <div className="fixed inset-0 z-[60] flex flex-col">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={() => !importSaving && setShowImportSheet(false)} />
          <div className="relative flex flex-col bg-white shadow-2xl z-10 w-full h-full">
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1.5 bg-gray-300 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 className="text-xl font-black text-gray-900">{tr('tracker.importPastPeriods')}</h2>
                <p className="text-xs text-gray-400 mt-0.5">Add up to 3 recent periods for better predictions</p>
              </div>
              <button onClick={() => !importSaving && setShowImportSheet(false)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 pb-32">
              <div className="bg-purple-50 rounded-xl p-3 mb-1">
                <p className="text-xs text-purple-700 font-semibold">💡 Even approximate dates help! More periods = more accurate predictions.</p>
              </div>

              {importPeriods.map((pp, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative">
                  {(importPeriods.length > 1 || pp.startDate || pp.endDate) && (
                    <button onClick={() => removeImportPeriod(idx)}
                      className="absolute top-3 right-3 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-400 transition active:scale-90 text-xs font-bold">
                      ✕
                    </button>
                  )}
                  <p className="text-xs font-bold text-gray-500 mb-3">Period {idx + 1}</p>
                  <div className="mb-3">
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Start Date *</label>
                    <input
                      type="date"
                      value={pp.startDate}
                      max={todayStr}
                      min={twelveMonthsAgoStr}
                      onChange={e => updateImportPeriod(idx, 'startDate', e.target.value)}
                      className={'w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none transition ' + (pp.errors.startDate ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-rose-400')}
                    />
                    {pp.errors.startDate && <p className="text-[10px] text-red-500 mt-1 font-medium">{pp.errors.startDate}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">End Date <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input
                      type="date"
                      value={pp.endDate}
                      max={todayStr}
                      min={pp.startDate || twelveMonthsAgoStr}
                      onChange={e => updateImportPeriod(idx, 'endDate', e.target.value)}
                      className={'w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none transition ' + (pp.errors.endDate ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-rose-400')}
                    />
                    {pp.errors.endDate && <p className="text-[10px] text-red-500 mt-1 font-medium">{pp.errors.endDate}</p>}
                  </div>
                </div>
              ))}

              {importPeriods.length < 3 && (
                <button onClick={addImportPeriod}
                  className="w-full py-2.5 rounded-2xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-400 hover:border-rose-300 hover:text-rose-400 transition active:scale-95">
                  + Add another period
                </button>
              )}
            </div>
            {/* Save Button — fixed at bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-5 bg-white border-t border-gray-100">
              <button onClick={saveImportPeriods} disabled={importSaving}
                className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black text-base py-4 rounded-2xl shadow-lg shadow-rose-200 active:scale-95 transition-transform disabled:opacity-60">
                {importSaving ? 'Saving...' : '🌸 Import Periods'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm z-10">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </div>
              <h3 className="text-lg font-black text-gray-900 mb-1">{tr('tracker.deleteConfirm')}</h3>
              <p className="text-sm text-gray-500 mb-5">{tr('tracker.deleteConfirmDesc')}</p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200 transition">{tr('common.cancel')}</button>
                <button onClick={() => handleDeleteCycle(deleteConfirm)} className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition">{tr('common.delete')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Period Modal */}
      {editingCycle && (
        <div className="fixed inset-0 z-[60] flex flex-col">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={() => setEditingCycle(null)} />
          <div className="relative flex flex-col bg-white shadow-2xl z-10 w-full h-full">
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1.5 bg-gray-300 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 className="text-xl font-black text-gray-900">Edit Period</h2>
                <p className="text-xs text-gray-400 mt-0.5">Update this period entry</p>
              </div>
              <button onClick={() => setEditingCycle(null)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 pb-32">
              {/* Start Date */}
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">Start Date</label>
                <input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-rose-400" />
              </div>
              {/* End Date */}
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">End Date (optional)</label>
                <input type="date" value={editEndDate} onChange={e => setEditEndDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-rose-400" />
              </div>
              {/* Flow */}
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">Flow Intensity</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['light', 'medium', 'heavy', 'spotting'] as const).map(f => (
                    <button key={f} onClick={() => setEditFlow(editFlow === f ? '' : f)}
                      className={`py-2.5 rounded-xl border-2 text-xs font-bold capitalize transition-all ${editFlow === f ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-100 bg-gray-50 text-gray-600'}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              {/* Pain Level */}
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">Pain Level: {editPain}/10</label>
                <input type="range" min={0} max={10} value={editPain} onChange={e => setEditPain(Number(e.target.value))}
                  className="w-full accent-rose-500" />
              </div>
              {/* Mood */}
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">Mood</label>
                <div className="flex flex-wrap gap-2">
                  {['happy', 'calm', 'sad', 'irritable', 'tired'].map(m => (
                    <button key={m} onClick={() => setEditMoods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])}
                      className={`px-3 py-1.5 rounded-full border text-xs font-semibold capitalize transition-all ${editMoods.includes(m) ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              {/* Symptoms */}
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">Symptoms</label>
                <div className="flex flex-wrap gap-2">
                  {['cramps', 'bloating', 'headache', 'fatigue', 'nausea', 'cravings', 'back_pain', 'acne', 'insomnia'].map(s => (
                    <button key={s} onClick={() => setEditSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                      className={`px-3 py-1.5 rounded-full border text-xs font-semibold capitalize transition-all ${editSymptoms.includes(s) ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
              {/* Notes */}
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">Notes</label>
                <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Any notes..."
                  rows={3} maxLength={500} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-400 resize-none" />
              </div>
            </div>
            {/* Save Button — fixed at bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-5 bg-white border-t border-gray-100">
              <button onClick={handleUpdateCycle} disabled={editSaving || !editStartDate}
                className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black text-base py-4 rounded-2xl shadow-lg shadow-rose-200 active:scale-95 transition-transform disabled:opacity-60">
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
