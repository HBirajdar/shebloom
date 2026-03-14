// ══════════════════════════════════════════════════════════════════
// Personalized Insights Engine
// ══════════════════════════════════════════════════════════════════
// Analyzes cycle history, symptoms, moods, and wellness data to
// generate personalized tips, predictions, and trend analysis.
// ══════════════════════════════════════════════════════════════════

import prisma from '../config/database';
import { cacheGet, cacheSet } from '../config/redis';
import { logger } from '../config/logger';

// ── Types ────────────────────────────────────────────────────────

interface CrossPhasePattern {
  type: 'symptom' | 'mood';
  name: string;
  phase: string;
  cycleCount: number;
  totalCycles: number;
  rate: number;
  message: string;
}

interface Tip {
  tip: string;
  category: 'pattern' | 'symptom' | 'wellness' | 'phase';
  emoji: string;
}

interface Prediction {
  prediction: string;
  daysAhead: number;
  confidence: 'high' | 'medium';
  basedOn: string;
}

interface MoodTrends {
  phaseAvg: Record<string, number>;
  bestPhase: string;
  worstPhase: string;
  weeklyTrend: { week: string; avg: number }[];
  insight: string;
}

interface InsightsResult {
  tips: Tip[];
  patterns: CrossPhasePattern[];
  predictions: Prediction[];
  moodTrends: MoodTrends;
  lastUpdated: string;
}

// ── Constants ────────────────────────────────────────────────────

const PHASES = ['menstrual', 'follicular', 'ovulation', 'luteal'] as const;
type Phase = (typeof PHASES)[number];

const MOOD_SCORES: Record<string, number> = {
  GREAT: 5, GOOD: 4, OKAY: 3, LOW: 2, BAD: 1,
};

const DOSHA_PHASE_TIPS: Record<string, Record<string, string[]>> = {
  Vata: {
    menstrual: ['Try a warm sesame oil self-massage before bed to calm Vata during your period.', 'Sip ginger-jaggery water throughout the day to ease menstrual discomfort.'],
    follicular: ['An ashwagandha milk before sleep supports Vata energy during your follicular phase.', 'Channel your rising energy into creative activities like painting or writing.'],
    ovulation: ['Focus on grounding foods like root vegetables and warm grains during ovulation.', 'Maintain a regular sleep schedule to keep Vata balanced at peak fertility.'],
    luteal: ['A warm bath with lavender oil helps soothe pre-menstrual Vata imbalance.', 'Avoid cold foods and drinks during your luteal phase to keep Vata steady.'],
  },
  Pitta: {
    menstrual: ['Sprinkle cooling rose water on your face and wrists to ease Pitta heat during your period.', 'Sip cool coconut water or pomegranate juice to pacify Pitta heat during menstruation.'],
    follicular: ['A gentle coconut oil scalp massage balances Pitta during the follicular phase.', 'Enjoy sweet seasonal fruits like melons and grapes to stay cool and nourished.'],
    ovulation: ['Avoid spicy and fermented foods around ovulation to keep Pitta calm.', 'A gentle moonlight walk after dinner helps balance Pitta energy at mid-cycle.'],
    luteal: ['Take a spoonful of gulkand before bed to cool Pitta and promote restful sleep.', 'Swimming or gentle water activities are ideal Pitta-balancing exercise pre-period.'],
  },
  Kapha: {
    menstrual: ['Start your morning with dry ginger tea to stimulate sluggish Kapha during your period.', 'A brisk 20-minute walk helps move stagnant Kapha energy during menstruation.'],
    follicular: ['Practice surya namaskar (sun salutations) to energize Kapha in the follicular phase.', 'Opt for light, warm meals with plenty of spices to keep Kapha metabolism active.'],
    ovulation: ['Add stimulating spices like black pepper and turmeric to your meals around ovulation.', 'Outdoor exercise in fresh air is the best way to balance Kapha at mid-cycle.'],
    luteal: ['Lukewarm water with a teaspoon of honey first thing in the morning combats Kapha heaviness (never add honey to hot water).', 'Reduce dairy intake during your luteal phase to prevent Kapha congestion.'],
  },
};

