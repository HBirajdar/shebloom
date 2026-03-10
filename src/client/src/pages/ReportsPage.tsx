// @ts-nocheck
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCycleStore } from '../stores/cycleStore'
import { api } from '../services/api'
import toast from 'react-hot-toast'
import BottomNav from '../components/BottomNav'

// ─── helpers ───────────────────────────────────────────────────────────────

function fmtDate(str: string, opts?: Intl.DateTimeFormatOptions) {
  if (!str) return '—'
  const d = new Date(str)
  if (isNaN(d.getTime())) return str
  return d.toLocaleDateString('en-US', opts || { month: 'short', day: 'numeric' })
}

function fmtMonthYear(str: string) {
  if (!str) return '—'
  const d = new Date(str)
  if (isNaN(d.getTime())) return str
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

const FLOW_EMOJI: Record<string, string> = {
  heavy: '🔴',
  medium: '🟠',
  moderate: '🟠',
  light: '🟡',
  spotting: '⚪',
  none: '⚪',
}

const FLOW_LABEL: Record<string, string> = {
  heavy: 'Heavy',
  medium: 'Medium',
  moderate: 'Medium',
  light: 'Light',
  spotting: 'Spotting',
  none: 'None',
}

const MOOD_EMOJI: Record<string, string> = {
  GREAT: '🥰',
  GOOD: '😊',
  OKAY: '😐',
  LOW: '😔',
  BAD: '😤',
  HAPPY: '😊',
  SAD: '😔',
  IRRITABLE: '😤',
  ANXIOUS: '😰',
  CALM: '😌',
  ENERGETIC: '⚡',
}

const MOOD_LABEL: Record<string, string> = {
  GREAT: 'Great',
  GOOD: 'Good',
  OKAY: 'Okay',
  LOW: 'Low',
  BAD: 'Bad',
  HAPPY: 'Happy',
  SAD: 'Sad',
  IRRITABLE: 'Irritable',
  ANXIOUS: 'Anxious',
  CALM: 'Calm',
  ENERGETIC: 'Energetic',
}

const MOOD_COLOR: Record<string, string> = {
  GREAT: 'bg-green-400',
  GOOD: 'bg-green-300',
  OKAY: 'bg-yellow-300',
  LOW: 'bg-orange-400',
  BAD: 'bg-red-400',
}

const PHASE_EMOJI: Record<string, string> = {
  menstrual: '🔴',
  follicular: '🟡',
  ovulation: '🟢',
  luteal: '🟣',
}

// ─── skeleton ──────────────────────────────────────────────────────────────

function SkeletonCard({ h = 'h-28' }: { h?: string }) {
  return (
    <div className={`rounded-2xl bg-gray-200 animate-pulse w-full ${h}`} />
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 pt-4">
      <SkeletonCard h="h-36" />
      <SkeletonCard h="h-48" />
      <SkeletonCard h="h-32" />
      <SkeletonCard h="h-40" />
      <SkeletonCard h="h-32" />
    </div>
  )
}

// ─── empty state ───────────────────────────────────────────────────────────

function EmptyState({ onGo }: { onGo: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 gap-4">
      <div className="text-6xl">🌸</div>
      <p className="text-center text-gray-600 text-base">
        Log at least one period to see your health story
      </p>
      <button
        onClick={onGo}
        className="mt-2 px-6 py-3 rounded-full bg-rose-500 text-white font-semibold text-sm shadow"
      >
        Go to Tracker
      </button>
    </div>
  )
}

// ─── section 1: hero ───────────────────────────────────────────────────────

function HeroCard({ data }: { data: any }) {
  return (
    <div className="mx-4 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 text-white p-5 shadow-lg">
      <h2 className="text-xl font-bold mb-0.5">Your Health Story 📖</h2>
      <p className="text-rose-100 text-sm mb-4">
        {data.totalCycles} cycle{data.totalCycles !== 1 ? 's' : ''} tracked
        {data.firstPeriodDate ? ` since ${fmtDate(data.firstPeriodDate, { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}
      </p>
      <div className="flex gap-2">
        <div className="flex-1 bg-white/20 rounded-xl p-3 flex flex-col items-center gap-1">
          <span className="text-lg">📊</span>
          <span className="text-xl font-bold">{data.avgCycleLength ?? '—'}</span>
          <span className="text-xs text-rose-100 text-center leading-tight">Avg Cycle (days)</span>
        </div>
        <div className="flex-1 bg-white/20 rounded-xl p-3 flex flex-col items-center gap-1">
          <span className="text-lg">📅</span>
          <span className="text-xl font-bold">{data.avgDuration ?? '—'}</span>
          <span className="text-xs text-rose-100 text-center leading-tight">Avg Duration (days)</span>
        </div>
        <div className="flex-1 bg-white/20 rounded-xl p-3 flex flex-col items-center gap-1">
          <span className="text-lg">📈</span>
          <span className="text-xl font-bold">{data.regularity ?? '—'}%</span>
          <span className="text-xs text-rose-100 text-center leading-tight">Regularity</span>
        </div>
      </div>
    </div>
  )
}

// ─── mini phase bar ────────────────────────────────────────────────────────

function MiniPhaseBar({ cycleLength }: { cycleLength: number }) {
  const cl = cycleLength || 28
  const menstrual = Math.min(5, cl)
  const ovulation = 1
  const luteal = Math.round(cl * 0.4)
  const follicular = cl - menstrual - ovulation - luteal

  const phases = [
    { label: 'Menstrual', days: menstrual, color: 'bg-red-400' },
    { label: 'Follicular', days: Math.max(follicular, 1), color: 'bg-yellow-300' },
    { label: 'Ovulation', days: ovulation, color: 'bg-green-400' },
    { label: 'Luteal', days: Math.max(luteal, 1), color: 'bg-purple-400' },
  ]

  return (
    <div className="mt-3">
      <p className="text-xs text-gray-500 mb-1 font-medium">Cycle phases</p>
      <div className="flex rounded-full overflow-hidden h-3 w-full">
        {phases.map((p) => (
          <div
            key={p.label}
            className={`${p.color}`}
            style={{ width: `${(p.days / cl) * 100}%` }}
            title={`${p.label}: ${p.days}d`}
          />
        ))}
      </div>
      <div className="flex mt-1 text-xs text-gray-400">
        {phases.map((p) => (
          <div
            key={p.label}
            style={{ width: `${(p.days / cl) * 100}%` }}
            className="truncate text-center"
          >
            {p.days}d
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── section 2: cycle history ──────────────────────────────────────────────

function CycleCard({
  cycle,
  index,
  total,
  avgCycleLength,
}: {
  cycle: any
  index: number
  total: number
  avgCycleLength: number
}) {
  const [expanded, setExpanded] = useState(false)

  const cycleNum = total - index
  const cl = cycle.cycleLength || avgCycleLength || 28
  const barPct = Math.min(100, Math.round((cl / Math.max(avgCycleLength, 1)) * 100))

  const topMood = Array.isArray(cycle.mood) && cycle.mood.length > 0
    ? cycle.mood[0]
    : typeof cycle.mood === 'string'
    ? cycle.mood
    : null

  const moodKey = topMood ? topMood.toUpperCase() : null

  return (
    <div
      className="mx-4 rounded-2xl bg-white border border-rose-100 shadow-sm overflow-hidden"
      onClick={() => setExpanded((v) => !v)}
    >
      {/* collapsed */}
      <div className="p-4 cursor-pointer">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-800">
            🌸 Cycle {cycleNum}
          </span>
          <span className="text-xs text-gray-400">
            {fmtDate(cycle.startDate)} – {fmtDate(cycle.endDate)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-rose-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-rose-400 rounded-full transition-all"
              style={{ width: `${barPct}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 whitespace-nowrap">{cl}d cycle</span>
          <span className="text-gray-400 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* expanded */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-rose-50 pt-3 space-y-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <div className="text-gray-500">Period</div>
            <div className="text-gray-800 font-medium">
              {fmtDate(cycle.startDate)} – {fmtDate(cycle.endDate)}
              {cycle.periodLength ? ` (${cycle.periodLength}d)` : ''}
            </div>

            {cycle.flow && (
              <>
                <div className="text-gray-500">Flow</div>
                <div className="text-gray-800">
                  {FLOW_EMOJI[cycle.flow.toLowerCase()] || '🩸'}{' '}
                  {FLOW_LABEL[cycle.flow.toLowerCase()] || cycle.flow}
                </div>
              </>
            )}

            {cycle.painLevel != null && (
              <>
                <div className="text-gray-500">Pain</div>
                <div className="text-gray-800">
                  {cycle.painLevel >= 4 ? '😣' : cycle.painLevel >= 2 ? '😐' : '😊'}{' '}
                  {cycle.painLevel}/5
                </div>
              </>
            )}

            {Array.isArray(cycle.symptoms) && cycle.symptoms.length > 0 && (
              <>
                <div className="text-gray-500">Symptoms</div>
                <div className="text-gray-800 capitalize">
                  {cycle.symptoms.slice(0, 4).join(', ')}
                </div>
              </>
            )}

            {moodKey && (
              <>
                <div className="text-gray-500">Mood</div>
                <div className="text-gray-800">
                  {MOOD_EMOJI[moodKey] || '😐'} {MOOD_LABEL[moodKey] || moodKey}
                </div>
              </>
            )}

            {cycle.notes && (
              <>
                <div className="text-gray-500">Notes</div>
                <div className="text-gray-600 italic text-xs">{cycle.notes}</div>
              </>
            )}
          </div>

          <MiniPhaseBar cycleLength={cl} />
        </div>
      )}
    </div>
  )
}

