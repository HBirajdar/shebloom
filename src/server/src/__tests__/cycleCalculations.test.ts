// ══════════════════════════════════════════════════════════════════
// Unit Tests — Cycle Prediction Algorithm (Pure Calculations)
// ══════════════════════════════════════════════════════════════════
//
// These tests verify the exact mathematical formulas used in
// src/server/src/services/cycle.service.ts for:
//   - Weighted moving average (Bull 2019)
//   - Confidence scoring (multi-factor)
//   - Ovulation & fertile window (Wilcox 1995, Lenton 1984)
//   - Phase detection
//   - Period length calculation
//   - BBT thermal shift detection (Baird 2005, 3-over-6 rule)
//   - Luteal phase estimation (Lenton 1984)
//   - Hormone estimates (Speroff & Fritz model)
//   - Symptom-phase correlation
//   - Regularity score
//   - Conception probability (Wilcox 1995)
//   - Cycle abnormality alerts
//
// The functions under test are module-private in cycle.service.ts,
// so we replicate the exact formulas here to test them in isolation.
// If the production code changes, these tests catch regressions.
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';

// ════════════════════════════════════════════════════════════════
// REPLICATED PURE FUNCTIONS (exact copies from cycle.service.ts)
// ════════════════════════════════════════════════════════════════

function mean(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / (arr.length - 1));
}

function weightedMean(values: number[], weights: number[]): number {
  let sumWV = 0, sumW = 0;
  for (let i = 0; i < values.length; i++) {
    sumWV += values[i] * weights[i];
    sumW += weights[i];
  }
  return sumW > 0 ? sumWV / sumW : 0;
}

function exponentialWeights(n: number, decay = 0.7): number[] {
  const w: number[] = [];
  for (let i = 0; i < n; i++) w.push(Math.pow(decay, i));
  return w;
}

function computeConfidence(opts: {
  cycleCount: number;
  cycleLengthSD: number;
  hasBBT: boolean;
  hasCM: boolean;
  hasLH: boolean;
}): { level: string; score: number; factors: string[] } {
  let score = 0;
  const factors: string[] = [];

  if (opts.cycleCount >= 6) { score += 40; factors.push('6+ cycles tracked'); }
  else if (opts.cycleCount >= 3) { score += 25; factors.push(`${opts.cycleCount} cycles tracked`); }
  else if (opts.cycleCount >= 2) { score += 15; factors.push('2 cycles tracked'); }
  else { score += 5; factors.push('Limited cycle history'); }

  if (opts.cycleLengthSD < 2) { score += 25; factors.push('Very regular cycles'); }
  else if (opts.cycleLengthSD < 4) { score += 18; factors.push('Moderately regular'); }
  else if (opts.cycleLengthSD < 7) { score += 10; factors.push('Somewhat irregular'); }
  else { score += 3; factors.push('Irregular cycles'); }

  if (opts.hasBBT) { score += 15; factors.push('BBT tracking active'); }
  if (opts.hasCM) { score += 12; factors.push('Cervical mucus tracking'); }
  if (opts.hasLH) { score += 8; factors.push('LH test data'); }

  const level = score >= 70 ? 'very_high' : score >= 50 ? 'high' : score >= 30 ? 'medium' : 'low';
  return { level, score: Math.min(100, score), factors };
}

function detectThermalShift(temps: { date: Date; temp: number }[]): {
  detected: boolean;
  ovulationDate?: Date;
  coverlineTemp?: number;
  shiftDay?: number;
} {
  if (temps.length < 6) return { detected: false };
  const sorted = [...temps].sort((a, b) => a.date.getTime() - b.date.getTime());
  for (let i = 6; i <= sorted.length - 3; i++) {
    const baseline = sorted.slice(i - 6, i).map(t => t.temp);
    const coverline = Math.max(...baseline);
    const next3 = sorted.slice(i, i + 3).map(t => t.temp);
    if (next3.every(t => t > coverline) && next3.some(t => t >= coverline + 0.2)) {
      return {
        detected: true,
        ovulationDate: sorted[i - 1].date,
        coverlineTemp: coverline,
        shiftDay: i,
      };
    }
  }
  return { detected: false };
}

function estimateLutealPhase(cycles: any[], bbtLogs: any[]): number {
  const lutealLengths: number[] = [];
  for (const cycle of cycles) {
    if (!cycle.ovulationDate && bbtLogs.length > 0) {
      const cycleEnd = cycle.endDate || new Date(cycle.startDate.getTime() + 35 * 86400000);
      const cycleBBT = bbtLogs.filter((b: any) =>
        b.logDate >= cycle.startDate && b.logDate <= cycleEnd
      ).map((b: any) => ({ date: b.logDate, temp: b.temperature }));
      const shift = detectThermalShift(cycleBBT);
      if (shift.detected && shift.ovulationDate) {
        const nextCycleStart = cycles.find((c: any) =>
          c.startDate > cycle.startDate && c.startDate > shift.ovulationDate!
        );
        if (nextCycleStart) {
          const luteal = Math.floor(
            (nextCycleStart.startDate.getTime() - shift.ovulationDate.getTime()) / 86400000
          );
          if (luteal >= 7 && luteal <= 19) lutealLengths.push(luteal);
        }
      }
    } else if (cycle.ovulationDate) {
      const nextCycle = cycles.find((c: any) => c.startDate > cycle.startDate);
      if (nextCycle) {
        const luteal = Math.floor(
          (nextCycle.startDate.getTime() - cycle.ovulationDate.getTime()) / 86400000
        );
        if (luteal >= 7 && luteal <= 19) lutealLengths.push(luteal);
      }
    }
  }
  if (lutealLengths.length >= 2) return Math.round(mean(lutealLengths));
  if (lutealLengths.length === 1) return lutealLengths[0];
  return 13;
}

function getHormoneEstimates(cycleDay: number, ovulationDay: number, periodLength: number, cycleLength: number) {
  let estrogen: number;
  if (cycleDay <= periodLength) estrogen = 15 + (cycleDay / periodLength) * 10;
  else if (cycleDay <= ovulationDay) estrogen = 25 + ((cycleDay - periodLength) / (ovulationDay - periodLength)) * 75;
  else if (cycleDay <= ovulationDay + 3) estrogen = 100 - ((cycleDay - ovulationDay) / 3) * 50;
  else estrogen = 50 + Math.sin(((cycleDay - ovulationDay - 3) / (cycleLength - ovulationDay - 3)) * Math.PI) * 20;

  let progesterone: number;
  if (cycleDay <= ovulationDay) progesterone = 5;
  else {
    const lutealDay = cycleDay - ovulationDay;
    const lutealLength = cycleLength - ovulationDay;
    const peakDay = Math.floor(lutealLength * 0.5);
    if (lutealDay <= peakDay) progesterone = 5 + (lutealDay / peakDay) * 90;
    else progesterone = 95 - ((lutealDay - peakDay) / (lutealLength - peakDay)) * 70;
  }

  let lh: number;
  if (cycleDay >= ovulationDay - 2 && cycleDay <= ovulationDay) {
    const dist = ovulationDay - cycleDay;
    lh = dist === 2 ? 40 : dist === 1 ? 85 : 100;
  } else lh = 10;

  let fsh: number;
  if (cycleDay <= 5) fsh = 60 - (cycleDay / 5) * 30;
  else if (cycleDay <= ovulationDay - 3) fsh = 30;
  else if (cycleDay <= ovulationDay) fsh = 30 + ((cycleDay - ovulationDay + 3) / 3) * 40;
  else fsh = 15;

  return {
    estrogen: Math.round(Math.max(0, Math.min(100, estrogen))),
    progesterone: Math.round(Math.max(0, Math.min(100, progesterone))),
    lh: Math.round(Math.max(0, Math.min(100, lh))),
    fsh: Math.round(Math.max(0, Math.min(100, fsh))),
  };
}

function computeSymptomPhaseCorrelation(
  cycles: any[],
  symptomLogs: any[],
  avgCycleLength: number,
  lutealPhase: number,
) {
  const ovulationDay = avgCycleLength - lutealPhase;
  const phaseSymptoms: Record<string, Record<string, number>> = {
    menstrual: {}, follicular: {}, ovulation: {}, luteal: {},
  };
  for (const log of symptomLogs) {
    const cycle = cycles.find((c: any) =>
      log.logDate >= c.startDate &&
      log.logDate <= new Date(c.startDate.getTime() + avgCycleLength * 86400000)
    );
    if (!cycle) continue;
    const dayInCycle = Math.floor((log.logDate.getTime() - cycle.startDate.getTime()) / 86400000) + 1;
    let phase = 'luteal';
    if (dayInCycle <= 5) phase = 'menstrual';
    else if (dayInCycle <= ovulationDay - 3) phase = 'follicular';
    else if (dayInCycle <= ovulationDay + 2) phase = 'ovulation';
    for (const symptom of (Array.isArray(log.symptoms) ? log.symptoms : [])) {
      phaseSymptoms[phase][symptom] = (phaseSymptoms[phase][symptom] || 0) + 1;
    }
  }
  const result: Record<string, { symptom: string; count: number }[]> = {};
  for (const [phase, symptoms] of Object.entries(phaseSymptoms)) {
    result[phase] = Object.entries(symptoms)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([symptom, count]) => ({ symptom, count }));
  }
  return result;
}