const SYMPTOM_TIPS: Record<string, Record<string, string>> = {
  cramps: {
    Vata: 'Apply a warm compress with sesame oil to your lower abdomen for Vata-type cramps.',
    Pitta: 'Try a cool pack and ashoka bark tea to soothe Pitta-driven menstrual cramps.',
    Kapha: 'A ginger compress and gentle movement help relieve Kapha-type cramps.',
    default: 'A warm compress and gentle stretching can help ease cramps.',
  },
  headache: {
    Vata: 'Try nasya oil (2 drops Anu Taila per nostril) and rest in a quiet room for Vata headaches. Avoid nasya during active menstruation.',
    Pitta: 'Apply peppermint oil to your temples and a cool towel to your forehead.',
    Kapha: 'A eucalyptus steam inhalation followed by a short walk clears Kapha headaches.',
    default: 'Rest in a dark room and stay hydrated to ease your headache.',
  },
  bloating: {
    Vata: 'Sip fennel tea after meals and favor warm, cooked foods to ease Vata bloating.',
    Pitta: 'Drink cumin water and avoid fermented foods to calm Pitta-related bloating.',
    Kapha: 'Ginger tea and light eating through the day help reduce Kapha bloating.',
    default: 'Fennel or peppermint tea after meals can help with bloating.',
  },
  fatigue: {
    Vata: 'Ashwagandha with warm milk and an early bedtime restore Vata energy.',
    Pitta: 'Brahmi tea and moderate rest (not oversleeping) rebalance Pitta fatigue.',
    Kapha: 'Tulsi tea and light exercise are the best remedy for Kapha-type fatigue.',
    default: 'Prioritize sleep and consider an iron-rich snack to fight fatigue.',
  },
  'mood swings': {
    Vata: 'Ground yourself with warm oil on your feet, alternate-nostril pranayama, and a consistent daily routine.',
    Pitta: 'Cool down with Sheetali pranayama, avoid heated arguments, and try a moonlight walk or Brahmi tea.',
    Kapha: 'Energize with Kapalbhati pranayama (avoid during menstruation), brisk movement, and uplifting activities.',
    default: 'Practice alternate-nostril pranayama, journal your feelings, and spend time outdoors.',
  },
};

// ── Helpers ──────────────────────────────────────────────────────

function getPhase(dayInCycle: number, periodLength: number, avgCycleLength: number): Phase {
  const ovulationDay = avgCycleLength - 14;
  if (dayInCycle <= periodLength) return 'menstrual';
  if (dayInCycle <= ovulationDay - 3) return 'follicular';
  if (dayInCycle <= ovulationDay + 2) return 'ovulation';
  return 'luteal';
}

function daysBetween(a: Date, b: Date): number {
  return Math.round(Math.abs(a.getTime() - b.getTime()) / 86_400_000);
}

function phaseStartDay(phase: Phase, periodLength: number, avgCycleLength: number): number {
  const ovulationDay = avgCycleLength - 14;
  switch (phase) {
    case 'menstrual': return 1;
    case 'follicular': return periodLength + 1;
    case 'ovulation': return ovulationDay - 2;
    case 'luteal': return ovulationDay + 3;
  }
}

// ── Core Functions ───────────────────────────────────────────────

export function detectCrossPhasePatterns(
  cycles: { startDate: Date; endDate: Date | null }[],
  symptomLogs: { symptoms: string[]; logDate: Date }[],
  moodLogs: { mood: string; logDate: Date }[],
  avgCycleLength: number,
  periodLength: number,
): CrossPhasePattern[] {
  if (cycles.length < 2) return [];

  const totalCycles = cycles.length;
  // symptom -> phase -> Set<cycleIndex>
  const symptomMap = new Map<string, Map<string, Set<number>>>();
  // phase -> Set<cycleIndex> for LOW/BAD moods
  const moodMap = new Map<string, Set<number>>();

  for (let ci = 0; ci < cycles.length; ci++) {
    const cycle = cycles[ci];
    const cycleStart = new Date(cycle.startDate);
    const cycleEnd = cycle.endDate
      ? new Date(cycle.endDate)
      : new Date(cycleStart.getTime() + avgCycleLength * 86_400_000);

    // Symptom logs within this cycle
    for (const log of symptomLogs) {
      const logDate = new Date(log.logDate);
      if (logDate < cycleStart || logDate > cycleEnd) continue;
      const day = daysBetween(cycleStart, logDate) + 1;
      const phase = getPhase(day, periodLength, avgCycleLength);
      for (const symptom of log.symptoms) {
        const s = symptom.toLowerCase().trim();
        if (!symptomMap.has(s)) symptomMap.set(s, new Map());
        const phaseMap = symptomMap.get(s)!;
        if (!phaseMap.has(phase)) phaseMap.set(phase, new Set());
        phaseMap.get(phase)!.add(ci);
      }
    }

    // Mood logs within this cycle
    for (const log of moodLogs) {
      const logDate = new Date(log.logDate);
      if (logDate < cycleStart || logDate > cycleEnd) continue;
      if (log.mood !== 'LOW' && log.mood !== 'BAD') continue;
      const day = daysBetween(cycleStart, logDate) + 1;
      const phase = getPhase(day, periodLength, avgCycleLength);
      if (!moodMap.has(phase)) moodMap.set(phase, new Set());
      moodMap.get(phase)!.add(ci);
    }
  }

  const patterns: CrossPhasePattern[] = [];
  const THRESHOLD = 0.6;

  // Symptom patterns
  for (const [symptom, phaseMap] of symptomMap) {
    for (const [phase, cycleSet] of phaseMap) {
      const rate = cycleSet.size / totalCycles;
      if (rate >= THRESHOLD) {
        patterns.push({
          type: 'symptom',
          name: symptom,
          phase,
          cycleCount: cycleSet.size,
          totalCycles,
          rate: Math.round(rate * 100) / 100,
          message: `You tend to get ${symptom} during your ${phase} phase (${cycleSet.size} of ${totalCycles} cycles).`,
        });
      }
    }
  }

  // Mood patterns
  for (const [phase, cycleSet] of moodMap) {
    const rate = cycleSet.size / totalCycles;
    if (rate >= THRESHOLD) {
      patterns.push({
        type: 'mood',
        name: 'low mood',
        phase,
        cycleCount: cycleSet.size,
        totalCycles,
        rate: Math.round(rate * 100) / 100,
        message: `Your mood tends to dip during your ${phase} phase (${cycleSet.size} of ${totalCycles} cycles).`,
      });
    }
  }

  return patterns;
}