function CycleHistory({ allCycles, avgCycleLength }: { allCycles: any[]; avgCycleLength: number }) {
  const sorted = [...(allCycles || [])].reverse()

  return (
    <div className="flex flex-col gap-3">
      <h3 className="px-4 text-base font-bold text-gray-800">All My Cycles</h3>
      {sorted.length === 0 ? (
        <p className="px-4 text-gray-400 text-sm">No cycles logged yet.</p>
      ) : (
        sorted.map((c, i) => (
          <CycleCard
            key={c.id || i}
            cycle={c}
            index={i}
            total={sorted.length}
            avgCycleLength={avgCycleLength}
          />
        ))
      )}
    </div>
  )
}

// ─── section 3: symptom patterns ───────────────────────────────────────────

function SymptomPatterns({ symptomFrequency }: { symptomFrequency: Record<string, number> }) {
  const entries = Object.entries(symptomFrequency || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)

  const max = entries.length > 0 ? entries[0][1] : 100

  return (
    <div className="mx-4 bg-white rounded-2xl border border-rose-100 shadow-sm p-4">
      <h3 className="text-base font-bold text-gray-800 mb-4">What Your Body Tells You</h3>
      {entries.length === 0 ? (
        <p className="text-gray-400 text-sm">No symptom data yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map(([symptom, freq]) => {
            const pct = Math.round((freq / max) * 100)
            return (
              <div key={symptom}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="capitalize text-gray-700 font-medium">{symptom}</span>
                  <span className="text-gray-400 text-xs">{freq}%</span>
                </div>
                <div className="h-2.5 bg-rose-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-400 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── section 4: mood journey ───────────────────────────────────────────────

function MoodJourney({
  moodByPhase,
  wellnessHistory,
}: {
  moodByPhase: Record<string, string>
  wellnessHistory: Array<{ date: string; score: number }>
}) {
  const phases = ['menstrual', 'follicular', 'ovulation', 'luteal']

  // Build last-14-days mood dots from wellness history
  const last14 = [...(wellnessHistory || [])].slice(-14)
  // Pad to 14 if needed
  while (last14.length < 14) {
    last14.unshift({ date: '', score: -1 })
  }

  function scoreToMoodKey(score: number): string | null {
    if (score < 0) return null
    if (score >= 80) return 'GREAT'
    if (score >= 65) return 'GOOD'
    if (score >= 45) return 'OKAY'
    if (score >= 25) return 'LOW'
    return 'BAD'
  }

  const firstDate = last14.find((d) => d.date)?.date || ''
  const lastDate = last14[last14.length - 1]?.date || ''

  return (
    <div className="mx-4 bg-white rounded-2xl border border-rose-100 shadow-sm p-4">
      <h3 className="text-base font-bold text-gray-800 mb-4">Your Mood Patterns</h3>

      {/* Phase mood table */}
      <div className="flex flex-col gap-2 mb-5">
        {phases.map((phase) => {
          const moodRaw = moodByPhase?.[phase]
          const moodKey = moodRaw ? moodRaw.toUpperCase() : null
          return (
            <div key={phase} className="flex items-center justify-between">
              <span className="text-sm text-gray-600 capitalize">
                {PHASE_EMOJI[phase]} {phase.charAt(0).toUpperCase() + phase.slice(1)}
              </span>
              <span className="text-sm font-medium text-gray-800">
                {moodKey
                  ? `${MOOD_EMOJI[moodKey] || '😐'} ${MOOD_LABEL[moodKey] || moodKey}`
                  : '—'}
              </span>
            </div>
          )
        })}
      </div>

      {/* Last 14 days dots */}
      <div>
        <p className="text-xs text-gray-500 font-medium mb-2">Last 14 Days</p>
        <div className="flex gap-1 justify-between">
          {last14.map((entry, i) => {
            const mk = scoreToMoodKey(entry.score)
            const color = mk ? MOOD_COLOR[mk] || 'bg-gray-300' : 'bg-gray-200'
            return (
              <div key={i} className="flex flex-col items-center gap-1 flex-1">
                <div className={`w-full aspect-square rounded-full ${color}`} style={{ minWidth: 16 }} />
              </div>
            )
          })}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-400">{firstDate ? fmtDate(firstDate, { month: 'short', day: 'numeric' }) : ''}</span>
          <span className="text-xs text-gray-400">{lastDate ? fmtDate(lastDate, { month: 'short', day: 'numeric' }) : ''}</span>
        </div>
      </div>
    </div>
  )
}

// ─── section 5: flow & pain trends ─────────────────────────────────────────

function FlowPainTrends({ allCycles }: { allCycles: any[] }) {
  const last6 = [...(allCycles || [])].slice(-6)

  // Determine pain trend
  let insightText = 'Pain levels are consistent across cycles'
  if (last6.length >= 3) {
    const pains = last6.map((c) => c.painLevel ?? 0)
    const firstHalf = pains.slice(0, Math.floor(pains.length / 2))
    const secondHalf = pains.slice(Math.floor(pains.length / 2))
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
    if (avgSecond < avgFirst - 0.3) {
      insightText = 'Your pain levels are improving 📉 Great sign!'
    }
  }

  function buildFlowDots(cycle: any) {
    const days = cycle.periodLength || 5
    const flow = cycle.flow?.toLowerCase() || 'none'
    const dots = []
    for (let i = 0; i < Math.min(days, 7); i++) {
      if (i === 0 && flow === 'heavy') dots.push('🔴')
      else if (flow === 'heavy' && i < 3) dots.push('🔴')
      else if (flow === 'medium' || flow === 'moderate') dots.push('🟠')
      else if (flow === 'light') dots.push('🟡')
      else dots.push('⚪')
    }
    return dots
  }

  return (
    <div className="mx-4 bg-white rounded-2xl border border-rose-100 shadow-sm p-4">
      <h3 className="text-base font-bold text-gray-800 mb-4">Flow &amp; Pain Over Time</h3>

      {last6.length === 0 ? (
        <p className="text-gray-400 text-sm">No data yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {last6.map((cycle, i) => {
            const dots = buildFlowDots(cycle)
            const pain = cycle.painLevel ?? 0
            const painPct = Math.round((pain / 5) * 100)
            return (
              <div key={cycle.id || i} className="flex items-center gap-3">
                <div className="w-16 text-xs text-gray-500 shrink-0">
                  {fmtMonthYear(cycle.startDate)}
                </div>
                <div className="flex gap-0.5 shrink-0">
                  {dots.map((d, j) => (
                    <span key={j} className="text-xs leading-none">{d}</span>
                  ))}
                </div>
                <div className="flex-1 flex items-center gap-1.5">
                  <div className="flex-1 h-2 bg-rose-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-400 rounded-full"
                      style={{ width: `${painPct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">{pain}/5</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-4 bg-rose-50 rounded-xl p-3">
        <p className="text-sm text-rose-700">{insightText}</p>
      </div>
    </div>
  )
}

// ─── section 6: AI insights ─────────────────────────────────────────────────

const FALLBACK_INSIGHTS = [
  {
    icon: '🔄',
    title: 'Track consistently for better insights',
    body: 'Log your symptoms regularly to see patterns in your cycle.',
  },
  {
    icon: '💧',
    title: 'Stay hydrated',
    body: 'Drinking 8 glasses of water daily reduces bloating and cramps.',
  },
  {
    icon: '🌿',
    title: 'Phase-based nutrition',
    body: 'Eat iron-rich foods during menstrual phase to replenish energy.',
  },
]

function AIInsights({
  aiLoading,
  aiInsight,
  totalCycles,
}: {
  aiLoading: boolean
  aiInsight: string
  totalCycles: number
}) {
  return (
    <div className="mx-4 bg-white rounded-2xl border border-rose-200 shadow-sm p-4">
      <h3 className="text-base font-bold text-gray-800 mb-0.5">What Your Data Says 🤖</h3>
      <p className="text-xs text-gray-400 mb-4">Personalised insights based on your history</p>

      {aiLoading ? (
        <div className="flex flex-col items-center gap-4 py-4">
          <p className="text-sm text-gray-600">Analysing your {totalCycles} cycles... 🔍</p>
          <div className="flex gap-1.5 items-center justify-center">
            <div className="w-2.5 h-2.5 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2.5 h-2.5 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '75ms' }} />
            <div className="w-2.5 h-2.5 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          </div>
        </div>
      ) : aiInsight ? (
        <div className="border border-rose-200 rounded-xl p-3 bg-rose-50">
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{aiInsight}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {FALLBACK_INSIGHTS.map((ins, i) => (
            <div key={i} className="border border-rose-100 rounded-xl p-3 bg-rose-50">
              <p className="text-sm font-semibold text-gray-800 mb-0.5">
                {ins.icon} {ins.title}
              </p>
              <p className="text-xs text-gray-600">{ins.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── section 7: wellness score bars ────────────────────────────────────────

function WellnessJourney({ wellnessHistory }: { wellnessHistory: Array<{ date: string; score: number }> }) {
  const last14 = [...(wellnessHistory || [])].slice(-14)
  while (last14.length < 14) {
    last14.unshift({ date: '', score: 0 })
  }

  const today = new Date().toDateString()

  function barColor(score: number) {
    if (score > 70) return 'bg-green-400'
    if (score >= 40) return 'bg-amber-400'
    return 'bg-rose-400'
  }

  function dayLabel(dateStr: string) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)
  }

  return (
    <div className="mx-4 bg-white rounded-2xl border border-rose-100 shadow-sm p-4">
      <h3 className="text-base font-bold text-gray-800 mb-4">Wellness Journey</h3>

      {/* bars */}
      <div className="flex gap-1 items-end h-24 w-full">
        {last14.map((entry, i) => {
          const height = entry.score > 0 ? Math.max(4, Math.round((entry.score / 100) * 96)) : 4
          const isToday = entry.date && new Date(entry.date).toDateString() === today
          return (
            <div
              key={i}
              className={`flex-1 rounded-t-sm ${barColor(entry.score)} ${isToday ? 'ring-2 ring-rose-600' : ''}`}
              style={{ height: `${height}px` }}
              title={entry.date ? `${fmtDate(entry.date)}: ${entry.score}` : ''}
            />
          )
        })}
      </div>

      {/* day labels */}
      <div className="flex gap-1 mt-1">
        {last14.map((entry, i) => (
          <div key={i} className="flex-1 text-center text-gray-400" style={{ fontSize: 8 }}>
            {dayLabel(entry.date)}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── main page ──────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const navigate = useNavigate()
  const cycleStore = useCycleStore()

  const [data, setData] = useState(null)
  const [aiInsight, setAiInsight] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/reports/summary')
      .then((r) => {
        setData(r.data.data)
        setLoading(false)
        setAiLoading(true)
        return api.post('/ai/chat', {
          message:
            'Analyse my period history and give me 5 personalised health insights in 3-4 sentences each',
          context: {
            cycleDay: cycleStore.cycleDay,
            phase: cycleStore.phase,
            avgCycleLength: r.data.data.avgCycleLength,
            regularity: r.data.data.regularity,
            topSymptoms: Object.keys(r.data.data.symptomFrequency || {}).slice(0, 3),
            totalCycles: r.data.data.totalCycles,
          },
        })
      })
      .then((r) => setAiInsight(r.data.data?.response || r.data.data?.message || ''))
      .catch(() => {
        setLoading(false)
        toast.error('Could not load health report')
      })
      .finally(() => setAiLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-rose-50" style={{ maxWidth: 430, margin: '0 auto' }}>
      {/* header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-3 bg-rose-50">
        <button
          onClick={() => navigate('/profile')}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow text-gray-600 text-lg"
        >
          ←
        </button>
        <h1 className="text-lg font-bold text-gray-800">My Health Story 📖</h1>
      </div>

      {/* content */}
      {loading ? (
        <LoadingSkeleton />
      ) : !data || data.totalCycles === 0 ? (
        <EmptyState onGo={() => navigate('/tracker')} />
      ) : (
        <div className="flex flex-col gap-5 pb-24 pt-2">
          <HeroCard data={data} />

          <CycleHistory
            allCycles={data.allCycles || []}
            avgCycleLength={data.avgCycleLength}
          />

          <SymptomPatterns symptomFrequency={data.symptomFrequency || {}} />

          <MoodJourney
            moodByPhase={data.moodByPhase || {}}
            wellnessHistory={data.wellnessHistory || []}
          />

          <FlowPainTrends allCycles={data.allCycles || []} />

          <AIInsights
            aiLoading={aiLoading}
            aiInsight={aiInsight}
            totalCycles={data.totalCycles}
          />

          <WellnessJourney wellnessHistory={data.wellnessHistory || []} />
        </div>
      )}

      <BottomNav />
    </div>
  )
}