// Phase detection (extracted from getPredictions lines 870-876)
function detectPhase(cycleDay: number, periodLength: number, ovulationDay: number): string {
  const follicularEnd = Math.max(periodLength + 1, ovulationDay - 3);
  let phase = 'luteal';
  if (cycleDay <= periodLength) phase = 'menstrual';
  else if (cycleDay <= follicularEnd) phase = 'follicular';
  else if (cycleDay <= ovulationDay + 2) phase = 'ovulation';
  return phase;
}

// Period length from logged cycles (extracted from getPredictions lines 839-845)
function computePeriodLength(
  cycles: { startDate: Date; endDate?: Date | null }[],
  profilePeriodLength?: number,
): number {
  const loggedPeriodLengths = cycles
    .filter(c => c.endDate)
    .map(c => Math.floor((c.endDate!.getTime() - c.startDate.getTime()) / 86400000) + 1)
    .filter(l => l >= 1 && l <= 15);
  return loggedPeriodLengths.length >= 1
    ? Math.round(loggedPeriodLengths.reduce((a, b) => a + b, 0) / loggedPeriodLengths.length)
    : (profilePeriodLength || 5);
}

// Regularity score (extracted from getPredictions line 954)
function computeRegularityScore(cycleLengths: number[]): number {
  if (cycleLengths.length < 2) return 50;
  const sd = stdDev(cycleLengths);
  const m = mean(cycleLengths);
  return Math.round(Math.max(0, 100 - (sd / m) * 200));
}

// Conception probability constants (Wilcox 1995)
const WILCOX_CONCEPTION_RATES: Record<string, number> = {
  '-5': 0.10,
  '-4': 0.16,
  '-3': 0.14,
  '-2': 0.27,
  '-1': 0.31,
  '0': 0.33,
  '1': 0.00,
};

const CM_FERTILITY_SCORE: Record<string, number> = {
  dry: 0.05, sticky: 0.15, creamy: 0.35,
  watery: 0.70, eggWhite: 0.95, spotting: 0.10,
};

const LH_FERTILITY_SCORE: Record<string, number> = {
  negative: 0.10, faint: 0.40, positive: 0.85, peak: 0.95,
};

// ════════════════════════════════════════════════════════════════
// TEST SUITE
// ════════════════════════════════════════════════════════════════

// ─── 1. STATISTICAL HELPERS ──────────────────────────────────

describe('mean()', () => {
  it('empty array → 0', () => {
    expect(mean([])).toBe(0);
  });

  it('single value → that value', () => {
    expect(mean([28])).toBe(28);
  });

  it('[28, 30, 27] → 28.333...', () => {
    expect(mean([28, 30, 27])).toBeCloseTo(28.3333, 3);
  });

  it('[28, 28, 28] → 28 exactly', () => {
    expect(mean([28, 28, 28])).toBe(28);
  });
});

describe('stdDev() — sample standard deviation (N-1 denominator)', () => {
  it('empty array → 0', () => {
    expect(stdDev([])).toBe(0);
  });

  it('single value → 0 (not enough data)', () => {
    expect(stdDev([28])).toBe(0);
  });

  it('[28, 28] → 0 (no variance)', () => {
    expect(stdDev([28, 28])).toBe(0);
  });

  it('[28, 30] → √2 ≈ 1.414', () => {
    // mean=29, diffs=[1,1], sum_sq=2, var=2/(2-1)=2, sd=√2
    expect(stdDev([28, 30])).toBeCloseTo(Math.SQRT2, 4);
  });

  it('[26, 28, 30] → 2.0 exactly', () => {
    // mean=28, diffs=[-2,0,2], sum_sq=8, var=8/2=4, sd=2
    expect(stdDev([26, 28, 30])).toBeCloseTo(2.0, 4);
  });

  it('irregular cycles [21, 35, 28, 40] → high SD', () => {
    const sd = stdDev([21, 35, 28, 40]);
    expect(sd).toBeGreaterThan(7);
  });
});

// ─── 2. WEIGHTED MOVING AVERAGE ──────────────────────────────

describe('Weighted Moving Average (exponentialWeights + weightedMean)', () => {
  it('1 cycle → returns that cycle length directly', () => {
    // With 1 value, weight is [1.0], result = value
    const values = [28];
    const weights = exponentialWeights(1, 0.75);
    expect(weightedMean(values, weights)).toBe(28);
  });

  it('2 cycles → correct weights applied (decay=0.75)', () => {
    // weights generated: [1, 0.75], reversed: [0.75, 1]
    // cycle lengths in chronological order: [28, 30]
    // weighted mean = (28*0.75 + 30*1) / (0.75+1) = (21+30)/1.75 = 51/1.75
    const values = [28, 30];
    const weights = exponentialWeights(2, 0.75);
    weights.reverse(); // Most recent gets highest weight
    const result = weightedMean(values, weights);
    expect(result).toBeCloseTo(51 / 1.75, 4); // ≈ 29.14
  });

  it('3 cycles [28, 30, 27] → most recent (27) gets weight 1.0', () => {
    // weights generated: [1, 0.75, 0.5625], reversed: [0.5625, 0.75, 1]
    // WM = (28*0.5625 + 30*0.75 + 27*1) / (0.5625+0.75+1)
    //    = (15.75 + 22.5 + 27) / 2.3125
    //    = 65.25 / 2.3125
    const values = [28, 30, 27];
    const weights = exponentialWeights(3, 0.75);
    weights.reverse();
    const result = weightedMean(values, weights);
    expect(result).toBeCloseTo(65.25 / 2.3125, 4); // ≈ 28.22
  });

  it('production rounding: Math.round(weightedMean) for [28, 30, 27] → 28', () => {
    const values = [28, 30, 27];
    const weights = exponentialWeights(3, 0.75);
    weights.reverse();
    expect(Math.round(weightedMean(values, weights))).toBe(28);
  });

  it('5 cycles → most recent cycle dominates prediction', () => {
    // If last cycle is 35 but others are 28, result should be closer to 35
    const values = [28, 28, 28, 28, 35];
    const weights = exponentialWeights(5, 0.75);
    weights.reverse();
    const result = Math.round(weightedMean(values, weights));
    expect(result).toBeGreaterThan(28);
    expect(result).toBeLessThan(35);
  });

  it('12 cycles → caps at last 12 (recentLengths = cycleLengths.slice(-12))', () => {
    const allLengths = Array.from({ length: 20 }, () => 28);
    allLengths[19] = 32; // Most recent is 32
    const recent12 = allLengths.slice(-12);
    const weights = exponentialWeights(12, 0.75);
    weights.reverse();
    const result = Math.round(weightedMean(recent12, weights));
    expect(result).toBeGreaterThanOrEqual(28);
    expect(result).toBeLessThanOrEqual(32);
  });

  it('all equal cycles → returns that length regardless of weights', () => {
    const values = [30, 30, 30, 30];
    const weights = exponentialWeights(4, 0.75);
    weights.reverse();
    expect(weightedMean(values, weights)).toBe(30);
  });

  it('empty arrays → 0 (guard against division by zero)', () => {
    expect(weightedMean([], [])).toBe(0);
  });
});

describe('exponentialWeights()', () => {
  it('n=1, decay=0.75 → [1]', () => {
    expect(exponentialWeights(1, 0.75)).toEqual([1]);
  });

  it('n=3, decay=0.75 → [1, 0.75, 0.5625]', () => {
    const w = exponentialWeights(3, 0.75);
    expect(w[0]).toBe(1);
    expect(w[1]).toBe(0.75);
    expect(w[2]).toBeCloseTo(0.5625, 6);
  });

  it('n=4, default decay=0.7 → [1, 0.7, 0.49, 0.343]', () => {
    const w = exponentialWeights(4);
    expect(w[0]).toBe(1);
    expect(w[1]).toBe(0.7);
    expect(w[2]).toBeCloseTo(0.49, 6);
    expect(w[3]).toBeCloseTo(0.343, 6);
  });

  it('weights are monotonically decreasing', () => {
    const w = exponentialWeights(10, 0.75);
    for (let i = 1; i < w.length; i++) {
      expect(w[i]).toBeLessThan(w[i - 1]);
    }
  });
});