export function generatePersonalizedTips(
  phase: Phase,
  cycleDay: number,
  cycleLength: number,
  dosha: string | null,
  patterns: CrossPhasePattern[],
  recentSymptoms: string[],
  wellness: { waterGlasses: number; exerciseLogged: boolean },
): Tip[] {
  const tips: Tip[] = [];
  const periodLength = 5; // reasonable default for tip phase math
  const doshaKey = dosha || 'Vata';

  // 1. Pattern-based warnings (highest priority)
  for (const pattern of patterns) {
    const patternPhaseStart = phaseStartDay(pattern.phase as Phase, periodLength, cycleLength);
    const daysUntilPhase = patternPhaseStart - cycleDay;
    if (daysUntilPhase > 0 && daysUntilPhase <= 5) {
      const remedy = pattern.type === 'symptom'
        ? getSymptomRemedy(pattern.name, doshaKey)
        : 'Try pranayama and journaling to prepare emotionally.';
      tips.push({
        tip: `Based on your history, ${pattern.name} usually starts in your ${pattern.phase} phase. ${remedy}`,
        category: 'pattern',
        emoji: '🔮',
      });
    }
  }

  // 2. Symptom-reactive tips
  for (const symptom of recentSymptoms) {
    const s = symptom.toLowerCase().trim();
    const tipText = SYMPTOM_TIPS[s]?.[doshaKey] || SYMPTOM_TIPS[s]?.default;
    if (tipText && tips.length < 4) {
      tips.push({ tip: tipText, category: 'symptom', emoji: '💡' });
    }
  }

  // 3. Wellness-gap tips
  if (wellness.waterGlasses < 4 && tips.length < 4) {
    tips.push({
      tip: `You've only had ${wellness.waterGlasses} glasses of water today. Aim for at least 8 to support your cycle.`,
      category: 'wellness',
      emoji: '💧',
    });
  }
  if (!wellness.exerciseLogged && tips.length < 4) {
    tips.push({
      tip: phase === 'menstrual'
        ? 'Even gentle stretching or a short walk can help with period symptoms.'
        : 'Try to fit in some movement today — even 15 minutes makes a difference.',
      category: 'wellness',
      emoji: '🏃‍♀️',
    });
  }

  // 4. Phase-generic dosha tips
  const phaseTips = DOSHA_PHASE_TIPS[doshaKey]?.[phase] || [];
  for (const t of phaseTips) {
    if (tips.length >= 4) break;
    tips.push({ tip: t, category: 'phase', emoji: '🌿' });
  }

  return tips.slice(0, 4);
}

function getSymptomRemedy(symptom: string, dosha: string): string {
  const s = symptom.toLowerCase().trim();
  if (s === 'cramps') return 'Consider warm ginger tea ahead of time.';
  if (s === 'headache') return 'Keep peppermint oil handy.';
  if (s === 'bloating') return 'Start sipping fennel tea a few days early.';
  if (s === 'fatigue') return 'Prioritize early sleep this week.';
  return SYMPTOM_TIPS[s]?.[dosha] || 'Prepare with rest and nourishing foods.';
}

export function generatePredictions(
  patterns: CrossPhasePattern[],
  cycleDay: number,
  cycleLength: number,
  phase: Phase,
): Prediction[] {
  const predictions: Prediction[] = [];
  const periodLength = 5;

  // PMS forecast: patterns in late luteal
  const lutealPatterns = patterns.filter((p) => p.phase === 'luteal');
  if (lutealPatterns.length > 0) {
    const lutealStart = phaseStartDay('luteal', periodLength, cycleLength);
    const daysUntil = lutealStart - cycleDay;
    if (daysUntil > 0 && (phase === 'follicular' || phase === 'ovulation')) {
      const symptomNames = lutealPatterns.map((p) => p.name).join(', ');
      predictions.push({
        prediction: `PMS symptoms (${symptomNames}) likely in about ${daysUntil} days based on your history.`,
        daysAhead: daysUntil,
        confidence: lutealPatterns.some((p) => p.rate >= 0.8) ? 'high' : 'medium',
        basedOn: `Detected in ${lutealPatterns[0].cycleCount} of ${lutealPatterns[0].totalCycles} cycles`,
      });
    }
  }

  // Energy forecast: fatigue pattern in luteal, currently in follicular/ovulation
  const fatiguePattern = patterns.find((p) => p.name === 'fatigue' && p.phase === 'luteal');
  if (fatiguePattern && (phase === 'follicular' || phase === 'ovulation')) {
    const lutealStart = phaseStartDay('luteal', periodLength, cycleLength);
    const daysUntil = lutealStart - cycleDay;
    if (daysUntil > 0) {
      predictions.push({
        prediction: `Energy dip expected in about ${daysUntil} days. Make the most of your current high-energy phase!`,
        daysAhead: daysUntil,
        confidence: fatiguePattern.rate >= 0.8 ? 'high' : 'medium',
        basedOn: `Fatigue detected in ${fatiguePattern.cycleCount} of ${fatiguePattern.totalCycles} luteal phases`,
      });
    }
  }

  // Mood forecast: mood dip pattern approaching
  const moodPatterns = patterns.filter((p) => p.type === 'mood');
  for (const mp of moodPatterns) {
    const targetStart = phaseStartDay(mp.phase as Phase, periodLength, cycleLength);
    const daysUntil = targetStart - cycleDay;
    if (daysUntil > 0 && daysUntil <= 10) {
      predictions.push({
        prediction: `Mood may dip in about ${daysUntil} days during your ${mp.phase} phase. Plan self-care activities.`,
        daysAhead: daysUntil,
        confidence: mp.rate >= 0.8 ? 'high' : 'medium',
        basedOn: `Low mood detected in ${mp.cycleCount} of ${mp.totalCycles} ${mp.phase} phases`,
      });
    }
  }

  return predictions;
}

export function analyzeMoodTrends(
  moodLogs: { mood: string; logDate: Date }[],
  cycles: { startDate: Date; endDate: Date | null }[],
  avgCycleLength: number,
): MoodTrends {
  const periodLength = 5;
  const phaseScores: Record<string, number[]> = {
    menstrual: [], follicular: [], ovulation: [], luteal: [],
  };

  // Group moods by phase across cycles
  for (const cycle of cycles) {
    const cycleStart = new Date(cycle.startDate);
    const cycleEnd = cycle.endDate
      ? new Date(cycle.endDate)
      : new Date(cycleStart.getTime() + avgCycleLength * 86_400_000);

    for (const log of moodLogs) {
      const logDate = new Date(log.logDate);
      if (logDate < cycleStart || logDate > cycleEnd) continue;
      const day = daysBetween(cycleStart, logDate) + 1;
      const phase = getPhase(day, periodLength, avgCycleLength);
      const score = MOOD_SCORES[log.mood];
      if (score !== undefined) phaseScores[phase].push(score);
    }
  }

  // Average mood per phase
  const phaseAvg: Record<string, number> = {};
  for (const phase of PHASES) {
    const scores = phaseScores[phase];
    phaseAvg[phase] = scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
      : 0;
  }

  const rankedPhases = PHASES.filter((p) => phaseAvg[p] > 0).sort((a, b) => phaseAvg[b] - phaseAvg[a]);
  const bestPhase = rankedPhases[0] || 'follicular';
  const worstPhase = rankedPhases[rankedPhases.length - 1] || 'luteal';

  // 4-week rolling trend
  const weeklyTrend: { week: string; avg: number }[] = [];
  const sortedLogs = [...moodLogs].sort((a, b) =>
    new Date(a.logDate).getTime() - new Date(b.logDate).getTime(),
  );
  if (sortedLogs.length > 0) {
    const endDate = new Date(sortedLogs[sortedLogs.length - 1].logDate);
    for (let w = 3; w >= 0; w--) {
      const weekEnd = new Date(endDate.getTime() - w * 7 * 86_400_000);
      const weekStart = new Date(weekEnd.getTime() - 7 * 86_400_000);
      const weekLogs = sortedLogs.filter((l) => {
        const d = new Date(l.logDate);
        return d >= weekStart && d <= weekEnd;
      });
      const scores = weekLogs.map((l) => MOOD_SCORES[l.mood]).filter((s) => s !== undefined);
      const avg = scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
        : 0;
      weeklyTrend.push({
        week: weekStart.toISOString().slice(0, 10),
        avg,
      });
    }
  }

  const insight = phaseAvg[bestPhase] > 0 && phaseAvg[worstPhase] > 0
    ? `Your mood is highest during ${bestPhase} phase and lowest during ${worstPhase}. This is a common pattern.`
    : 'Keep logging your mood daily to unlock phase-based mood insights.';

  return { phaseAvg, bestPhase, worstPhase, weeklyTrend, insight };
}