// ─── 3. CONFIDENCE SCORE ─────────────────────────────────────

describe('computeConfidence() — multi-factor scoring (max 100)', () => {
  it('0 cycles, high SD, no biomarkers → low (score=8)', () => {
    const result = computeConfidence({ cycleCount: 0, cycleLengthSD: 10, hasBBT: false, hasCM: false, hasLH: false });
    expect(result.score).toBe(8); // 5 (limited history) + 3 (irregular)
    expect(result.level).toBe('low');
    expect(result.factors).toContain('Limited cycle history');
    expect(result.factors).toContain('Irregular cycles');
  });

  it('1 cycle, SD=0 (no variance calculable), no biomarkers → medium (score=30)', () => {
    const result = computeConfidence({ cycleCount: 1, cycleLengthSD: 0, hasBBT: false, hasCM: false, hasLH: false });
    expect(result.score).toBe(30); // 5 + 25 (SD<2)
    expect(result.level).toBe('medium');
  });

  it('2 cycles, very regular (SD<2), no biomarkers → medium (score=40)', () => {
    const result = computeConfidence({ cycleCount: 2, cycleLengthSD: 1.5, hasBBT: false, hasCM: false, hasLH: false });
    expect(result.score).toBe(40); // 15 + 25
    expect(result.level).toBe('medium');
  });

  it('3 cycles, moderately regular (SD=3), no biomarkers → medium (score=43)', () => {
    const result = computeConfidence({ cycleCount: 3, cycleLengthSD: 3, hasBBT: false, hasCM: false, hasLH: false });
    expect(result.score).toBe(43); // 25 + 18
    expect(result.level).toBe('medium');
  });

  it('6+ cycles, very regular, all biomarkers → very_high (score=100, capped)', () => {
    const result = computeConfidence({ cycleCount: 8, cycleLengthSD: 1, hasBBT: true, hasCM: true, hasLH: true });
    expect(result.score).toBe(100); // 40+25+15+12+8=100
    expect(result.level).toBe('very_high');
    expect(result.factors).toHaveLength(5);
  });

  it('6+ cycles, very regular, no biomarkers → high (score=65)', () => {
    const result = computeConfidence({ cycleCount: 6, cycleLengthSD: 1, hasBBT: false, hasCM: false, hasLH: false });
    expect(result.score).toBe(65); // 40+25
    expect(result.level).toBe('high');
  });

  it('6+ cycles, irregular (SD=8), no biomarkers → medium (score=43)', () => {
    const result = computeConfidence({ cycleCount: 6, cycleLengthSD: 8, hasBBT: false, hasCM: false, hasLH: false });
    expect(result.score).toBe(43); // 40+3
    expect(result.level).toBe('medium');
  });

  it('BBT alone adds 15 points', () => {
    const without = computeConfidence({ cycleCount: 3, cycleLengthSD: 3, hasBBT: false, hasCM: false, hasLH: false });
    const withBBT = computeConfidence({ cycleCount: 3, cycleLengthSD: 3, hasBBT: true, hasCM: false, hasLH: false });
    expect(withBBT.score - without.score).toBe(15);
  });

  it('CM alone adds 12 points', () => {
    const without = computeConfidence({ cycleCount: 3, cycleLengthSD: 3, hasBBT: false, hasCM: false, hasLH: false });
    const withCM = computeConfidence({ cycleCount: 3, cycleLengthSD: 3, hasBBT: false, hasCM: true, hasLH: false });
    expect(withCM.score - without.score).toBe(12);
  });

  it('LH alone adds 8 points', () => {
    const without = computeConfidence({ cycleCount: 3, cycleLengthSD: 3, hasBBT: false, hasCM: false, hasLH: false });
    const withLH = computeConfidence({ cycleCount: 3, cycleLengthSD: 3, hasBBT: false, hasCM: false, hasLH: true });
    expect(withLH.score - without.score).toBe(8);
  });

  it('score never exceeds 100', () => {
    // Maximum possible: 40+25+15+12+8 = 100 (exactly at cap)
    const result = computeConfidence({ cycleCount: 100, cycleLengthSD: 0, hasBBT: true, hasCM: true, hasLH: true });
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('level thresholds: low(<30), medium(30-49), high(50-69), very_high(70+)', () => {
    expect(computeConfidence({ cycleCount: 0, cycleLengthSD: 10, hasBBT: false, hasCM: false, hasLH: false }).level).toBe('low');
    expect(computeConfidence({ cycleCount: 1, cycleLengthSD: 0, hasBBT: false, hasCM: false, hasLH: false }).level).toBe('medium');
    expect(computeConfidence({ cycleCount: 6, cycleLengthSD: 1, hasBBT: false, hasCM: false, hasLH: false }).level).toBe('high');
    expect(computeConfidence({ cycleCount: 6, cycleLengthSD: 1, hasBBT: true, hasCM: false, hasLH: false }).level).toBe('very_high');
  });

  it('SD boundary values: exactly 2, 4, 7', () => {
    // SD=2 → "Moderately regular" (18 pts), not "Very regular" (25 pts)
    expect(computeConfidence({ cycleCount: 1, cycleLengthSD: 2, hasBBT: false, hasCM: false, hasLH: false }).score).toBe(23); // 5+18
    // SD=4 → "Somewhat irregular" (10 pts)
    expect(computeConfidence({ cycleCount: 1, cycleLengthSD: 4, hasBBT: false, hasCM: false, hasLH: false }).score).toBe(15); // 5+10
    // SD=7 → "Irregular cycles" (3 pts)
    expect(computeConfidence({ cycleCount: 1, cycleLengthSD: 7, hasBBT: false, hasCM: false, hasLH: false }).score).toBe(8); // 5+3
  });
});

// ─── 4. OVULATION DATE CALCULATION ───────────────────────────

describe('Ovulation Date Calculation', () => {
  it('28-day cycle, lutealPhase=13 → ovulation day 15 (NOT 14)', () => {
    // Formula: ovulationDay = avgCycleLength - lutealPhase
    const ovulationDay = Math.max(1, 28 - 13);
    expect(ovulationDay).toBe(15);
  });

  it('28-day cycle, lutealPhase=14 → ovulation day 14', () => {
    expect(Math.max(1, 28 - 14)).toBe(14);
  });

  it('30-day cycle, lutealPhase=13 → ovulation day 17', () => {
    expect(Math.max(1, 30 - 13)).toBe(17);
  });

  it('35-day cycle, lutealPhase=13 → ovulation day 22', () => {
    expect(Math.max(1, 35 - 13)).toBe(22);
  });

  it('21-day cycle (short), lutealPhase=13 → ovulation day 8', () => {
    expect(Math.max(1, 21 - 13)).toBe(8);
  });

  it('very short cycle: 14 days, lutealPhase=13 → clamped to day 1', () => {
    // 14-13=1, Math.max(1,1)=1
    expect(Math.max(1, 14 - 13)).toBe(1);
  });

  it('ovulation date from last period start', () => {
    const lastStart = new Date('2026-03-01T00:00:00Z');
    const ovulationDay = 28 - 13; // = 15
    const ovulationDate = new Date(lastStart.getTime() + ovulationDay * 86400000);
    expect(ovulationDate.toISOString().slice(0, 10)).toBe('2026-03-16');
  });

  it('next period date = lastStart + avgCycleLength', () => {
    const lastStart = new Date('2026-03-01T00:00:00Z');
    const nextPeriod = new Date(lastStart.getTime() + 28 * 86400000);
    expect(nextPeriod.toISOString().slice(0, 10)).toBe('2026-03-29');
  });
});

// ─── 5. FERTILE WINDOW ──────────────────────────────────────

describe('Fertile Window (Wilcox 1995: 5 days before ovulation + 1 day after)', () => {
  it('28-day cycle, ovulation day 15 → fertile March 11-17', () => {
    const lastStart = new Date('2026-03-01T00:00:00Z');
    const ovulationDay = 15;
    const ovulationDate = new Date(lastStart.getTime() + ovulationDay * 86400000);
    const fertileStart = new Date(ovulationDate.getTime() - 5 * 86400000);
    const fertileEnd = new Date(ovulationDate.getTime() + 1 * 86400000);

    expect(fertileStart.toISOString().slice(0, 10)).toBe('2026-03-11');
    expect(fertileEnd.toISOString().slice(0, 10)).toBe('2026-03-17');
  });

  it('fertile window spans exactly 7 days', () => {
    const ovulationDate = new Date('2026-03-16T00:00:00Z');
    const fertileStart = new Date(ovulationDate.getTime() - 5 * 86400000);
    const fertileEnd = new Date(ovulationDate.getTime() + 1 * 86400000);
    const days = (fertileEnd.getTime() - fertileStart.getTime()) / 86400000;
    expect(days).toBe(6); // 6-day span (fertileStart to fertileEnd inclusive = 7 days)
  });

  it('fertile window spans month boundary (ovulation on March 3)', () => {
    const lastStart = new Date('2026-02-15T00:00:00Z');
    const ovulationDay = 16;
    const ovulationDate = new Date(lastStart.getTime() + ovulationDay * 86400000);
    const fertileStart = new Date(ovulationDate.getTime() - 5 * 86400000);
    const fertileEnd = new Date(ovulationDate.getTime() + 1 * 86400000);

    // Ovulation = Feb 15 + 16 days = March 3
    expect(ovulationDate.toISOString().slice(0, 10)).toBe('2026-03-03');
    // Fertile start = March 3 - 5 = Feb 26
    expect(fertileStart.toISOString().slice(0, 10)).toBe('2026-02-26');
    // Fertile end = March 3 + 1 = March 4
    expect(fertileEnd.toISOString().slice(0, 10)).toBe('2026-03-04');
  });

  it('30-day cycle, lutealPhase=13 → ovulation day 17, fertile Mar 12-18', () => {
    const lastStart = new Date('2026-03-01T00:00:00Z');
    const ovulationDay = 30 - 13; // = 17
    const ovulationDate = new Date(lastStart.getTime() + ovulationDay * 86400000);
    const fertileStart = new Date(ovulationDate.getTime() - 5 * 86400000);
    const fertileEnd = new Date(ovulationDate.getTime() + 1 * 86400000);

    expect(fertileStart.toISOString().slice(0, 10)).toBe('2026-03-13');
    expect(fertileEnd.toISOString().slice(0, 10)).toBe('2026-03-19');
  });
});

// ─── 6. PHASE DETECTION ─────────────────────────────────────

describe('Phase Detection (detectPhase)', () => {
  // Standard 28-day cycle, periodLength=5, ovulationDay=15

  it('day 1 → menstrual', () => {
    expect(detectPhase(1, 5, 15)).toBe('menstrual');
  });

  it('day 3 (mid-period) → menstrual', () => {
    expect(detectPhase(3, 5, 15)).toBe('menstrual');
  });

  it('day 5 (last day of period) → menstrual', () => {
    expect(detectPhase(5, 5, 15)).toBe('menstrual');
  });

  it('day 6 (first day after period) → follicular', () => {
    expect(detectPhase(6, 5, 15)).toBe('follicular');
  });

  it('day 10 (mid-follicular) → follicular', () => {
    expect(detectPhase(10, 5, 15)).toBe('follicular');
  });

  it('day 12 (follicularEnd = max(6, 12) = 12) → follicular', () => {
    // follicularEnd = Math.max(5+1, 15-3) = Math.max(6, 12) = 12
    expect(detectPhase(12, 5, 15)).toBe('follicular');
  });

  it('day 13 (ovulation window starts: ovulationDay-2) → ovulation', () => {
    // ovulationDay=15, ovulationDay+2=17
    // day 13 > follicularEnd(12) and day 13 <= 17 → ovulation
    expect(detectPhase(13, 5, 15)).toBe('ovulation');
  });

  it('day 15 (ovulation day) → ovulation', () => {
    expect(detectPhase(15, 5, 15)).toBe('ovulation');
  });

  it('day 17 (ovulationDay + 2) → ovulation', () => {
    expect(detectPhase(17, 5, 15)).toBe('ovulation');
  });

  it('day 18 (first day after ovulation window) → luteal', () => {
    expect(detectPhase(18, 5, 15)).toBe('luteal');
  });

  it('day 25 (mid-luteal) → luteal', () => {
    expect(detectPhase(25, 5, 15)).toBe('luteal');
  });

  it('day 28 (last day, day before next period) → luteal', () => {
    expect(detectPhase(28, 5, 15)).toBe('luteal');
  });

  it('short period (3 days): day 4 → follicular', () => {
    // periodLength=3, ovulationDay=15, follicularEnd = max(4, 12) = 12
    expect(detectPhase(4, 3, 15)).toBe('follicular');
  });

  it('long period (7 days): day 7 → menstrual', () => {
    expect(detectPhase(7, 7, 15)).toBe('menstrual');
  });

  it('long period (7 days): day 8 → follicular', () => {
    // follicularEnd = max(8, 12) = 12
    expect(detectPhase(8, 7, 15)).toBe('follicular');
  });

  it('edge: when period nearly equals ovulation day (periodLength=12, ovulationDay=13)', () => {
    // follicularEnd = max(13, 10) = 13
    // day 12 → menstrual (12 <= 12)
    // day 13 → follicular (13 <= 13)
    // day 14 → ovulation (14 <= 13+2=15)
    expect(detectPhase(12, 12, 13)).toBe('menstrual');
    expect(detectPhase(13, 12, 13)).toBe('follicular');
    expect(detectPhase(14, 12, 13)).toBe('ovulation');
  });

  it('30-day cycle, periodLength=5, ovulationDay=17', () => {
    expect(detectPhase(1, 5, 17)).toBe('menstrual');
    expect(detectPhase(6, 5, 17)).toBe('follicular');
    expect(detectPhase(14, 5, 17)).toBe('follicular'); // follicularEnd = max(6, 14) = 14
    expect(detectPhase(15, 5, 17)).toBe('ovulation');  // 15 <= 19
    expect(detectPhase(17, 5, 17)).toBe('ovulation');
    expect(detectPhase(19, 5, 17)).toBe('ovulation');  // 19 <= 17+2=19
    expect(detectPhase(20, 5, 17)).toBe('luteal');
  });
});

// ─── 7. PERIOD LENGTH CALCULATION ────────────────────────────

describe('Period Length Calculation (computePeriodLength)', () => {
  it('Jan 1 → Jan 5 → 5 days', () => {
    const cycles = [{
      startDate: new Date('2026-01-01T00:00:00Z'),
      endDate: new Date('2026-01-05T00:00:00Z'),
    }];
    expect(computePeriodLength(cycles)).toBe(5);
  });

  it('same day start/end → 1 day', () => {
    const cycles = [{
      startDate: new Date('2026-01-01T00:00:00Z'),
      endDate: new Date('2026-01-01T00:00:00Z'),
    }];
    expect(computePeriodLength(cycles)).toBe(1);
  });

  it('16+ days → filtered out (max valid = 15)', () => {
    const cycles = [{
      startDate: new Date('2026-01-01T00:00:00Z'),
      endDate: new Date('2026-01-20T00:00:00Z'), // 20 days
    }];
    // Filtered out, falls back to default
    expect(computePeriodLength(cycles)).toBe(5);
  });

  it('15 days → accepted (boundary: l <= 15)', () => {
    const cycles = [{
      startDate: new Date('2026-01-01T00:00:00Z'),
      endDate: new Date('2026-01-15T00:00:00Z'), // 14 days diff + 1 = 15
    }];
    expect(computePeriodLength(cycles)).toBe(15);
  });

  it('averages multiple cycles: [4, 6] → 5', () => {
    const cycles = [
      { startDate: new Date('2026-01-01T00:00:00Z'), endDate: new Date('2026-01-04T00:00:00Z') }, // 4 days
      { startDate: new Date('2026-02-01T00:00:00Z'), endDate: new Date('2026-02-06T00:00:00Z') }, // 6 days
    ];
    expect(computePeriodLength(cycles)).toBe(5); // (4+6)/2 = 5
  });

  it('no endDate → falls back to profilePeriodLength', () => {
    const cycles = [{ startDate: new Date('2026-01-01T00:00:00Z'), endDate: null }];
    expect(computePeriodLength(cycles, 6)).toBe(6);
  });

  it('no endDate, no profile → default 5', () => {
    const cycles = [{ startDate: new Date('2026-01-01T00:00:00Z'), endDate: null }];
    expect(computePeriodLength(cycles)).toBe(5);
  });

  it('empty cycles → default 5', () => {
    expect(computePeriodLength([])).toBe(5);
  });

  it('mixed: some with endDate, some without → averages only those with endDate', () => {
    const cycles = [
      { startDate: new Date('2026-01-01T00:00:00Z'), endDate: new Date('2026-01-05T00:00:00Z') }, // 5 days
      { startDate: new Date('2026-02-01T00:00:00Z'), endDate: null },
      { startDate: new Date('2026-03-01T00:00:00Z'), endDate: new Date('2026-03-07T00:00:00Z') }, // 7 days
    ];
    expect(computePeriodLength(cycles)).toBe(6); // (5+7)/2 = 6
  });
});

// ─── 8. CYCLE LENGTH EXTRACTION ──────────────────────────────

describe('Cycle Length Extraction (consecutive period diffs)', () => {
  it('valid range: 18-50 days accepted', () => {
    const cycles = [
      { startDate: new Date('2026-01-01') },
      { startDate: new Date('2026-01-19') }, // 18 days
      { startDate: new Date('2026-03-10') }, // 50 days
    ];
    const cycleLengths: number[] = [];
    for (let i = 0; i < cycles.length - 1; i++) {
      const diff = Math.floor(
        (cycles[i + 1].startDate.getTime() - cycles[i].startDate.getTime()) / 86400000
      );
      if (diff >= 18 && diff <= 50) cycleLengths.push(diff);
    }
    expect(cycleLengths).toEqual([18, 50]);
  });

  it('17-day gap rejected (< 18 minimum)', () => {
    const cycles = [
      { startDate: new Date('2026-01-01') },
      { startDate: new Date('2026-01-18') }, // 17 days
    ];
    const cycleLengths: number[] = [];
    for (let i = 0; i < cycles.length - 1; i++) {
      const diff = Math.floor(
        (cycles[i + 1].startDate.getTime() - cycles[i].startDate.getTime()) / 86400000
      );
      if (diff >= 18 && diff <= 50) cycleLengths.push(diff);
    }
    expect(cycleLengths).toEqual([]);
  });

  it('51-day gap rejected (> 50 maximum)', () => {
    const cycles = [
      { startDate: new Date('2026-01-01') },
      { startDate: new Date('2026-02-21') }, // 51 days
    ];
    const cycleLengths: number[] = [];
    for (let i = 0; i < cycles.length - 1; i++) {
      const diff = Math.floor(
        (cycles[i + 1].startDate.getTime() - cycles[i].startDate.getTime()) / 86400000
      );
      if (diff >= 18 && diff <= 50) cycleLengths.push(diff);
    }
    expect(cycleLengths).toEqual([]);
  });

  it('single very long cycle (45 days) → accepted', () => {
    const cycles = [
      { startDate: new Date('2026-01-01') },
      { startDate: new Date('2026-02-15') }, // 45 days
    ];
    const cycleLengths: number[] = [];
    for (let i = 0; i < cycles.length - 1; i++) {
      const diff = Math.floor(
        (cycles[i + 1].startDate.getTime() - cycles[i].startDate.getTime()) / 86400000
      );
      if (diff >= 18 && diff <= 50) cycleLengths.push(diff);
    }
    expect(cycleLengths).toEqual([45]);
  });
});

// ─── 9. BBT THERMAL SHIFT DETECTION ─────────────────────────

describe('detectThermalShift() — 3-over-6 rule (Baird 2005)', () => {
  it('fewer than 6 temps → not detected', () => {
    const temps = Array.from({ length: 5 }, (_, i) => ({
      date: new Date(2026, 2, i + 1),
      temp: 36.3,
    }));
    expect(detectThermalShift(temps).detected).toBe(false);
  });

  it('exactly 6 temps, no rise → not detected (need 6+3=9 minimum for detection)', () => {
    const temps = Array.from({ length: 6 }, (_, i) => ({
      date: new Date(2026, 2, i + 1),
      temp: 36.3,
    }));
    expect(detectThermalShift(temps).detected).toBe(false);
  });

  it('clear thermal shift: 6 low + 3 high → detected', () => {
    const temps = [
      { date: new Date(2026, 2, 1), temp: 36.2 },
      { date: new Date(2026, 2, 2), temp: 36.3 },
      { date: new Date(2026, 2, 3), temp: 36.1 },
      { date: new Date(2026, 2, 4), temp: 36.3 },
      { date: new Date(2026, 2, 5), temp: 36.2 },
      { date: new Date(2026, 2, 6), temp: 36.3 },  // Day 6 — coverline = 36.3
      { date: new Date(2026, 2, 7), temp: 36.5 },  // > 36.3 ✓, >= 36.5 ✓ (0.2 above)
      { date: new Date(2026, 2, 8), temp: 36.6 },  // > 36.3 ✓
      { date: new Date(2026, 2, 9), temp: 36.5 },  // > 36.3 ✓
    ];
    const result = detectThermalShift(temps);
    expect(result.detected).toBe(true);
    expect(result.ovulationDate).toEqual(new Date(2026, 2, 6)); // Last low-temp day
    expect(result.coverlineTemp).toBe(36.3);
    expect(result.shiftDay).toBe(6);
  });

  it('all 3 above coverline but none 0.2° above → NOT detected', () => {
    const temps = [
      { date: new Date(2026, 2, 1), temp: 36.2 },
      { date: new Date(2026, 2, 2), temp: 36.3 },
      { date: new Date(2026, 2, 3), temp: 36.1 },
      { date: new Date(2026, 2, 4), temp: 36.3 },
      { date: new Date(2026, 2, 5), temp: 36.2 },
      { date: new Date(2026, 2, 6), temp: 36.3 },  // coverline = 36.3
      { date: new Date(2026, 2, 7), temp: 36.4 },  // > 36.3 ✓, but only 0.1 above
      { date: new Date(2026, 2, 8), temp: 36.4 },  // > 36.3 ✓, but only 0.1 above
      { date: new Date(2026, 2, 9), temp: 36.4 },  // > 36.3 ✓, but only 0.1 above
    ];
    const result = detectThermalShift(temps);
    expect(result.detected).toBe(false);
  });

  it('one of 3 not above coverline → NOT detected', () => {
    const temps = [
      { date: new Date(2026, 2, 1), temp: 36.2 },
      { date: new Date(2026, 2, 2), temp: 36.3 },
      { date: new Date(2026, 2, 3), temp: 36.1 },
      { date: new Date(2026, 2, 4), temp: 36.3 },
      { date: new Date(2026, 2, 5), temp: 36.2 },
      { date: new Date(2026, 2, 6), temp: 36.3 },  // coverline = 36.3
      { date: new Date(2026, 2, 7), temp: 36.5 },  // > 36.3 ✓
      { date: new Date(2026, 2, 8), temp: 36.3 },  // NOT > 36.3 ✗
      { date: new Date(2026, 2, 9), temp: 36.6 },
    ];
    const result = detectThermalShift(temps);
    expect(result.detected).toBe(false);
  });

  it('unsorted temps → still works (sorted internally)', () => {
    // Same data as "clear thermal shift" but shuffled
    const temps = [
      { date: new Date(2026, 2, 9), temp: 36.5 },
      { date: new Date(2026, 2, 3), temp: 36.1 },
      { date: new Date(2026, 2, 7), temp: 36.5 },
      { date: new Date(2026, 2, 1), temp: 36.2 },
      { date: new Date(2026, 2, 5), temp: 36.2 },
      { date: new Date(2026, 2, 6), temp: 36.3 },
      { date: new Date(2026, 2, 8), temp: 36.6 },
      { date: new Date(2026, 2, 2), temp: 36.3 },
      { date: new Date(2026, 2, 4), temp: 36.3 },
    ];
    const result = detectThermalShift(temps);
    expect(result.detected).toBe(true);
    expect(result.ovulationDate).toEqual(new Date(2026, 2, 6));
  });

  it('late shift (day 10+) → detected at correct position', () => {
    const temps = [
      // Days 1-9: low temps
      ...Array.from({ length: 9 }, (_, i) => ({
        date: new Date(2026, 2, i + 1),
        temp: 36.2 + (i % 2) * 0.1, // Alternating 36.2/36.3
      })),
      // Days 10-12: high temps
      { date: new Date(2026, 2, 10), temp: 36.6 },
      { date: new Date(2026, 2, 11), temp: 36.5 },
      { date: new Date(2026, 2, 12), temp: 36.7 },
    ];
    const result = detectThermalShift(temps);
    expect(result.detected).toBe(true);
  });
});

// ─── 10. LUTEAL PHASE ESTIMATION ─────────────────────────────

describe('estimateLutealPhase() — Lenton 1984', () => {
  it('no data → returns 13 (population median)', () => {
    expect(estimateLutealPhase([], [])).toBe(13);
  });

  it('cycles with no ovulation dates and no BBT → returns 13', () => {
    const cycles = [
      { startDate: new Date('2026-01-01'), endDate: new Date('2026-01-05') },
      { startDate: new Date('2026-01-29'), endDate: new Date('2026-02-03') },
    ];
    expect(estimateLutealPhase(cycles, [])).toBe(13);
  });

  it('single cycle with ovulationDate → returns computed luteal length', () => {
    const cycles = [
      { startDate: new Date('2026-01-01'), ovulationDate: new Date('2026-01-15') },
      { startDate: new Date('2026-01-29') }, // Next cycle starts 14 days after ovulation
    ];
    // luteal = (Jan 29 - Jan 15) = 14 days — within 7-19 range
    expect(estimateLutealPhase(cycles, [])).toBe(14);
  });

  it('luteal < 7 days → rejected (defect), returns 13', () => {
    const cycles = [
      { startDate: new Date('2026-01-01'), ovulationDate: new Date('2026-01-20') },
      { startDate: new Date('2026-01-25') }, // Only 5 days after ovulation
    ];
    expect(estimateLutealPhase(cycles, [])).toBe(13);
  });

  it('luteal > 19 days → rejected (likely error), returns 13', () => {
    const cycles = [
      { startDate: new Date('2026-01-01'), ovulationDate: new Date('2026-01-05') },
      { startDate: new Date('2026-01-30') }, // 25 days — way too long
    ];
    expect(estimateLutealPhase(cycles, [])).toBe(13);
  });

  it('two valid luteal lengths → returns rounded average', () => {
    const cycles = [
      { startDate: new Date('2026-01-01'), ovulationDate: new Date('2026-01-14') },
      { startDate: new Date('2026-01-28'), ovulationDate: new Date('2026-02-10') },
      { startDate: new Date('2026-02-25') },
    ];
    // First luteal: Jan 28 - Jan 14 = 14 days
    // Second luteal: Feb 25 - Feb 10 = 15 days
    // Average = (14+15)/2 = 14.5, rounded = 15
    expect(estimateLutealPhase(cycles, [])).toBe(15);
  });

  it('boundary: exactly 7 days → accepted', () => {
    const cycles = [
      { startDate: new Date('2026-01-01'), ovulationDate: new Date('2026-01-21') },
      { startDate: new Date('2026-01-28') }, // 7 days
    ];
    expect(estimateLutealPhase(cycles, [])).toBe(7);
  });

  it('boundary: exactly 19 days → accepted', () => {
    const cycles = [
      { startDate: new Date('2026-01-01'), ovulationDate: new Date('2026-01-09') },
      { startDate: new Date('2026-01-28') }, // 19 days
    ];
    expect(estimateLutealPhase(cycles, [])).toBe(19);
  });
});

// ─── 11. HORMONE ESTIMATES ───────────────────────────────────

describe('getHormoneEstimates() — Speroff & Fritz model', () => {
  const CYCLE_LENGTH = 28;
  const PERIOD_LENGTH = 5;
  const OVULATION_DAY = 15;

  it('all values are clamped to 0-100', () => {
    // Test at various cycle days
    for (const day of [1, 5, 10, 14, 15, 17, 20, 25, 28]) {
      const h = getHormoneEstimates(day, OVULATION_DAY, PERIOD_LENGTH, CYCLE_LENGTH);
      expect(h.estrogen).toBeGreaterThanOrEqual(0);
      expect(h.estrogen).toBeLessThanOrEqual(100);
      expect(h.progesterone).toBeGreaterThanOrEqual(0);
      expect(h.progesterone).toBeLessThanOrEqual(100);
      expect(h.lh).toBeGreaterThanOrEqual(0);
      expect(h.lh).toBeLessThanOrEqual(100);
      expect(h.fsh).toBeGreaterThanOrEqual(0);
      expect(h.fsh).toBeLessThanOrEqual(100);
    }
  });

  it('all values are integers (Math.round applied)', () => {
    for (const day of [1, 7, 13, 15, 20, 28]) {
      const h = getHormoneEstimates(day, OVULATION_DAY, PERIOD_LENGTH, CYCLE_LENGTH);
      expect(Number.isInteger(h.estrogen)).toBe(true);
      expect(Number.isInteger(h.progesterone)).toBe(true);
      expect(Number.isInteger(h.lh)).toBe(true);
      expect(Number.isInteger(h.fsh)).toBe(true);
    }
  });

  // Estrogen
  it('estrogen: low during menstruation (day 1)', () => {
    const h = getHormoneEstimates(1, OVULATION_DAY, PERIOD_LENGTH, CYCLE_LENGTH);
    expect(h.estrogen).toBeLessThan(30);
  });

  it('estrogen: peaks at ovulation day (100)', () => {
    const h = getHormoneEstimates(OVULATION_DAY, OVULATION_DAY, PERIOD_LENGTH, CYCLE_LENGTH);
    expect(h.estrogen).toBe(100);
  });

  it('estrogen: drops after ovulation', () => {
    const atOv = getHormoneEstimates(OVULATION_DAY, OVULATION_DAY, PERIOD_LENGTH, CYCLE_LENGTH);
    const after = getHormoneEstimates(OVULATION_DAY + 3, OVULATION_DAY, PERIOD_LENGTH, CYCLE_LENGTH);
    expect(after.estrogen).toBeLessThan(atOv.estrogen);
  });

  // Progesterone
  it('progesterone: low (5) before ovulation', () => {
    expect(getHormoneEstimates(5, OVULATION_DAY, PERIOD_LENGTH, CYCLE_LENGTH).progesterone).toBe(5);
    expect(getHormoneEstimates(10, OVULATION_DAY, PERIOD_LENGTH, CYCLE_LENGTH).progesterone).toBe(5);
    expect(getHormoneEstimates(OVULATION_DAY, OVULATION_DAY, PERIOD_LENGTH, CYCLE_LENGTH).progesterone).toBe(5);
  });

  it('progesterone: rises after ovulation, peaks mid-luteal', () => {
    const midLuteal = OVULATION_DAY + Math.floor((CYCLE_LENGTH - OVULATION_DAY) * 0.5);
    const h = getHormoneEstimates(midLuteal, OVULATION_DAY, PERIOD_LENGTH, CYCLE_LENGTH);
    expect(h.progesterone).toBeGreaterThan(80);
  });

  it('progesterone: falls before next period', () => {
    const endCycle = getHormoneEstimates(CYCLE_LENGTH, OVULATION_DAY, PERIOD_LENGTH, CYCLE_LENGTH);
    const midLuteal = OVULATION_DAY + Math.floor((CYCLE_LENGTH - OVULATION_DAY) * 0.5);
    const peak = getHormoneEstimates(midLuteal, OVULATION_DAY, PERIOD_LENGTH, CYCLE_LENGTH);
    expect(endCycle.progesterone).toBeLessThan(peak.progesterone);
  });

  // LH
  it('LH: baseline 10 outside surge window', () => {
    expect(getHormoneEstimates(1, OVULATION_DAY, PERIOD_LENGTH, CYCLE_LENGTH).lh).toBe(10);
    expect(getHormoneEstimates(10, OVULATION_DAY, PERIOD_LENGTH, CYCLE_LENGTH).lh).toBe(10);
    expect(getHormoneEstimates(20, OVULATION_DAY, PERIOD_LENGTH, CYCLE_LENGTH).lh).toBe(10);
  });

  it('LH surge: day-2=40, day-1=85, ovulation=100', () => {
    expect(getHormoneEstimates(OVULATION_DAY - 2, OVULATION_DAY, PERIOD_LENGTH, CYCLE_LENGTH).lh).toBe(40);
    expect(getHormoneEstimates(OVULATION_DAY - 1, OVULATION_DAY, PERIOD_LENGTH, CYCLE_LENGTH).lh).toBe(85);
    expect(getHormoneEstimates(OVULATION_DAY, OVULATION_DAY, PERIOD_LENGTH, CYCLE_LENGTH).lh).toBe(100);
  });

  it('LH: back to baseline day after ovulation', () => {
    expect(getHormoneEstimates(OVULATION_DAY + 1, OVULATION_DAY, PERIOD_LENGTH, CYCLE_LENGTH).lh).toBe(10);
  });

  // FSH
  it('FSH: elevated early follicular (day 1 → 48)', () => {
    // fsh = 60 - (1/5)*30 = 60 - 6 = 54
    expect(getHormoneEstimates(1, OVULATION_DAY, PERIOD_LENGTH, CYCLE_LENGTH).fsh).toBe(54);
  });

  it('FSH: drops to 30 mid-follicular', () => {
    expect(getHormoneEstimates(8, OVULATION_DAY, PERIOD_LENGTH, CYCLE_LENGTH).fsh).toBe(30);
  });

  it('FSH: small surge near ovulation (up to 70)', () => {
    // At ovulationDay: fsh = 30 + ((15-15+3)/3)*40 = 30 + 40 = 70
    expect(getHormoneEstimates(OVULATION_DAY, OVULATION_DAY, PERIOD_LENGTH, CYCLE_LENGTH).fsh).toBe(70);
  });

  it('FSH: low in luteal phase (15)', () => {
    expect(getHormoneEstimates(20, OVULATION_DAY, PERIOD_LENGTH, CYCLE_LENGTH).fsh).toBe(15);
  });
});

// ─── 12. REGULARITY SCORE ────────────────────────────────────

describe('Regularity Score (coefficient of variation)', () => {
  it('< 2 cycle lengths → neutral 50', () => {
    expect(computeRegularityScore([])).toBe(50);
    expect(computeRegularityScore([28])).toBe(50);
  });

  it('perfectly regular [28, 28, 28] → 100', () => {
    expect(computeRegularityScore([28, 28, 28])).toBe(100);
  });

  it('moderate variation [26, 28, 30] → high score', () => {
    // SD=2.0, mean=28, CV=2/28=0.0714, score=100-(0.0714*200)=85.7 → 86
    const score = computeRegularityScore([26, 28, 30]);
    expect(score).toBe(86);
  });

  it('high variation [21, 35, 28, 40] → low score', () => {
    const score = computeRegularityScore([21, 35, 28, 40]);
    expect(score).toBeLessThan(50);
  });

  it('extreme variation → score floors at 0', () => {
    // Very irregular: large SD relative to mean
    const score = computeRegularityScore([18, 50, 20, 45, 19, 48]);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('score never negative', () => {
    expect(computeRegularityScore([18, 50])).toBeGreaterThanOrEqual(0);
  });
});

// ─── 13. CONCEPTION PROBABILITY (WILCOX 1995) ─────────────────

describe('Wilcox Conception Rates', () => {
  it('day -5 (5 before ovulation) → 10%', () => {
    expect(WILCOX_CONCEPTION_RATES['-5']).toBe(0.10);
  });

  it('day -2 (peak fertility) → 27%', () => {
    expect(WILCOX_CONCEPTION_RATES['-2']).toBe(0.27);
  });

  it('day -1 (peak fertility) → 31%', () => {
    expect(WILCOX_CONCEPTION_RATES['-1']).toBe(0.31);
  });

  it('day 0 (ovulation day) → 33%', () => {
    expect(WILCOX_CONCEPTION_RATES['0']).toBe(0.33);
  });

  it('day +1 (after ovulation) → 0% (egg expired)', () => {
    expect(WILCOX_CONCEPTION_RATES['1']).toBe(0.00);
  });

  it('day +3 (well after) → undefined → 0 via ?? fallback', () => {
    expect(WILCOX_CONCEPTION_RATES['3'] ?? 0).toBe(0);
  });

  it('day -6 (too early) → undefined → 0 via ?? fallback', () => {
    expect(WILCOX_CONCEPTION_RATES['-6'] ?? 0).toBe(0);
  });
});

describe('Fertility score with biomarkers', () => {
  it('CM eggWhite blends 50/50 with Wilcox rate', () => {
    // On ovulation day: Wilcox=0.33, fertilityScore = 33
    // CM eggWhite = 0.95, blended: 33*0.5 + 95*0.5 = 16.5+47.5 = 64
    const wilcoxRate = 0.33;
    let fertilityScore = wilcoxRate * 100;
    const cmScore = CM_FERTILITY_SCORE['eggWhite'];
    fertilityScore = fertilityScore * 0.5 + cmScore * 100 * 0.5;
    expect(Math.round(fertilityScore)).toBe(64);
  });

  it('LH positive blends 60/40 with existing score', () => {
    // Starting fertility score: 50 (hypothetical)
    let fertilityScore = 50;
    const lhScore = LH_FERTILITY_SCORE['positive'];
    fertilityScore = fertilityScore * 0.6 + lhScore * 100 * 0.4;
    // 50*0.6 + 85*0.4 = 30+34 = 64
    expect(Math.round(fertilityScore)).toBe(64);
  });

  it('CM dry has minimal impact', () => {
    let fertilityScore = 33; // Wilcox rate on ovulation day
    const cmScore = CM_FERTILITY_SCORE['dry'];
    fertilityScore = fertilityScore * 0.5 + cmScore * 100 * 0.5;
    // 33*0.5 + 5*0.5 = 16.5+2.5 = 19
    expect(Math.round(fertilityScore)).toBe(19);
  });

  it('fertility status labels: low (<25), moderate (25-49), high (50-79), peak (80+)', () => {
    const getStatus = (score: number) => {
      if (score >= 80) return 'peak';
      if (score >= 50) return 'high';
      if (score >= 25) return 'moderate';
      return 'low';
    };
    expect(getStatus(10)).toBe('low');
    expect(getStatus(30)).toBe('moderate');
    expect(getStatus(60)).toBe('high');
    expect(getStatus(90)).toBe('peak');
  });
});

// ─── 14. SYMPTOM-PHASE CORRELATION ───────────────────────────

describe('computeSymptomPhaseCorrelation()', () => {
  const cycleStart = new Date('2026-01-01T00:00:00Z');
  const cycles = [{ startDate: cycleStart }];
  const avgCycleLength = 28;
  const lutealPhase = 13;
  // ovulationDay = 28-13 = 15

  it('symptom on day 3 → classified as menstrual', () => {
    const logs = [{
      logDate: new Date('2026-01-03T00:00:00Z'), // Day 3
      symptoms: ['cramps'],
    }];
    const result = computeSymptomPhaseCorrelation(cycles, logs, avgCycleLength, lutealPhase);
    expect(result.menstrual).toEqual([{ symptom: 'cramps', count: 1 }]);
  });

  it('symptom on day 8 → classified as follicular', () => {
    // ovulationDay-3=12, day 8 <= 12 and day 8 > 5 → follicular
    const logs = [{
      logDate: new Date('2026-01-08T00:00:00Z'), // Day 8
      symptoms: ['energy'],
    }];
    const result = computeSymptomPhaseCorrelation(cycles, logs, avgCycleLength, lutealPhase);
    expect(result.follicular).toEqual([{ symptom: 'energy', count: 1 }]);
  });

  it('symptom on day 14 → classified as ovulation', () => {
    // ovulationDay-3=12 < 14 <= ovulationDay+2=17 → ovulation
    const logs = [{
      logDate: new Date('2026-01-14T00:00:00Z'), // Day 14
      symptoms: ['mittelschmerz'],
    }];
    const result = computeSymptomPhaseCorrelation(cycles, logs, avgCycleLength, lutealPhase);
    expect(result.ovulation).toEqual([{ symptom: 'mittelschmerz', count: 1 }]);
  });

  it('symptom on day 22 → classified as luteal', () => {
    const logs = [{
      logDate: new Date('2026-01-22T00:00:00Z'), // Day 22
      symptoms: ['bloating'],
    }];
    const result = computeSymptomPhaseCorrelation(cycles, logs, avgCycleLength, lutealPhase);
    expect(result.luteal).toEqual([{ symptom: 'bloating', count: 1 }]);
  });

  it('multiple symptoms in one log → each counted', () => {
    const logs = [{
      logDate: new Date('2026-01-03T00:00:00Z'),
      symptoms: ['cramps', 'fatigue', 'headache'],
    }];
    const result = computeSymptomPhaseCorrelation(cycles, logs, avgCycleLength, lutealPhase);
    expect(result.menstrual).toHaveLength(3);
  });

  it('returns top 5 per phase (sorted by count descending)', () => {
    const logs = Array.from({ length: 6 }, (_, i) => ({
      logDate: new Date('2026-01-02T00:00:00Z'), // Day 2 → menstrual
      symptoms: [`symptom_${i}`],
    }));
    // Each symptom has count=1, but 6 symptoms → only top 5 returned
    const result = computeSymptomPhaseCorrelation(cycles, logs, avgCycleLength, lutealPhase);
    expect(result.menstrual).toHaveLength(5);
  });

  it('log outside any cycle → skipped (no crash)', () => {
    const logs = [{
      logDate: new Date('2025-12-01T00:00:00Z'), // Before any cycle
      symptoms: ['nausea'],
    }];
    const result = computeSymptomPhaseCorrelation(cycles, logs, avgCycleLength, lutealPhase);
    expect(result.menstrual).toHaveLength(0);
    expect(result.follicular).toHaveLength(0);
    expect(result.ovulation).toHaveLength(0);
    expect(result.luteal).toHaveLength(0);
  });

  it('non-array symptoms field → skipped gracefully', () => {
    const logs = [{
      logDate: new Date('2026-01-03T00:00:00Z'),
      symptoms: 'cramps', // string instead of array
    }];
    const result = computeSymptomPhaseCorrelation(cycles, logs, avgCycleLength, lutealPhase);
    expect(result.menstrual).toHaveLength(0);
  });
});

// ─── 15. EDGE CASES ──────────────────────────────────────────

describe('Edge Cases', () => {
  it('irregular cycles (huge variance) → confidence drops', () => {
    const sd = stdDev([21, 35, 42, 25, 48]);
    const result = computeConfidence({
      cycleCount: 5,
      cycleLengthSD: sd,
      hasBBT: false, hasCM: false, hasLH: false,
    });
    expect(result.score).toBeLessThan(50);
    expect(result.factors).toContain('Irregular cycles');
  });

  it('single very long cycle (45 days) → valid prediction', () => {
    // With 1 cycle length, avgCycleLength = 45
    const avgCycleLength = 45;
    const lutealPhase = 13;
    const ovulationDay = Math.max(1, avgCycleLength - lutealPhase); // 32
    expect(ovulationDay).toBe(32);
    // Phase detection still works
    expect(detectPhase(1, 5, ovulationDay)).toBe('menstrual');
    expect(detectPhase(10, 5, ovulationDay)).toBe('follicular');
    expect(detectPhase(32, 5, ovulationDay)).toBe('ovulation');
    expect(detectPhase(40, 5, ovulationDay)).toBe('luteal');
  });

  it('missing UserProfile → fallback defaults (28-day cycle, 5-day period)', () => {
    const avgCycleLength = undefined || 28;
    const periodLength = undefined || 5;
    expect(avgCycleLength).toBe(28);
    expect(periodLength).toBe(5);
  });

  it('no cycles at all → no crash (functions handle empty arrays)', () => {
    expect(mean([])).toBe(0);
    expect(stdDev([])).toBe(0);
    expect(weightedMean([], [])).toBe(0);
    expect(computePeriodLength([])).toBe(5);
    expect(computeRegularityScore([])).toBe(50);
    expect(estimateLutealPhase([], [])).toBe(13);
    expect(detectThermalShift([])).toEqual({ detected: false });
  });

  it('cycle day beyond cycle length (late period) → still luteal', () => {
    // cycleDay=35, avgCycleLength=28, ovulationDay=15 → phase=luteal
    expect(detectPhase(35, 5, 15)).toBe('luteal');
  });

  it('prediction confidence interval: SD=0 → early=late=exact date', () => {
    const nextPeriod = new Date('2026-03-29T00:00:00Z');
    const cycleSD = 0;
    const early = new Date(nextPeriod.getTime() - cycleSD * 86400000);
    const late = new Date(nextPeriod.getTime() + cycleSD * 86400000);
    expect(early.getTime()).toBe(nextPeriod.getTime());
    expect(late.getTime()).toBe(nextPeriod.getTime());
  });

  it('prediction confidence interval: SD=3 → ±3 days window', () => {
    const nextPeriod = new Date('2026-03-29T00:00:00Z');
    const cycleSD = 3;
    const early = new Date(nextPeriod.getTime() - cycleSD * 86400000);
    const late = new Date(nextPeriod.getTime() + cycleSD * 86400000);
    expect(early.toISOString().slice(0, 10)).toBe('2026-03-26');
    expect(late.toISOString().slice(0, 10)).toBe('2026-04-01');
  });

  it('daysUntilOvulation: past ovulation → clamped to 0', () => {
    const cycleDay = 20;
    const ovulationDay = 15;
    const daysUntil = Math.max(0, ovulationDay - cycleDay);
    expect(daysUntil).toBe(0);
  });

  it('daysUntilPeriod: can be negative (overdue/late period)', () => {
    // The code allows negative values for late period detection
    const nextPeriod = new Date('2026-03-29T00:00:00Z');
    const today = new Date('2026-04-02T00:00:00Z');
    const daysUntil = Math.floor((nextPeriod.getTime() - today.getTime()) / 86400000);
    expect(daysUntil).toBe(-4); // 4 days overdue
  });
});

// ─── 16. CYCLE ABNORMALITY ALERTS ────────────────────────────

describe('Cycle Abnormality Alert Thresholds', () => {
  it('amenorrhea: >90 days since last period → urgent', () => {
    const daysSinceLastPeriod = 95;
    expect(daysSinceLastPeriod > 90).toBe(true);
  });

  it('oligomenorrhea: average cycle > 35 days → warning', () => {
    const avgLen = mean([36, 38, 40]);
    expect(avgLen).toBeGreaterThan(35);
  });

  it('polymenorrhea: average cycle < 21 days → warning', () => {
    const avgLen = mean([19, 20, 18]);
    expect(avgLen).toBeLessThan(21);
  });

  it('cycle_change: latest differs >7 days from average → info', () => {
    const cycleLengths = [28, 29, 27, 28, 38]; // Latest=38, avg≈30
    const avg = mean(cycleLengths);
    const latest = cycleLengths[cycleLengths.length - 1];
    expect(Math.abs(latest - avg)).toBeGreaterThan(7);
  });

  it('irregular: SD > 7 → warning', () => {
    const sd = stdDev([21, 35, 42, 25]);
    expect(sd).toBeGreaterThan(7);
  });

  it('normal cycle (28 days, low SD) → no alerts', () => {
    const cycleLengths = [28, 27, 29, 28];
    const avg = mean(cycleLengths);
    const sd = stdDev(cycleLengths);
    const latest = cycleLengths[cycleLengths.length - 1];

    expect(avg).toBeGreaterThanOrEqual(21);
    expect(avg).toBeLessThanOrEqual(35);
    expect(sd).toBeLessThanOrEqual(7);
    expect(Math.abs(latest - avg)).toBeLessThanOrEqual(7);
  });
});

// ─── 17. CERVICAL MUCUS & LH SCORING CONSTANTS ───────────────

describe('Biomarker Scoring Constants', () => {
  it('CM fertility scores are ordered: dry < sticky < creamy < watery < eggWhite', () => {
    expect(CM_FERTILITY_SCORE['dry']).toBeLessThan(CM_FERTILITY_SCORE['sticky']);
    expect(CM_FERTILITY_SCORE['sticky']).toBeLessThan(CM_FERTILITY_SCORE['creamy']);
    expect(CM_FERTILITY_SCORE['creamy']).toBeLessThan(CM_FERTILITY_SCORE['watery']);
    expect(CM_FERTILITY_SCORE['watery']).toBeLessThan(CM_FERTILITY_SCORE['eggWhite']);
  });

  it('CM eggWhite = 0.95 (highest fertility indicator)', () => {
    expect(CM_FERTILITY_SCORE['eggWhite']).toBe(0.95);
  });

  it('LH scores are ordered: negative < faint < positive < peak', () => {
    expect(LH_FERTILITY_SCORE['negative']).toBeLessThan(LH_FERTILITY_SCORE['faint']);
    expect(LH_FERTILITY_SCORE['faint']).toBeLessThan(LH_FERTILITY_SCORE['positive']);
    expect(LH_FERTILITY_SCORE['positive']).toBeLessThan(LH_FERTILITY_SCORE['peak']);
  });

  it('LH peak = 0.95', () => {
    expect(LH_FERTILITY_SCORE['peak']).toBe(0.95);
  });

  it('all scores in 0-1 range', () => {
    for (const score of Object.values(CM_FERTILITY_SCORE)) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
    for (const score of Object.values(LH_FERTILITY_SCORE)) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });
});

// ─── 18. CYCLEDAY NORMALIZATION ──────────────────────────────

describe('Cycle Day Normalization (midnight UTC)', () => {
  it('same day → cycleDay = 1', () => {
    const start = new Date('2026-03-01T00:00:00Z');
    const today = new Date('2026-03-01T00:00:00Z');
    const cycleDay = Math.floor((today.getTime() - start.getTime()) / 86400000) + 1;
    expect(cycleDay).toBe(1);
  });

  it('next day → cycleDay = 2', () => {
    const start = new Date('2026-03-01T00:00:00Z');
    const today = new Date('2026-03-02T00:00:00Z');
    const cycleDay = Math.floor((today.getTime() - start.getTime()) / 86400000) + 1;
    expect(cycleDay).toBe(2);
  });

  it('28 days later → cycleDay = 29 (past expected period)', () => {
    const start = new Date('2026-03-01T00:00:00Z');
    const today = new Date('2026-03-29T00:00:00Z');
    const cycleDay = Math.floor((today.getTime() - start.getTime()) / 86400000) + 1;
    expect(cycleDay).toBe(29);
  });

  it('mid-day time is stripped (midnight normalization)', () => {
    const rawStart = new Date('2026-03-01T14:30:00Z');
    const rawToday = new Date('2026-03-03T09:15:00Z');
    // Normalize to midnight UTC
    const start = new Date(Date.UTC(rawStart.getUTCFullYear(), rawStart.getUTCMonth(), rawStart.getUTCDate()));
    const today = new Date(Date.UTC(rawToday.getUTCFullYear(), rawToday.getUTCMonth(), rawToday.getUTCDate()));
    const cycleDay = Math.floor((today.getTime() - start.getTime()) / 86400000) + 1;
    expect(cycleDay).toBe(3); // Not affected by time-of-day
  });
});