// ── Main Orchestrator ────────────────────────────────────────────

export async function getPersonalizedInsights(userId: string): Promise<InsightsResult> {
  const cacheKey = `insights:${userId}`;
  try {
    const cached = await cacheGet<InsightsResult>(cacheKey);
    if (cached) return cached;
  } catch {
    // continue without cache
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 180);

  const [cycles, symptomLogs, moodLogs, profile, waterLog] = await Promise.all([
    prisma.cycle.findMany({
      where: { userId },
      orderBy: { startDate: 'desc' },
      take: 24,
      select: { startDate: true, endDate: true, cycleLength: true, periodLength: true },
    }),
    prisma.symptomLog.findMany({
      where: { userId, logDate: { gte: cutoff } },
      select: { symptoms: true, logDate: true },
    }),
    prisma.moodLog.findMany({
      where: { userId, logDate: { gte: cutoff } },
      select: { mood: true, logDate: true },
    }),
    prisma.userProfile.findUnique({
      where: { userId },
      select: { dosha: true, periodLength: true },
    }),
    prisma.waterLog.findFirst({
      where: { userId, logDate: { gte: new Date(new Date().toISOString().slice(0, 10)) } },
      select: { glasses: true, targetGlasses: true },
    }),
  ]);

  // Compute average cycle length
  const cycleLengths = cycles
    .map((c: any) => c.cycleLength)
    .filter((l: number | null) => l != null && l > 0) as number[];
  const avgCycleLength = cycleLengths.length > 0
    ? Math.round(cycleLengths.reduce((a: number, b: number) => a + b, 0) / cycleLengths.length)
    : 28;

  const periodLength = profile?.periodLength || 5;
  const dosha: string | null = profile?.dosha || null;

  // Determine current cycle day and phase
  let cycleDay = 1;
  let currentPhase: Phase = 'menstrual';
  if (cycles.length > 0) {
    const latestCycleStart = new Date(cycles[0].startDate);
    cycleDay = daysBetween(latestCycleStart, new Date()) + 1;
    if (cycleDay > avgCycleLength) cycleDay = 1; // likely new cycle
    currentPhase = getPhase(cycleDay, periodLength, avgCycleLength);
  }

  // Run analysis
  const patterns = detectCrossPhasePatterns(
    cycles as any,
    symptomLogs as any,
    moodLogs as any,
    avgCycleLength,
    periodLength,
  );

  const recentSymptoms = symptomLogs
    .filter((l: any) => daysBetween(new Date(l.logDate), new Date()) <= 1)
    .flatMap((l: any) => l.symptoms);

  const tips = generatePersonalizedTips(
    currentPhase,
    cycleDay,
    avgCycleLength,
    dosha,
    patterns,
    recentSymptoms,
    {
      waterGlasses: waterLog?.glasses ?? 0,
      exerciseLogged: false, // extend when exercise tracking is added
    },
  );

  const predictions = generatePredictions(patterns, cycleDay, avgCycleLength, currentPhase);
  const moodTrends = analyzeMoodTrends(moodLogs as any, cycles as any, avgCycleLength);

  const result: InsightsResult = {
    tips,
    patterns,
    predictions,
    moodTrends,
    lastUpdated: new Date().toISOString(),
  };

  try {
    await cacheSet(cacheKey, result, 1800);
  } catch {
    logger.warn(`Failed to cache insights for user ${userId}`);
  }

  return result;
}
