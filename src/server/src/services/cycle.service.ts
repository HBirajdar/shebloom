// ══════════════════════════════════════════════════════════════════
// Advanced Cycle Prediction & Fertility Engine
// ══════════════════════════════════════════════════════════════════
//
// RESEARCH BASIS:
// ─────────────────────────────────────────────────────────────────
// 1. Wilcox AJ et al. (1995) BMJ — Day-specific conception
//    probabilities relative to ovulation (n=221 women, 625 cycles)
// 2. Fehring RJ et al. (2006) — Variability of the fertile window
// 3. Lenton EA et al. (1984) — Luteal phase length 7-19 days,
//    mean 12.4±2.4d (NOT the mythical "always 14 days")
// 4. Bull JR et al. (2019) npj Digital Medicine — Real-world
//    menstrual cycle data from 612K cycles: mean 29.3d, only 13%
//    are exactly 28 days. Follicular phase drives most variation.
// 5. Stirnemann JJ et al. (2013) — BMI/age effects on cycles
// 6. Bigelow JL et al. (2004) — Cervical mucus scoring for
//    ovulation detection (peak CM = 94.5% sensitivity)
// 7. ACOG Practice Bulletin — Clinical management of anovulation
// 8. Baird DD et al. (2005) — BBT rise confirms ovulation with
//    0.2-0.5°C shift post-ovulation (97% specificity)
// 9. Stanford JB et al. (2002) — Symptothermal method efficacy
// 10. Dunson DB et al. (2002) Hum Reprod — Age-specific decline in
//     female fecundity: conception rate drops 50% by age 40 vs 25
// 11. Symul L et al. (2019) npj Digital Medicine — Prediction accuracy
//     of menstrual cycle apps: cycle-to-cycle variability analysis
// 12. Soumpasis I et al. (2020) JMIR — Real-world effectiveness of
//     fertility app-based tracking (n=32,000 women)
// 13. WHO (2004) — Standardized days method & TwoDay method for
//     family planning; ovulation method guidelines
// 14. NICE CG156 (2013) — Fertility assessment & treatment guideline
// 15. Regidor PA et al. (2018) — LH surge pattern variability: 46%
//     have surge duration <24h, demanding precise daily testing
// 16. Ecochard R et al. (2001) Hum Reprod — Multiple attempts at
//     ovulation per cycle, ~6% of cycles have 2+ LH surges
// 17. Barron ML & Fehring RJ (2005) — Symptothermal method efficacy:
//     99.4% effectiveness with correct use (Marquette study)
// 18. RCOG Green-top Guideline No.47 — Heavy menstrual bleeding
//     definition: >80ml/cycle or >7 days duration
// 19. Quaranta S et al. (2007) — Magnesium supplementation reduces
//     PMS severity by 40% (randomized controlled trial)
// 20. Prasher B et al. (2008) J Transl Med — Ayurgenomics: whole
//     genome expression correlates with Prakriti constitution
// 21. Patwardhan B & Bodeker G (2008) — Ayurvedic genomics:
//     establishing a genetic basis for mind-body typologies
// 22. Sharma A et al. (2018) J Ethnopharmacol — Saraca indica (Ashoka)
//     bark: uterine stimulant activity, oxytocin-like effect,
//     reduces menorrhagia 70-80% in clinical trials
// 23. Pandey AK et al. (2012) AYU — Prakriti-based medicine:
//     Vata prakriti shows higher cortisol variability
// 24. Joshi J et al. (2016) J Ayurveda Integr Med — Shatavari
//     (Asparagus racemosus) clinical trial: improved follicular
//     development and ovulation rate in PCOS
// 25. Gogte VM (2000) — Ayurvedic Pharmacology and Therapeutic
//     Uses of Medicinal Plants (Dravyagunavignyan)
// 26. API (Ayurvedic Pharmacopoeia of India) — Official monographs
//     for Shatavari, Ashwagandha, Ashoka, Lodhra, Guduchi
// 27. Yogaratnakara (16th century) — Yoniroga Chikitsa:
//     gynecological formulations (Pushyanuga Churna, Ashokarishta)
// 28. Donga SB & Deshpande A (2014) AYU — Artavakshaya
//     (oligomenorrhea) management: Phala Ghrita protocol
// 29. Tiwari P (2016) — Ayurvedic Pharmacology & Drug
//     Therapeutics: Stree Roga (gynecological pharmacology)
// 30. Sushruta Samhita (Sharirasthana Ch.2) — Artava formation,
//     Ritu Chakra (menstrual cycle), and Garbha Sambhava (conception)
// ══════════════════════════════════════════════════════════════════

import prisma from '../config/database';
import { cacheGet, cacheSet, cacheDel } from '../config/redis';
import weatherService from './weather.service';
import contentService from './content.service';

// ─── Day-specific conception probabilities (Wilcox et al. 1995) ──
// Day relative to ovulation → probability of conception from single act
const WILCOX_CONCEPTION_RATES: Record<number, number> = {
  '-5': 0.10, // 5 days before ovulation
  '-4': 0.16,
  '-3': 0.14,
  '-2': 0.27, // Peak: 2 days before ovulation
  '-1': 0.31, // Peak: day before ovulation
   '0': 0.33, // Ovulation day
   '1': 0.00, // After ovulation — egg survives ~12-24h
};

// ─── Cervical mucus fertility scoring (Bigelow 2004) ─────────────
const CM_FERTILITY_SCORE: Record<string, number> = {
  dry:      0.05,
  sticky:   0.15,
  creamy:   0.35,
  watery:   0.70,
  eggWhite: 0.95, // Most fertile — indicates imminent ovulation
  spotting: 0.10,
};

// ─── LH test result scoring ──────────────────────────────────────
const LH_FERTILITY_SCORE: Record<string, number> = {
  negative: 0.10,
  faint:    0.40,
  positive: 0.85, // Ovulation within 24-48h
  peak:     0.95,
};

// ─── Statistical helpers ─────────────────────────────────────────

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

// Exponential weights: most recent cycle gets highest weight
// Based on Bull et al. (2019) — recent cycles are better predictors
function exponentialWeights(n: number, decay = 0.7): number[] {
  const w: number[] = [];
  for (let i = 0; i < n; i++) w.push(Math.pow(decay, i));
  return w;
}

// ─── Confidence calculation ──────────────────────────────────────
// Takes into account: number of cycles, variability, data types
function computeConfidence(opts: {
  cycleCount: number;
  cycleLengthSD: number;
  hasBBT: boolean;
  hasCM: boolean;
  hasLH: boolean;
}): { level: string; score: number; factors: string[] } {
  let score = 0;
  const factors: string[] = [];

  // Cycle history (max 40 points)
  if (opts.cycleCount >= 6) { score += 40; factors.push('6+ cycles tracked'); }
  else if (opts.cycleCount >= 3) { score += 25; factors.push(`${opts.cycleCount} cycles tracked`); }
  else if (opts.cycleCount >= 2) { score += 15; factors.push('2 cycles tracked'); }
  else { score += 5; factors.push('Limited cycle history'); }

  // Regularity bonus (max 25 points) — Bull et al. (2019): SD < 2d = very regular
  if (opts.cycleLengthSD < 2) { score += 25; factors.push('Very regular cycles'); }
  else if (opts.cycleLengthSD < 4) { score += 18; factors.push('Moderately regular'); }
  else if (opts.cycleLengthSD < 7) { score += 10; factors.push('Somewhat irregular'); }
  else { score += 3; factors.push('Irregular cycles'); }

  // BBT data (max 15 points) — Baird 2005: BBT shift = 97% ovulation confirmation
  if (opts.hasBBT) { score += 15; factors.push('BBT tracking active'); }

  // Cervical mucus (max 12 points) — Bigelow 2004: peak CM = 94.5% sensitivity
  if (opts.hasCM) { score += 12; factors.push('Cervical mucus tracking'); }

  // LH testing (max 8 points)
  if (opts.hasLH) { score += 8; factors.push('LH test data'); }

  const level = score >= 70 ? 'very_high' : score >= 50 ? 'high' : score >= 30 ? 'medium' : 'low';
  return { level, score: Math.min(100, score), factors };
}

// ─── BBT thermal shift detection (Baird 2005) ────────────────────
// Detects the 0.2-0.5°C rise that confirms ovulation
function detectThermalShift(temps: { date: Date; temp: number }[]): {
  detected: boolean;
  ovulationDate?: Date;
  coverlineTemp?: number;
  shiftDay?: number;
} {
  if (temps.length < 6) return { detected: false };

  // Sort by date ascending
  const sorted = [...temps].sort((a, b) => a.date.getTime() - b.date.getTime());

  // Sliding window: look for 3 consecutive temps above the previous 6
  // This is the "3-over-6" rule (standard symptothermal method)
  for (let i = 6; i <= sorted.length - 3; i++) {
    const baseline = sorted.slice(i - 6, i).map(t => t.temp);
    const coverline = Math.max(...baseline);
    const next3 = sorted.slice(i, i + 3).map(t => t.temp);

    // All 3 must be above coverline, and at least one 0.2°C above
    if (next3.every(t => t > coverline) && next3.some(t => t >= coverline + 0.2)) {
      return {
        detected: true,
        ovulationDate: sorted[i - 1].date, // Ovulation is the last low-temp day
        coverlineTemp: coverline,
        shiftDay: i,
      };
    }
  }
  return { detected: false };
}

// ─── Compute individual luteal phase length ──────────────────────
// Lenton 1984: NOT always 14 days. Range 7-19, mean 12.4±2.4
// We calculate from confirmed ovulations (BBT shift) to next period
function estimateLutealPhase(cycles: any[], bbtLogs: any[]): number {
  const lutealLengths: number[] = [];

  for (const cycle of cycles) {
    if (!cycle.ovulationDate && bbtLogs.length > 0) {
      // Try to detect ovulation from BBT data for this cycle
      const cycleEnd = cycle.endDate || new Date(cycle.startDate.getTime() + 35 * 86400000);
      const cycleBBT = bbtLogs.filter((b: any) =>
        b.logDate >= cycle.startDate && b.logDate <= cycleEnd
      ).map((b: any) => ({ date: b.logDate, temp: b.temperature }));

      const shift = detectThermalShift(cycleBBT);
      if (shift.detected && shift.ovulationDate) {
        // Next cycle start = end of this luteal phase
        const nextCycleStart = cycles.find(c =>
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
      // Use stored ovulation date
      const nextCycle = cycles.find(c => c.startDate > cycle.startDate);
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
  return 13; // Population median (Lenton 1984), NOT 14
}

// ─── Age-adjusted fertility modifier (Dunson 2002) ──────────────
// Fecundity declines with age: peak at 20-24, gradual decline after 30
function getAgeAdjustment(dateOfBirth: Date | null): {
  ageGroup: string;
  fertilityModifier: number;
  advice: string;
  reference: string;
} {
  if (!dateOfBirth) return { ageGroup: 'unknown', fertilityModifier: 1.0, advice: 'Add your date of birth for age-adjusted predictions.', reference: '' };

  const age = Math.floor((Date.now() - dateOfBirth.getTime()) / (365.25 * 86400000));

  // Based on Dunson 2002 + NICE CG156 age-specific fecundity rates
  if (age < 20) return {
    ageGroup: 'under-20',
    fertilityModifier: 0.95,
    advice: 'Your cycles may still be establishing regularity. Irregular periods are common in adolescence and typically stabilize by age 20.',
    reference: 'ACOG: Adolescent menstrual cycles stabilize 2-3 years post-menarche'
  };
  if (age <= 24) return {
    ageGroup: '20-24',
    fertilityModifier: 1.0,
    advice: 'Peak reproductive years. Cycle predictions are most accurate with regular cycles.',
    reference: 'Dunson 2002: Peak fecundity rate ~25% per cycle at age 20-24'
  };
  if (age <= 29) return {
    ageGroup: '25-29',
    fertilityModifier: 0.95,
    advice: 'Fertility remains high. Slight decline begins but is minimal.',
    reference: 'Dunson 2002: ~23% per cycle fecundity at age 25-29'
  };
  if (age <= 34) return {
    ageGroup: '30-34',
    fertilityModifier: 0.85,
    advice: 'Gradual fertility decline. If TTC, consult a doctor after 12 months of trying. Egg quality begins to decline.',
    reference: 'Dunson 2002 + NICE CG156: ~20% per cycle, seek help after 12 months'
  };
  if (age <= 37) return {
    ageGroup: '35-37',
    fertilityModifier: 0.70,
    advice: 'Fertility declines more rapidly after 35. If TTC, consult a reproductive specialist after 6 months. Consider egg quality testing (AMH, AFC).',
    reference: 'NICE CG156: Seek specialist after 6 months at age 35+; Dunson 2002: ~15% per cycle'
  };
  if (age <= 39) return {
    ageGroup: '38-39',
    fertilityModifier: 0.55,
    advice: 'Significant fertility decline. If TTC, seek specialist help promptly. AMH testing recommended. Consider all options with your doctor.',
    reference: 'Dunson 2002: ~10% per cycle; ACOG: Expedited evaluation recommended'
  };
  return {
    ageGroup: '40+',
    fertilityModifier: 0.40,
    advice: 'Natural conception rates significantly reduced. If TTC, immediate specialist consultation recommended. IVF success rates also decline.',
    reference: 'Dunson 2002: ~5% per cycle at 40+; NICE CG156: Immediate referral recommended'
  };
}

// ─── BMI impact on menstrual cycles (Stirnemann 2013) ───────────
function getBMIAdjustment(height: number | null, weight: number | null): {
  bmi: number | null;
  category: string;
  cycleImpact: string;
  fertilityImpact: string;
  ayurvedicCorrelation: string;
  reference: string;
} {
  if (!height || !weight || height <= 0) return {
    bmi: null, category: 'unknown',
    cycleImpact: 'Add height and weight for BMI-adjusted predictions.',
    fertilityImpact: '',
    ayurvedicCorrelation: '',
    reference: ''
  };

  const bmi = weight / ((height / 100) ** 2);

  if (bmi < 18.5) return {
    bmi: Math.round(bmi * 10) / 10,
    category: 'underweight',
    cycleImpact: 'Underweight BMI can cause irregular or absent periods (hypothalamic amenorrhea). Low body fat disrupts estrogen production needed for ovulation.',
    fertilityImpact: 'Anovulation risk is significantly higher. Gaining even 2-3 kg can restore ovulation in many cases.',
    ayurvedicCorrelation: 'Vata excess — dryness depleting Rasa & Rakta dhatu, weakening Artava. Nourishing Brimhana therapy recommended (Charaka Chi. 30).',
    reference: 'Stirnemann 2013: BMI <18.5 associated with longer, irregular cycles; NICE CG156: BMI <19 may impair fertility'
  };
  if (bmi <= 24.9) return {
    bmi: Math.round(bmi * 10) / 10,
    category: 'normal',
    cycleImpact: 'Normal BMI supports regular ovulatory cycles. Cycle predictions are most reliable in this range.',
    fertilityImpact: 'Optimal BMI for fertility. No BMI-related adjustments needed.',
    ayurvedicCorrelation: 'Sam Dosha (balanced constitution) — Dhatus are nourished proportionally. Maintain through Ritucharya and Dinacharya.',
    reference: 'Stirnemann 2013: BMI 20-25 = most regular cycles; WHO: Optimal reproductive BMI range'
  };
  if (bmi <= 29.9) return {
    bmi: Math.round(bmi * 10) / 10,
    category: 'overweight',
    cycleImpact: 'Slightly longer cycles possible. Ovulation may be delayed by 1-2 days. Increased PMS symptoms reported.',
    fertilityImpact: 'Mild fertility reduction (~5-10%). Weight loss of 5-10% can significantly improve cycle regularity and ovulation.',
    ayurvedicCorrelation: 'Kapha accumulation in Meda dhatu. Langhana (lightening) therapy + Agni stimulation recommended. Guggulu + Triphala.',
    reference: 'Stirnemann 2013: BMI 25-30 = +1.3 day avg cycle length; NICE CG156: Weight loss improves ovulation'
  };
  if (bmi <= 34.9) return {
    bmi: Math.round(bmi * 10) / 10,
    category: 'obese_class1',
    cycleImpact: 'Cycles often longer (32-40 days). Higher anovulation risk. Increased estrogen from adipose tissue disrupts HPO axis feedback.',
    fertilityImpact: 'Fertility reduced ~30-50%. Strong correlation with PCOS. Weight loss of 5% shown to restore ovulation in 60% of cases.',
    ayurvedicCorrelation: 'Kapha-Ama blocking Artava Vaha Srotas. Medoroga (obesity) treatment: Lekhana (scraping) therapy + Udwartana (dry powder massage).',
    reference: 'Stirnemann 2013: BMI 30+ = significantly irregular; Kiddy 1992: 5% weight loss restored ovulation in 60%'
  };
  return {
    bmi: Math.round(bmi * 10) / 10,
    category: 'obese_class2plus',
    cycleImpact: 'High risk of anovulation, amenorrhea, and very irregular cycles. Insulin resistance commonly affects cycle regularity.',
    fertilityImpact: 'Significantly reduced fertility. Specialist consultation strongly recommended. Consider metabolic evaluation.',
    ayurvedicCorrelation: 'Severe Kapha-Meda Dushti with Ama. Sthaulya Chikitsa (obesity treatment) is prerequisite for Artava health. Panchakarma recommended.',
    reference: 'Stirnemann 2013 + NICE CG156: BMI >35 = refer for specialist evaluation; ACOG: Metabolic screening recommended'
  };
}

// ─── Mental health phase correlations ────────────────────────────
// Documented relationship between cycle phases and mental health
function getMentalHealthPhaseInsight(phase: string, dosha: string): {
  insight: string;
  riskFactors: string[];
  supportStrategies: string[];
  whenToSeekHelp: string;
  ayurvedicApproach: string;
  reference: string;
} {
  const insights: Record<string, any> = {
    menstrual: {
      insight: 'Estrogen and progesterone are at their lowest. This hormonal nadir can trigger or worsen mood disorders, especially PMDD (Premenstrual Dysphoric Disorder) carryover.',
      riskFactors: [
        'PMDD symptoms may peak on days 1-2 of menstruation',
        'Low estrogen = reduced serotonin synthesis',
        'Pain and discomfort compound mood effects',
        'Social withdrawal tendency (not always pathological)',
      ],
      supportStrategies: [
        'Gentle movement (walking, yin yoga) — endorphin release',
        'Tryptophan-rich foods: banana, warm milk, turkey, oats',
        'Light exposure therapy (10,000 lux, 30 min morning)',
        'Warmth therapy: warm baths, heating pads, hot drinks',
      ],
      whenToSeekHelp: 'If sadness, hopelessness, or anxiety prevent daily functioning for 3+ consecutive periods, screen for PMDD with your doctor.',
      ayurvedicApproach: dosha === 'Vata'
        ? 'Vata-type menstrual distress: anxiety, fear, racing thoughts. Brahmi + Ashwagandha + warm milk. Abhyanga essential.'
        : dosha === 'Pitta'
        ? 'Pitta-type menstrual distress: anger, frustration, self-criticism. Cooling pranayama + Brahmi + Shatavari. Avoid conflict.'
        : 'Kapha-type menstrual distress: lethargy, heaviness, emotional eating. Gentle exercise + Jatamansi + Tulsi. Avoid isolation.',
      reference: 'Hantsoo & Epperson (2015) Curr Psychiatry Rep — Hormonal basis of PMDD; Rapkin & Akopians (2012) — Serotonin and premenstrual syndrome',
    },
    follicular: {
      insight: 'Rising estrogen boosts serotonin, dopamine, and BDNF. This is typically the most emotionally positive phase — creativity, optimism, and social confidence peak.',
      riskFactors: [
        'Rapid mood improvement may feel destabilizing for some',
        'Increased risk-taking behavior (dopamine-driven)',
        'Sleep may reduce (not always a problem)',
      ],
      supportStrategies: [
        'Channel positive energy into challenging projects',
        'Social activities — oxytocin and endorphin synergy',
        'High-intensity exercise feels rewarding this phase',
        'Learning and skill-building — neuroplasticity peaks',
      ],
      whenToSeekHelp: 'If you do NOT feel better during follicular phase after months of tracking, discuss with your doctor — non-cyclical mood disorders may need evaluation.',
      ayurvedicApproach: dosha === 'Vata'
        ? 'Vata creativity peaks but can scatter. Channel into ONE project. Ashwagandha stabilizes without dampening creativity.'
        : dosha === 'Pitta'
        ? 'Pitta ambition surges — excellent for career moves. But set boundaries to prevent burnout. Amalaki supports sustained energy.'
        : 'Kapha may resist the energy surge — don\'t give in! This is your best window for transformation. Wake early, exercise hard.',
      reference: 'Sundström Poromaa & Gingnell (2014) — Menstrual cycle influence on cognitive function and emotion processing',
    },
    ovulation: {
      insight: 'Estrogen peaks, testosterone rises briefly. Confidence, verbal fluency, and social magnetism at maximum. Brief vulnerability as LH surge can trigger emotional sensitivity.',
      riskFactors: [
        'Mid-cycle anxiety/mood dip in some women (mittelschmerz-related)',
        'Heightened emotional sensitivity despite positive mood',
        'Impulsive decisions more likely (testosterone + dopamine peak)',
      ],
      supportStrategies: [
        'Schedule important conversations and presentations',
        'Moderate-to-high exercise leverages peak physical capacity',
        'Mindful communication — assertiveness without aggression',
        'Social connection and intimacy feel most rewarding now',
      ],
      whenToSeekHelp: 'Mid-cycle mood dips lasting more than 2 days or severe mittelschmerz deserve medical evaluation.',
      ayurvedicApproach: dosha === 'Vata'
        ? 'Vata communication peaks — speak your truth today. Cooling foods balance the Pitta heat of ovulation.'
        : dosha === 'Pitta'
        ? 'Pitta fire is maximum — charisma peaks but so does sharp tongue. Practice Sheetali pranayama before difficult conversations.'
        : 'Kapha warmth is magnetic — nurturing energy at its best. Resist urge to comfort-eat. Stay light and active.',
      reference: 'Dreher et al. (2007) PNAS — Neural mechanisms underlying ovulatory cycle effects on cognition and reward',
    },
    luteal: {
      insight: 'Progesterone rises then falls. Serotonin drops. 75% of menstruating women experience some PMS; 3-8% have PMDD. Late luteal (5-7 days before period) is the highest-risk window.',
      riskFactors: [
        'Progesterone withdrawal triggers GABAergic changes → anxiety',
        'Serotonin drops 25-30% in luteal phase (Rapkin 2012)',
        'Carbohydrate cravings are serotonin-seeking behavior',
        'Insomnia from progesterone thermogenic effect (↑body temp)',
        'Interpersonal sensitivity increases (perceived rejection)',
      ],
      supportStrategies: [
        'Complex carbohydrates every 3 hours — maintain serotonin',
        'Magnesium 200-400mg daily — reduces PMS by 40% (Quaranta 2007)',
        'Calcium 1000mg daily — reduces PMS symptoms (Thys-Jacobs 2000)',
        'Regular moderate exercise — reduces PMS severity by 50%',
        'CBT techniques for emotional regulation if PMS is severe',
      ],
      whenToSeekHelp: 'If luteal symptoms cause relationship damage, work impairment, or suicidal thoughts, seek PMDD evaluation immediately. SSRIs (luteal-phase dosing) are effective.',
      ayurvedicApproach: dosha === 'Vata'
        ? 'Vata-PMS: anxiety, insomnia, constipation. Brahmi + Shankhpushpi + warm sesame milk at bedtime. Strict routine is medicine.'
        : dosha === 'Pitta'
        ? 'Pitta-PMS: rage, migraines, skin eruptions. Shatavari + Guduchi + cooling diet. Vigorous exercise channels anger safely.'
        : 'Kapha-PMS: depression, water retention, overeating. Punarnava + Trikatu + daily vigorous exercise. Do NOT isolate.',
      reference: 'Yonkers KA et al. (2008) Lancet — PMDD epidemiology and treatment; Quaranta 2007 — Mg for PMS',
    },
  };

  return insights[phase] || insights.follicular;
}

// ─── Medication interaction warnings ─────────────────────────────
// Common medications that affect menstrual cycles
const MEDICATION_CYCLE_WARNINGS: { name: string; effect: string; herbInteraction: string; reference: string }[] = [
  {
    name: 'Hormonal contraceptives (pills, patch, ring, IUD)',
    effect: 'Suppress natural ovulation. Cycle predictions, BBT, and CM tracking are NOT reliable on hormonal contraception. Withdrawal bleeding is not a true period.',
    herbInteraction: 'Phytoestrogens (Shatavari, flaxseed, soy) may theoretically reduce contraceptive efficacy — evidence is limited but caution advised.',
    reference: 'ACOG Practice Bulletin: Hormonal contraception suppresses HPO axis',
  },
  {
    name: 'Metformin (for PCOS/diabetes)',
    effect: 'May restore ovulation in PCOS. Cycle length may shorten and become more regular over 3-6 months.',
    herbInteraction: 'Guggulu (Commiphora mukul) has similar insulin-sensitizing properties. Discuss combining with your doctor — additive hypoglycemic risk.',
    reference: 'Nestler 1998: Metformin restores ovulation in 40-60% of PCOS cases',
  },
  {
    name: 'Thyroid medication (levothyroxine)',
    effect: 'Both hypo- and hyperthyroidism disrupt cycles. Proper dosing normalizes menstrual patterns over 2-3 months.',
    herbInteraction: 'Ashwagandha may affect thyroid function (thyroid-stimulating). Do NOT combine without medical supervision.',
    reference: 'ACOG: Thyroid disorders are the 2nd most common endocrine cause of menstrual irregularity',
  },
  {
    name: 'Antidepressants (SSRIs/SNRIs)',
    effect: 'May cause cycle irregularity, delayed ovulation, or changes in flow. Usually stabilizes after 3 months.',
    herbInteraction: 'Brahmi and Shankhpushpi have mild serotonergic activity. Combining with SSRIs may increase serotonin — discuss with psychiatrist.',
    reference: 'Jarskog et al. (2013): SSRIs affect GnRH pulsatility and prolactin',
  },
  {
    name: 'NSAIDs (Ibuprofen, Naproxen)',
    effect: 'Anti-prostaglandin action reduces cramps and may slightly reduce menstrual flow. Safe for short-term menstrual use.',
    herbInteraction: 'Ashoka bark and Dashmool have similar anti-inflammatory pathways. Using together is generally safe but may increase anti-inflammatory effect.',
    reference: 'RCOG: NSAIDs reduce menstrual blood loss by 20-50%',
  },
  {
    name: 'Corticosteroids (Prednisone)',
    effect: 'Suppress HPO axis. Can cause anovulation, irregular cycles, or amenorrhea with chronic use.',
    herbInteraction: 'Ashwagandha and Shatavari are adaptogenics but should not replace prescribed corticosteroids. Consult doctor before combining.',
    reference: 'ACOG: Exogenous glucocorticoids suppress GnRH → menstrual disruption',
  },
  {
    name: 'Anticoagulants (Warfarin, Heparin)',
    effect: 'Can cause heavier, prolonged menstrual bleeding. Report any significant change to your doctor.',
    herbInteraction: 'AVOID blood-thinning herbs: Turmeric (high dose), Ginger (high dose), Guggulu, and Garlic supplements. Serious bleeding risk.',
    reference: 'RCOG Green-top No.47: Anticoagulants increase menorrhagia risk',
  },
];

// ─── Herb safety classification ──────────────────────────────────
// Pregnancy safety categories for commonly recommended herbs
const HERB_SAFETY_PROFILE: Record<string, {
  sanskritName: string;
  botanicalName: string;
  pregnancySafety: 'SAFE' | 'CAUTION' | 'AVOID' | 'CONTRAINDICATED';
  pregnancyNote: string;
  generalContraindications: string[];
  maxDuration: string;
  classicalReference: string;
  modernEvidence: string;
}> = {
  shatavari: {
    sanskritName: 'Shatavari',
    botanicalName: 'Asparagus racemosus',
    pregnancySafety: 'CAUTION',
    pregnancyNote: 'Traditionally considered safe in pregnancy (Garbhini Paricharya). However, consult your OB-GYN before use. May have phytoestrogenic effects.',
    generalContraindications: ['Estrogen-receptor-positive breast cancer', 'Kidney disorders (high oxalate content)', 'Known allergy to Asparagus family'],
    maxDuration: 'Up to 12 months under practitioner guidance',
    classicalReference: 'Charaka Su. 4/18 — Balya (strength-giving), Vaya-sthapana (anti-aging). Bhavaprakasha: Shatavari = "she who has 100 husbands" — premier female tonic',
    modernEvidence: 'Joshi 2016: Improved follicular development in PCOS. Pandey 2005: Galactagogue properties confirmed. API: Official monograph in Ayurvedic Pharmacopoeia.',
  },
  ashwagandha: {
    sanskritName: 'Ashwagandha',
    botanicalName: 'Withania somnifera',
    pregnancySafety: 'AVOID',
    pregnancyNote: 'AVOID during pregnancy. Classified as Garbhapata (abortifacient) in some classical texts. May stimulate uterine contractions.',
    generalContraindications: ['Pregnancy and breastfeeding (without medical advice)', 'Autoimmune conditions (thyroid, lupus, RA) — immunostimulant', 'Thyroid medication — may alter thyroid hormone levels', 'Pre-surgery (stop 2 weeks before)'],
    maxDuration: 'Up to 3 months, then reassess',
    classicalReference: 'Charaka Chi. 1 — Rasayana (rejuvenative). Ashwagandha = "smell of horse" — gives horse-like vitality',
    modernEvidence: 'Chandrasekhar 2012 (IJAM): 28% cortisol reduction (n=64, RCT). Lopresti 2019: Improved female sexual function. KSM-66 standardized extract most studied.',
  },
  ashoka: {
    sanskritName: 'Ashoka',
    botanicalName: 'Saraca indica (Saraca asoca)',
    pregnancySafety: 'CONTRAINDICATED',
    pregnancyNote: 'STRICTLY AVOID during pregnancy. Has oxytocin-like uterine stimulant activity. Can induce contractions and is an abortifacient.',
    generalContraindications: ['Pregnancy (all trimesters)', 'Trying to conceive (may affect implantation — stop after ovulation if TTC)', 'Endometriosis on hormonal therapy (estrogenic activity)'],
    maxDuration: 'Up to 3 months for menorrhagia, then reassess',
    classicalReference: 'Bhavaprakasha: Ashoka = "remover of sorrow" — primary drug for Raktapradar (menorrhagia) and Shvetapradar (leucorrhea)',
    modernEvidence: 'Sharma 2018 (J Ethnopharmacol): 70-80% reduction in menorrhagia. Oxytocin-like activity on uterine smooth muscle confirmed in vitro. Ashokarishta is the classical fermented preparation.',
  },
  brahmi: {
    sanskritName: 'Brahmi',
    botanicalName: 'Bacopa monnieri',
    pregnancySafety: 'CAUTION',
    pregnancyNote: 'Limited pregnancy safety data. Traditional use suggests caution. Consult healthcare provider before use during pregnancy.',
    generalContraindications: ['May increase thyroid hormones (avoid with hypothyroidism medication)', 'May slow heart rate (avoid with bradycardia)', 'GI upset in some individuals'],
    maxDuration: 'Up to 6 months, then reassess',
    classicalReference: 'Charaka Su. 1 — Medhya Rasayana (brain tonic). First-line for anxiety, memory, and cognitive function',
    modernEvidence: 'Stough 2001: Improved memory and reduced anxiety (300mg/day RCT). Roodenrys 2002: Cognitive enhancement confirmed.',
  },
  lodhra: {
    sanskritName: 'Lodhra',
    botanicalName: 'Symplocos racemosa',
    pregnancySafety: 'AVOID',
    pregnancyNote: 'Not recommended during pregnancy. Primarily used for menorrhagia and leucorrhea — not appropriate in pregnancy context.',
    generalContraindications: ['Pregnancy', 'Very scanty periods (may further reduce flow)', 'Constipation (astringent herb)'],
    maxDuration: 'Up to 2 months for acute conditions',
    classicalReference: 'Bhavaprakasha Nighantu: Lodhra is Grahi (absorbent), Stambhana (astringent) — stops excessive flow',
    modernEvidence: 'API Monograph: Used in Pushyanuga Churna for menorrhagia. Limited modern RCTs but extensive traditional evidence.',
  },
  triphala: {
    sanskritName: 'Triphala',
    botanicalName: 'Amalaki + Bibhitaki + Haritaki',
    pregnancySafety: 'CAUTION',
    pregnancyNote: 'Haritaki component is traditionally avoided in pregnancy (mild uterine stimulant). Use only under practitioner guidance.',
    generalContraindications: ['Pregnancy (especially Haritaki component)', 'Diarrhea or loose stools (laxative effect)', 'Pre-surgery (stop 2 weeks before — may affect bleeding)'],
    maxDuration: 'Long-term use considered safe (non-pregnant)',
    classicalReference: 'Charaka Su. 5 — Tridoshahara (balances all three doshas). Called "Triphala" = three fruits. Universal Rasayana.',
    modernEvidence: 'Peterson 2017 (J Altern Complement Med): Antioxidant, anti-inflammatory, laxative properties confirmed. WHO Traditional Medicine monograph.',
  },
  guggulu: {
    sanskritName: 'Guggulu',
    botanicalName: 'Commiphora mukul',
    pregnancySafety: 'CONTRAINDICATED',
    pregnancyNote: 'AVOID in pregnancy. Uterine stimulant activity. May cause miscarriage. Also avoid if planning conception.',
    generalContraindications: ['Pregnancy and breastfeeding', 'Thyroid medication (may alter levels)', 'Anticoagulants (additive blood-thinning)', 'Estrogen-receptor-positive conditions'],
    maxDuration: 'Up to 3 months, then reassess',
    classicalReference: 'Sushruta: Guggulu Panchapala — five preparations for different conditions. Medoroga (obesity) treatment cornerstone.',
    modernEvidence: 'Urizar & Moore 2003: Cholesterol reduction confirmed. Singh 1994: Anti-inflammatory comparable to phenylbutazone.',
  },
};

// ─── Comprehensive disclaimer system ─────────────────────────────
function getContextualDisclaimer(goal: string, phase: string, isPregnant: boolean, age?: number): {
  primary: string;
  safety: string[];
  regulatory: string;
  herbSafety: string;
  dataAccuracy: string;
  emergencyNote: string;
} {
  const disclaimers: any = {
    primary: 'Vedaclue provides educational wellness information based on published Ayurvedic texts and peer-reviewed medical research. This is NOT a medical device and is NOT a substitute for professional healthcare.',

    regulatory: 'This application is not approved or regulated by any medical regulatory body (FDA, CDSCO, EMA). Predictions are statistical estimates based on your logged data and published research — they are probabilistic, not certain.',

    dataAccuracy: 'Prediction accuracy depends on consistent, accurate data logging. Cycle predictions require minimum 3 complete cycles for meaningful accuracy. Hormone levels shown are ESTIMATES based on typical patterns (Speroff & Fritz model), not your actual measured levels — only blood tests can determine your true hormone levels.',

    emergencyNote: 'If you experience sudden severe abdominal pain, very heavy bleeding (soaking through a pad every hour for 2+ hours), fainting, or signs of ectopic pregnancy (positive test + one-sided pain), seek emergency medical care immediately.',

    safety: [] as string[],
    herbSafety: '',
  };

  // Goal-specific safety warnings
  if (goal === 'fertility' || goal === 'ttc') {
    disclaimers.safety.push(
      'FERTILITY DISCLAIMER: Ovulation predictions are estimates. Do NOT use this app as your sole method of contraception or conception planning without consulting a reproductive specialist.',
      'Conception probabilities shown are based on population-level data (Wilcox 1995). Individual rates vary significantly based on age, health, partner factors, and other variables.',
      'If you have been trying to conceive for 12 months (or 6 months if over 35) without success, consult a fertility specialist as recommended by NICE CG156.',
      'This app does not account for male factor infertility (responsible for ~40-50% of infertility cases), tubal factors, endometriosis, or other medical conditions affecting fertility.',
    );
    disclaimers.herbSafety = 'TTC HERB SAFETY: If actively trying to conceive, avoid herbs during the luteal phase (after ovulation) that may affect implantation. Ashoka bark and Guggulu are uterine stimulants — stop after ovulation. Shatavari is generally considered safe but consult your Ayurvedic practitioner.';
  } else if (goal === 'pregnancy' || isPregnant) {
    disclaimers.safety.push(
      'PREGNANCY WARNING: Many Ayurvedic herbs are CONTRAINDICATED during pregnancy. NEVER start any herbal supplement during pregnancy without explicit approval from your OB-GYN and qualified Ayurvedic practitioner.',
      'Herbs to STRICTLY AVOID during pregnancy: Ashoka bark, Guggulu, Aloe vera (internal), Senna, Triphala (Haritaki component), Ashwagandha (some texts classify as abortifacient), strong purgatives.',
      'Herbs traditionally considered SAFER in pregnancy (with medical approval): Shatavari (Garbhini Paricharya), Yashtimadhu/Mulethi (anti-heartburn), mild ginger (nausea).',
      'This app does NOT replace prenatal care. Regular OB-GYN visits, ultrasounds, blood tests, and screenings are essential and cannot be substituted by any app or traditional system.',
    );
    disclaimers.herbSafety = 'PREGNANCY HERB SAFETY: Consult your OB-GYN before taking ANY herbal supplement during pregnancy. Even traditionally "safe" herbs may interact with prenatal vitamins, iron supplements, or medications. Dosage matters — what is safe in food amounts may not be safe in supplement doses.';
  } else {
    // Period tracking / wellness
    disclaimers.safety.push(
      'PERIOD TRACKING DISCLAIMER: Cycle predictions are statistical estimates and should not be relied upon for contraception (avoiding pregnancy). If you are sexually active and do not wish to become pregnant, use a proven contraceptive method.',
      'If you are NOT planning to conceive, be aware that fertility-related suggestions in this app are educational only. Some herbal recommendations may promote fertility — if this is not your goal, prioritize your contraceptive method.',
    );
    disclaimers.herbSafety = 'HERB SAFETY: Start any new herbal supplement with small amounts. Discontinue if you experience adverse effects. Inform your doctor about all herbal supplements you are taking, especially before surgery or when starting new medications.';
  }

  // Age-specific additions
  if (age && age < 18) {
    disclaimers.safety.push('ADOLESCENT NOTE: If you are under 18, please involve a parent/guardian and consult a pediatric gynecologist for any menstrual concerns. Irregular cycles are normal for 2-3 years after menarche.');
  }

  return disclaimers;
}

// ══════════════════════════════════════════════════════════════════
// MAIN SERVICE
// ══════════════════════════════════════════════════════════════════

export class CycleService {
  async getCycles(userId: string, limit = 12) {
    const cacheKey = `cycles:${userId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;
    const cycles = await prisma.cycle.findMany({
      where: { userId },
      orderBy: { startDate: 'desc' },
      take: limit,
    });
    await cacheSet(cacheKey, cycles, 600);
    return cycles;
  }

  async logPeriod(userId: string, data: { startDate: string; endDate?: string; notes?: string }) {
    // Prevent duplicate period logging on the same date
    const existingCycle = await prisma.cycle.findFirst({
      where: { userId, startDate: new Date(data.startDate) },
    });
    if (existingCycle) throw new Error('A period is already logged for this date');

    const cycle = await prisma.cycle.create({
      data: {
        userId,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        notes: data.notes,
      },
    });
    await cacheDel(`cycles:${userId}`);
    await cacheDel(`predictions:${userId}`);
    await cacheDel(`fertility:${userId}`);
    await cacheDel('insights:' + userId);
    return cycle;
  }

  // ════════════════════════════════════════════════════════════════
  // ADVANCED PREDICTION ENGINE
  // ════════════════════════════════════════════════════════════════
  async getPredictions(userId: string) {
    const cacheKey = `predictions:${userId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    const allCycles = await prisma.cycle.findMany({
      where: { userId },
      orderBy: { startDate: 'asc' },
      take: 24, // Use up to 24 cycles for better statistics
    });

    if (!allCycles.length || !profile) return { message: 'Not enough data for prediction' };

    // Reverse for most-recent-first access
    const cycles = [...allCycles].reverse();

    // ── Step 1: Compute cycle lengths from consecutive periods ──
    const cycleLengths: number[] = [];
    for (let i = 0; i < allCycles.length - 1; i++) {
      const diff = Math.floor(
        (allCycles[i + 1].startDate.getTime() - allCycles[i].startDate.getTime()) / 86400000
      );
      if (diff >= 18 && diff <= 50) cycleLengths.push(diff); // ACOG: normal range 21-35, allow wider
    }

    // ── Step 2: Weighted moving average (Bull 2019) ──────────────
    // Recent cycles weighted exponentially higher
    let avgCycleLength = profile.cycleLength || 28;
    let cycleSD = 0;
    if (cycleLengths.length >= 2) {
      const recentLengths = cycleLengths.slice(-12); // Last 12 valid lengths
      const weights = exponentialWeights(recentLengths.length, 0.75);
      // Reverse weights so most recent (last in array) gets highest weight
      weights.reverse();
      avgCycleLength = Math.round(weightedMean(recentLengths, weights));
      cycleSD = stdDev(recentLengths);
    } else if (cycleLengths.length === 1) {
      avgCycleLength = cycleLengths[0];
    }

    // ── Step 3: Individual luteal phase (Lenton 1984) ────────────
    // Fetch BBT data for luteal phase estimation
    const bbtLogs = await prisma.bBTLog.findMany({
      where: { userId },
      orderBy: { logDate: 'asc' },
      take: 200,
    });
    const lutealPhase = estimateLutealPhase(allCycles, bbtLogs);

    // ── Step 4: Compute current cycle position ───────────────────
    const lastStart = cycles[0].startDate;
    const periodLength = profile.periodLength || 5;
    // Normalize to date-only (midnight UTC) so cycleDay increments at midnight, not at the exact time the period was logged
    const todayMidnight = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
    const startMidnight = new Date(Date.UTC(lastStart.getUTCFullYear(), lastStart.getUTCMonth(), lastStart.getUTCDate()));
    const cycleDay = Math.floor((todayMidnight.getTime() - startMidnight.getTime()) / 86400000) + 1;

    // Ovulation day = cycle length - individual luteal phase (NOT the mythical -14)
    const ovulationDay = Math.max(1, Math.min(avgCycleLength - 1, avgCycleLength - lutealPhase));
    const ovulationDate = new Date(lastStart.getTime() + ovulationDay * 86400000);
    const nextPeriod = new Date(lastStart.getTime() + avgCycleLength * 86400000);

    // ── Step 5: Fertile window (Wilcox 1995) ─────────────────────
    // Sperm can survive up to 5 days; egg lives ~12-24h
    const fertileStart = new Date(ovulationDate.getTime() - 5 * 86400000);
    const fertileEnd = new Date(ovulationDate.getTime() + 1 * 86400000);

    // ── Step 6: Prediction confidence interval ───────────────────
    // Based on cycle SD: ±1 SD covers ~68% of cycles, ±2 SD covers ~95%
    const periodWindowEarly = new Date(nextPeriod.getTime() - cycleSD * 86400000);
    const periodWindowLate = new Date(nextPeriod.getTime() + cycleSD * 86400000);
    const ovulationWindowEarly = new Date(ovulationDate.getTime() - cycleSD * 86400000);
    const ovulationWindowLate = new Date(ovulationDate.getTime() + cycleSD * 86400000);

    // ── Step 7: Current phase determination ──────────────────────
    let phase = 'luteal';
    if (cycleDay <= periodLength) phase = 'menstrual';
    else if (cycleDay <= ovulationDay - 3) phase = 'follicular';
    else if (cycleDay <= ovulationDay + 2) phase = 'ovulation';

    // ── Step 8: Fetch biomarkers for today ───────────────────────
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayBBT, todayCM, todayFertility] = await Promise.all([
      prisma.bBTLog.findFirst({ where: { userId, logDate: { gte: today, lt: tomorrow } } }),
      prisma.cervicalMucusLog.findFirst({ where: { userId, logDate: { gte: today, lt: tomorrow } } }),
      prisma.fertilityDailyLog.findFirst({ where: { userId, logDate: { gte: today, lt: tomorrow } } }),
    ]);

    // ── Step 9: Real-time conception probability (Wilcox 1995) ───
    const daysFromOvulation = cycleDay - ovulationDay;
    const wilcoxRate = WILCOX_CONCEPTION_RATES[String(daysFromOvulation) as any] ?? 0;

    // Combine biomarker signals with statistical prediction
    let conceptionProbability = wilcoxRate;
    let fertilityScore = wilcoxRate * 100;
    const biomarkerSignals: string[] = [];

    if (todayCM) {
      const cmScore = CM_FERTILITY_SCORE[todayCM.type] || 0;
      fertilityScore = fertilityScore * 0.5 + cmScore * 100 * 0.5;
      biomarkerSignals.push(`CM: ${todayCM.type}`);
    }

    if (todayFertility?.lhTestResult) {
      const lhScore = LH_FERTILITY_SCORE[todayFertility.lhTestResult] || 0;
      fertilityScore = fertilityScore * 0.6 + lhScore * 100 * 0.4;
      biomarkerSignals.push(`LH: ${todayFertility.lhTestResult}`);
    }

    if (todayBBT) {
      biomarkerSignals.push(`BBT: ${todayBBT.temperature}°C`);
    }

    conceptionProbability = Math.round(fertilityScore) / 100;

    // ── Step 10: Fertility status label ──────────────────────────
    let fertilityStatus = 'low';
    if (fertilityScore >= 80) fertilityStatus = 'peak';
    else if (fertilityScore >= 50) fertilityStatus = 'high';
    else if (fertilityScore >= 25) fertilityStatus = 'moderate';

    // ── Step 11: Confidence assessment ───────────────────────────
    const confidence = computeConfidence({
      cycleCount: cycleLengths.length + 1,
      cycleLengthSD: cycleSD,
      hasBBT: bbtLogs.length > 0,
      hasCM: !!todayCM,
      hasLH: !!todayFertility?.lhTestResult,
    });

    // ── Step 12: BBT thermal shift for current cycle ─────────────
    const currentCycleBBT = bbtLogs
      .filter(b => b.logDate >= lastStart)
      .map(b => ({ date: b.logDate, temp: b.temperature }));
    const thermalShift = detectThermalShift(currentCycleBBT);

    // If BBT confirms ovulation, override statistical estimate
    let confirmedOvulation = false;
    let adjustedOvulationDate = ovulationDate;
    if (thermalShift.detected && thermalShift.ovulationDate) {
      confirmedOvulation = true;
      adjustedOvulationDate = thermalShift.ovulationDate;
      const confirmedOvDay = Math.floor(
        (thermalShift.ovulationDate.getTime() - lastStart.getTime()) / 86400000
      );
      // Recalculate next period based on confirmed ovulation + luteal phase
      const adjustedNextPeriod = new Date(
        thermalShift.ovulationDate.getTime() + lutealPhase * 86400000
      );
      // Update result below
    }

    // ── Step 13: Cycle regularity score (0-100) ──────────────────
    // Based on coefficient of variation: lower CV = more regular
    const regularityScore = cycleLengths.length >= 2
      ? Math.round(Math.max(0, 100 - (cycleSD / mean(cycleLengths)) * 200))
      : 50; // Neutral if not enough data

    // ── Step 14: Phase-specific hormone estimates ────────────────
    // Relative levels (0-100) based on standard menstrual physiology
    const hormones = getHormoneEstimates(cycleDay, ovulationDay, periodLength, avgCycleLength);

    const result = {
      // Core prediction
      cycleDay,
      phase,
      cycleLength: avgCycleLength,
      periodLength,
      lutealPhase,
      ovulationDay,

      // Dates
      nextPeriodDate: confirmedOvulation
        ? new Date(adjustedOvulationDate.getTime() + lutealPhase * 86400000)
        : nextPeriod,
      ovulationDate: confirmedOvulation ? adjustedOvulationDate : ovulationDate,
      confirmedOvulation,
      fertileStart,
      fertileEnd,

      // Confidence intervals (68% CI based on SD)
      periodWindow: { early: periodWindowEarly, late: periodWindowLate },
      ovulationWindow: { early: ovulationWindowEarly, late: ovulationWindowLate },

      // Countdown — allow negative values so frontend can detect late/overdue periods
      daysUntilPeriod: Math.floor(
        ((confirmedOvulation
          ? adjustedOvulationDate.getTime() + lutealPhase * 86400000
          : nextPeriod.getTime()) - todayMidnight.getTime()) / 86400000
      ),
      daysUntilOvulation: Math.max(0, ovulationDay - cycleDay),

      // Fertility
      fertilityScore: Math.round(fertilityScore),
      fertilityStatus,
      conceptionProbability,
      biomarkerSignals,

      // Statistics
      cycleVariability: Math.round(cycleSD * 10) / 10,
      regularityScore,
      cycleLengths: cycleLengths.slice(-12),
      totalCyclesTracked: allCycles.length,

      // Cycle abnormality alerts — evidence-based detection
      alerts: (() => {
        const alerts: { type: string; severity: 'info' | 'warning' | 'urgent'; title: string; message: string; ayurvedic?: string }[] = [];
        const avgLen = cycleLengths.length > 0 ? cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length : 28;
        const daysSinceLastPeriod = Math.floor((Date.now() - allCycles[0]?.startDate?.getTime()) / 86400000);

        // Amenorrhea: >90 days since last period
        if (daysSinceLastPeriod > 90) {
          alerts.push({ type: 'amenorrhea', severity: 'urgent', title: 'No Period for ' + daysSinceLastPeriod + ' Days',
            message: 'Secondary amenorrhea (>90 days). Please consult a gynecologist. Rule out pregnancy, thyroid disorders, PCOS, or hypothalamic amenorrhea.',
            ayurvedic: 'Artava Kshaya [Sushruta Sha. 2/29]. Vata-dominant condition. Shatavari + Ashwagandha under practitioner supervision.' });
        }
        // Oligomenorrhea: cycle length consistently >35 days
        else if (avgLen > 35 && cycleLengths.length >= 2) {
          alerts.push({ type: 'oligomenorrhea', severity: 'warning', title: 'Infrequent Cycles (' + Math.round(avgLen) + ' day avg)',
            message: 'Cycles >35 days may indicate PCOS, thyroid issues, or hormonal imbalance. Track 3+ cycles and consult a doctor if persistent.',
            ayurvedic: 'Kapha-Vata imbalance blocking Artava Vaha Srotas. Lodhra + Shatavari + Triphala [Charaka].' });
        }
        // Polymenorrhea: cycle length consistently <21 days
        if (avgLen < 21 && cycleLengths.length >= 2) {
          alerts.push({ type: 'polymenorrhea', severity: 'warning', title: 'Frequent Cycles (' + Math.round(avgLen) + ' day avg)',
            message: 'Cycles <21 days may indicate luteal phase defect, anovulation, or hormonal imbalance. Please consult a gynecologist.',
            ayurvedic: 'Pitta excess disturbing Rasa-Rakta dhatu. Ashoka bark + Shatavari (cooling) [Bhavaprakasha].' });
        }
        // Sudden cycle length change: latest cycle differs >7 days from average
        if (cycleLengths.length >= 3) {
          const latest = cycleLengths[cycleLengths.length - 1];
          const prevAvg = cycleLengths.slice(0, -1).reduce((a, b) => a + b, 0) / (cycleLengths.length - 1);
          if (Math.abs(latest - prevAvg) > 7) {
            alerts.push({ type: 'cycle_change', severity: 'info', title: 'Cycle Length Changed',
              message: `Your latest cycle (${latest} days) differs significantly from your average (${Math.round(prevAvg)} days). This can be caused by stress, travel, illness, or hormonal changes.`,
              ayurvedic: 'Vata aggravation from lifestyle change. Restore Dinacharya (daily routine) and Ritucharya (seasonal routine).' });
          }
        }
        // High irregularity: SD > 7 days
        if (cycleSD > 7 && cycleLengths.length >= 3) {
          alerts.push({ type: 'irregular', severity: 'warning', title: 'Irregular Cycle Pattern',
            message: 'Your cycles vary significantly (\u00B1' + Math.round(cycleSD) + ' days). This may indicate PCOS, thyroid, or stress-related hormonal disruption. Consider tracking BBT for 3 cycles.',
            ayurvedic: 'Vata-dominant Rajodushti. Shatavari + Ashwagandha + Dashmool to stabilize Apana Vata [Charaka Chi. 30].' });
        }
        return alerts;
      })(),

      // BBT analysis
      thermalShift: thermalShift.detected ? {
        detected: true,
        ovulationDate: thermalShift.ovulationDate,
        coverlineTemp: thermalShift.coverlineTemp,
      } : { detected: false },

      // Hormones (estimated)
      hormones,

      // Confidence
      confidence,
    };

    await cacheSet(cacheKey, result, 1800); // 30 min cache (shorter for real-time biomarker data)
    return result;
  }

  // ════════════════════════════════════════════════════════════════
  // FERTILITY INSIGHTS — detailed analysis endpoint
  // ════════════════════════════════════════════════════════════════
  async getFertilityInsights(userId: string) {
    const cacheKey = `fertility:${userId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    const cycles = await prisma.cycle.findMany({
      where: { userId },
      orderBy: { startDate: 'asc' },
      take: 24,
    });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);

    const [bbtLogs, cmLogs, dailyLogs, symptomLogs] = await Promise.all([
      prisma.bBTLog.findMany({ where: { userId, logDate: { gte: ninetyDaysAgo } }, orderBy: { logDate: 'asc' } }),
      prisma.cervicalMucusLog.findMany({ where: { userId, logDate: { gte: ninetyDaysAgo } }, orderBy: { logDate: 'asc' } }),
      prisma.fertilityDailyLog.findMany({ where: { userId, logDate: { gte: ninetyDaysAgo } }, orderBy: { logDate: 'asc' } }),
      prisma.symptomLog.findMany({ where: { userId, logDate: { gte: ninetyDaysAgo } }, orderBy: { logDate: 'asc' } }),
    ]);

    // Cycle length analysis
    const cycleLengths: number[] = [];
    for (let i = 0; i < cycles.length - 1; i++) {
      const diff = Math.floor(
        (cycles[i + 1].startDate.getTime() - cycles[i].startDate.getTime()) / 86400000
      );
      if (diff >= 18 && diff <= 50) cycleLengths.push(diff);
    }

    const avgCycleLength = cycleLengths.length ? Math.round(mean(cycleLengths)) : (profile?.cycleLength || 28);
    const cycleSD = cycleLengths.length >= 2 ? stdDev(cycleLengths) : 0;
    const shortestCycle = cycleLengths.length ? Math.min(...cycleLengths) : avgCycleLength;
    const longestCycle = cycleLengths.length ? Math.max(...cycleLengths) : avgCycleLength;

    // Period length analysis
    const periodLengths: number[] = cycles
      .filter(c => c.endDate)
      .map(c => Math.floor((c.endDate!.getTime() - c.startDate.getTime()) / 86400000) + 1)
      .filter(l => l >= 1 && l <= 10);

    // Luteal phase estimation
    const lutealPhase = estimateLutealPhase(cycles, bbtLogs);

    // BBT chart data (last 90 days)
    const bbtChartData = bbtLogs.map(b => ({
      date: b.logDate,
      temp: b.temperature,
      method: b.method,
    }));

    // Cervical mucus pattern analysis
    const cmPattern: Record<string, number> = {};
    cmLogs.forEach(l => { cmPattern[l.type] = (cmPattern[l.type] || 0) + 1; });

    // Symptom-phase correlation
    const symptomPhaseCorrelation = computeSymptomPhaseCorrelation(cycles, symptomLogs, avgCycleLength, lutealPhase);

    // Conception window calendar (next 3 cycles)
    const lastCycleStart = cycles.length ? cycles[cycles.length - 1].startDate : new Date();
    const futureWindows = [];
    for (let c = 0; c < 3; c++) {
      const cycleStart = new Date(lastCycleStart.getTime() + (c * avgCycleLength) * 86400000);
      const ovDate = new Date(cycleStart.getTime() + (avgCycleLength - lutealPhase) * 86400000);
      futureWindows.push({
        cycleStart,
        ovulationDate: ovDate,
        fertileStart: new Date(ovDate.getTime() - 5 * 86400000),
        fertileEnd: new Date(ovDate.getTime() + 1 * 86400000),
        periodStart: new Date(cycleStart.getTime() + avgCycleLength * 86400000),
      });
    }

    const result = {
      // Cycle statistics
      totalCycles: cycles.length,
      avgCycleLength,
      cycleSD: Math.round(cycleSD * 10) / 10,
      shortestCycle,
      longestCycle,
      avgPeriodLength: periodLengths.length ? Math.round(mean(periodLengths)) : (profile?.periodLength || 5),
      cycleLengths: cycleLengths.slice(-12),
      regularityScore: cycleLengths.length >= 2
        ? Math.round(Math.max(0, 100 - (cycleSD / mean(cycleLengths)) * 200))
        : 50,

      // Phases
      lutealPhase,
      follicularPhase: avgCycleLength - lutealPhase,
      lutealPhaseSource: bbtLogs.length > 0 ? 'bbt_confirmed' : 'statistical_estimate',

      // BBT data
      bbtChartData,
      thermalShiftHistory: bbtLogs.length >= 6
        ? detectThermalShift(bbtLogs.map(b => ({ date: b.logDate, temp: b.temperature })))
        : { detected: false },

      // Cervical mucus patterns
      cmPattern,
      cmLogCount: cmLogs.length,

      // Symptom correlations
      symptomPhaseCorrelation,

      // Future fertility windows
      futureWindows,

      // Intercourse timing (from daily logs)
      intercourseLog: dailyLogs.filter(d => d.intercourse).map(d => ({ date: d.logDate })),

      // Tracking completeness score
      trackingScore: computeTrackingScore(bbtLogs.length, cmLogs.length, dailyLogs.length, cycles.length),
    };

    await cacheSet(cacheKey, result, 3600);
    return result;
  }

  // ════════════════════════════════════════════════════════════════
  // BBT LOGGING
  // ════════════════════════════════════════════════════════════════
  async logBBT(userId: string, data: { temperature: number; time?: string; method?: string; logDate: string; notes?: string }) {
    const logDate = new Date(data.logDate);
    logDate.setHours(0, 0, 0, 0);

    const result = await prisma.bBTLog.upsert({
      where: { userId_logDate: { userId, logDate } },
      update: { temperature: data.temperature, time: data.time, method: data.method || 'oral', notes: data.notes },
      create: { userId, temperature: data.temperature, time: data.time, method: data.method || 'oral', logDate, notes: data.notes },
    });

    await cacheDel(`predictions:${userId}`);
    await cacheDel(`fertility:${userId}`);
    return result;
  }

  async getBBTHistory(userId: string, days = 90) {
    const since = new Date(Date.now() - days * 86400000);
    return prisma.bBTLog.findMany({
      where: { userId, logDate: { gte: since } },
      orderBy: { logDate: 'asc' },
    });
  }

  // ════════════════════════════════════════════════════════════════
  // CERVICAL MUCUS LOGGING
  // ════════════════════════════════════════════════════════════════
  async logCervicalMucus(userId: string, data: { type: string; amount?: string; logDate: string; notes?: string }) {
    const logDate = new Date(data.logDate);
    logDate.setHours(0, 0, 0, 0);

    const validTypes = ['dry', 'sticky', 'creamy', 'watery', 'eggWhite', 'spotting'];
    if (!validTypes.includes(data.type)) {
      throw new Error(`Invalid CM type. Must be one of: ${validTypes.join(', ')}`);
    }

    const result = await prisma.cervicalMucusLog.upsert({
      where: { userId_logDate: { userId, logDate } },
      update: { type: data.type, amount: data.amount, notes: data.notes },
      create: { userId, type: data.type, amount: data.amount, logDate, notes: data.notes },
    });

    await cacheDel(`predictions:${userId}`);
    await cacheDel(`fertility:${userId}`);
    return result;
  }

  async getCervicalMucusHistory(userId: string, days = 90) {
    const since = new Date(Date.now() - days * 86400000);
    return prisma.cervicalMucusLog.findMany({
      where: { userId, logDate: { gte: since } },
      orderBy: { logDate: 'asc' },
    });
  }

  // ════════════════════════════════════════════════════════════════
  // DAILY FERTILITY LOG (composite)
  // ════════════════════════════════════════════════════════════════
  async logFertilityDaily(userId: string, data: {
    logDate: string;
    bbt?: number;
    cervicalMucus?: string;
    cervicalPosition?: string;
    lhTestResult?: string;
    intercourse?: boolean;
    notes?: string;
  }) {
    const logDate = new Date(data.logDate);
    logDate.setHours(0, 0, 0, 0);

    // Compute fertility score for this day
    let score = 0;
    let signals = 0;
    if (data.cervicalMucus) {
      score += (CM_FERTILITY_SCORE[data.cervicalMucus] || 0) * 100;
      signals++;
    }
    if (data.lhTestResult) {
      score += (LH_FERTILITY_SCORE[data.lhTestResult] || 0) * 100;
      signals++;
    }
    const fertilityScore = signals > 0 ? Math.round(score / signals) : null;

    const result = await prisma.fertilityDailyLog.upsert({
      where: { userId_logDate: { userId, logDate } },
      update: {
        bbt: data.bbt,
        cervicalMucus: data.cervicalMucus,
        cervicalPosition: data.cervicalPosition,
        lhTestResult: data.lhTestResult,
        intercourse: data.intercourse ?? false,
        fertilityScore,
        notes: data.notes,
      },
      create: {
        userId, logDate,
        bbt: data.bbt,
        cervicalMucus: data.cervicalMucus,
        cervicalPosition: data.cervicalPosition,
        lhTestResult: data.lhTestResult,
        intercourse: data.intercourse ?? false,
        fertilityScore,
        notes: data.notes,
      },
    });

    // Also log BBT and CM to their dedicated tables
    if (data.bbt) {
      await this.logBBT(userId, { temperature: data.bbt, logDate: data.logDate });
    }
    if (data.cervicalMucus) {
      await this.logCervicalMucus(userId, { type: data.cervicalMucus, logDate: data.logDate });
    }

    await cacheDel(`predictions:${userId}`);
    await cacheDel(`fertility:${userId}`);
    return result;
  }

  async getFertilityDailyHistory(userId: string, days = 90) {
    const since = new Date(Date.now() - days * 86400000);
    return prisma.fertilityDailyLog.findMany({
      where: { userId, logDate: { gte: since } },
      orderBy: { logDate: 'asc' },
    });
  }

  // ════════════════════════════════════════════════════════════════
  // AYURVEDIC + MODERN SCIENCE PERSONALIZED INSIGHTS
  // ════════════════════════════════════════════════════════════════
  async getAyurvedicInsights(userId: string) {
    const cacheKey = `ayurveda:${userId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { dateOfBirth: true } });
    const dosha = profile?.dosha || 'Vata'; // Default to Vata if unknown

    // Get current cycle phase from predictions
    const predictions = await this.getPredictions(userId);
    const phase = predictions?.phase || 'follicular';
    const cycleDay = predictions?.cycleDay || 1;
    const ovulationDay = predictions?.ovulationDay || 14;
    const cycleLength = predictions?.cycleLength || 28;
    const fertilityScore = predictions?.fertilityScore || 0;
    const primaryGoal = profile?.primaryGoal || 'track_periods';
    const isPregnant = (profile as any)?.pregnancyStatus === 'pregnant' || primaryGoal === 'pregnancy';

    // Get recent symptoms for personalized interpretation
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const recentSymptoms = await prisma.symptomLog.findMany({
      where: { userId, logDate: { gte: sevenDaysAgo } },
      orderBy: { logDate: 'desc' },
      take: 5,
    });
    const symptomsList = recentSymptoms.flatMap(s => Array.isArray(s.symptoms) ? s.symptoms : []);

    // ── Resolve dosha for guidance lookup ─────────────────
    // For dual doshas like "Vata-Pitta", get guidance from primary constituent
    const guidanceDosha = dosha.includes('-') ? dosha.split('-')[0].trim() : (dosha === 'Tridoshic' ? 'Vata' : dosha);
    // Try DB-backed content first, fall back to hardcoded
    let doshaGuidance: any;
    try {
      const dbGuidance = await contentService.getDoshaPhaseGuidance(guidanceDosha, phase);
      doshaGuidance = dbGuidance || DOSHA_PHASE_GUIDANCE[guidanceDosha]?.[phase] || DOSHA_PHASE_GUIDANCE.Vata.follicular;
    } catch {
      doshaGuidance = DOSHA_PHASE_GUIDANCE[guidanceDosha]?.[phase] || DOSHA_PHASE_GUIDANCE.Vata.follicular;
    }

    // ── Dual dosha blended guidance ──────────────────────
    const isDualDosha = dosha.includes('-');
    let blendedGuidance = null;
    if (isDualDosha) {
      const [d1, d2] = dosha.split('-').map(d => d.trim());
      let g1: any, g2: any;
      try {
        g1 = await contentService.getDoshaPhaseGuidance(d1, phase) || DOSHA_PHASE_GUIDANCE[d1]?.[phase];
        g2 = await contentService.getDoshaPhaseGuidance(d2, phase) || DOSHA_PHASE_GUIDANCE[d2]?.[phase];
      } catch {
        g1 = DOSHA_PHASE_GUIDANCE[d1]?.[phase];
        g2 = DOSHA_PHASE_GUIDANCE[d2]?.[phase];
      }
      if (g1 && g2) {
        blendedGuidance = {
          dominantDosha: `${g1.dominantDosha} | ${g2.dominantDosha}`,
          imbalanceRisk: `${d1}: ${g1.imbalanceRisk} | ${d2}: ${g2.imbalanceRisk}`,
          diet: [...g1.diet.slice(0, 3), ...g2.diet.slice(0, 3)],
          herbs: [...g1.herbs.slice(0, 2), ...g2.herbs.slice(0, 2)],
          yoga: [...g1.yoga.slice(0, 2), ...g2.yoga.slice(0, 2)],
          lifestyle: [...g1.lifestyle.slice(0, 2), ...g2.lifestyle.slice(0, 2)],
          avoid: [...new Set([...g1.avoid, ...g2.avoid])],
          modernCorrelation: `${g1.modernCorrelation} | ${g2.modernCorrelation}`,
        };
      }
    }

    // ── Conception guidance if TTC ───────────────────────
    const conceptionGuide = (primaryGoal === 'fertility' || primaryGoal === 'ttc')
      ? CONCEPTION_GUIDANCE[guidanceDosha] || CONCEPTION_GUIDANCE.Vata
      : null;

    // ── Symptom interpretation ───────────────────────────
    const symptomInsights = symptomsList.length > 0
      ? interpretSymptomsForDosha(guidanceDosha, symptomsList, phase)
      : [];

    // ── Dynamic daily tip based on cycle day + dosha ─────
    const dailyTip = generateDailyTip(guidanceDosha, phase, cycleDay, ovulationDay, cycleLength, primaryGoal);

    // ── Dosha balance score (0-100) ──────────────────────
    const doshaBalance = computeDoshaBalance(guidanceDosha, symptomsList, phase);

    // ── Weather-based adjustment (real weather first, fallback to season) ──
    let weatherInsight = null;
    let seasonalAdjustment = getSeasonalAdjustment(guidanceDosha); // fallback
    try {
      const weather = await weatherService.getUserWeather(userId);
      if (weather) {
        weatherInsight = weatherService.getWeatherAdjustedRecommendations(dosha, weather);
      }
    } catch { /* silently fall back to seasonal */ }

    // ── Dosha score details from profile ──────────────────
    const p = profile as any;
    const doshaScores = (p?.vataScore != null) ? {
      vata: p.vataScore,
      pitta: p.pittaScore,
      kapha: p.kaphaScore,
      confidence: p.doshaConfidence,
      verified: p.doshaVerified,
      verifiedBy: p.doshaVerifiedBy,
    } : null;

    const activeGuidance = blendedGuidance || {
      dominantDosha: doshaGuidance.dominantDosha,
      imbalanceRisk: doshaGuidance.imbalanceRisk,
      diet: doshaGuidance.diet,
      herbs: doshaGuidance.herbs,
      yoga: doshaGuidance.yoga,
      lifestyle: doshaGuidance.lifestyle,
      avoid: doshaGuidance.avoid,
      modernCorrelation: doshaGuidance.modernCorrelation,
    };

    const result = {
      dosha,
      isDualDosha,
      doshaScores,
      doshaDescription: getDoshaDescription(guidanceDosha),
      phase,
      cycleDay,

      // Core Ayurvedic guidance for current phase (blended for dual doshas)
      guidance: activeGuidance,

      // Daily personalized tip
      dailyTip,

      // Symptom interpretations through Ayurvedic lens
      symptomInsights,

      // Conception guidance (only for TTC users)
      conceptionGuide: conceptionGuide ? {
        rituKala: conceptionGuide.rituKala,
        shukraDhatuTips: conceptionGuide.shukraDhatuTips,
        diet: conceptionGuide.garbhadhanaDiet,
        herbs: conceptionGuide.herbs,
        timing: conceptionGuide.modernTiming,
        spiritual: conceptionGuide.spiritualPractice,
        currentFertilityScore: fertilityScore,
      } : null,

      // Dosha balance assessment
      doshaBalance,

      // Weather-based recommendations (real-time if available)
      weatherInsight,

      // Seasonal recommendations (fallback when no weather data)
      seasonalAdjustment: weatherInsight ? null : seasonalAdjustment,

      // Age & BMI adjustments
      ageAdjustment: getAgeAdjustment(user?.dateOfBirth || null),
      bmiAdjustment: getBMIAdjustment(
        (profile as any)?.height || null,
        (profile as any)?.weight || null,
      ),

      // Mental health phase insight
      mentalHealthInsight: getMentalHealthPhaseInsight(phase, guidanceDosha),

      // Medication interaction warnings
      medicationWarnings: MEDICATION_CYCLE_WARNINGS,

      // Herb safety profiles for recommended herbs
      herbSafetyProfiles: Object.fromEntries(
        (activeGuidance.herbs || []).map((herb: string) => {
          const herbKey = Object.keys(HERB_SAFETY_PROFILE).find(k =>
            herb.toLowerCase().includes(k)
          );
          return [herb, herbKey ? HERB_SAFETY_PROFILE[herbKey] : null];
        }).filter(([, v]: any) => v !== null)
      ),

      // Goal-aware comprehensive disclaimers
      disclaimers: getContextualDisclaimer(
        primaryGoal,
        phase,
        isPregnant,
        user?.dateOfBirth ? Math.floor((Date.now() - user.dateOfBirth.getTime()) / (365.25 * 86400000)) : undefined,
      ),

      // Legacy disclaimer for backward compatibility
      disclaimer: 'These Ayurvedic recommendations are for educational purposes only and do not replace professional medical advice. Consult a qualified Ayurvedic practitioner before starting any herbal regimen. If on prescription medication, consult your doctor before taking herbal supplements.',

      // Comprehensive research references
      references: [
        // Classical Ayurvedic Texts
        { category: 'Classical Ayurveda', citations: [
          'Charaka Samhita — Sutrasthana Ch.1-7 (Tridosha theory), Chikitsasthana Ch.30 (Yoniroga/gynecological disorders)',
          'Sushruta Samhita — Sharirasthana Ch.2-3 (Artava formation, Ritu Chakra, Garbha Sambhava)',
          'Ashtanga Hridaya (Vagbhata) — Sharirasthana Ch.1 (Ritu Kala, Garbhadhana, Rajodushti classification)',
          'Kashyapa Samhita — Khilasthana (Garbhadhana Samskara, pre-conception rituals)',
          'Bhavaprakasha Nighantu (16th c.) — Herbal monographs: Shatavari, Ashoka, Lodhra, Kumari, Guduchi',
          'Yogaratnakara (16th c.) — Yoniroga Chikitsa: Pushyanuga Churna, Ashokarishta formulations',
          'Ayurvedic Pharmacopoeia of India (API) — Official govt. monographs for standardization',
        ]},
        // Modern Ayurvedic Research
        { category: 'Modern Ayurvedic Research', citations: [
          'Priyanka et al. (2020) J Ayurveda Integr Med — Prakriti correlates with menstrual patterns and hormonal profiles',
          'Prasher B et al. (2008) J Transl Med — Ayurgenomics: genome-wide expression differences between Prakriti types',
          'Patwardhan B & Bodeker G (2008) — Ayurvedic genomics: genetic basis for mind-body constitution typologies',
          'Pandey AK et al. (2012) AYU — Prakriti-based medicine: cortisol variability correlates with Vata constitution',
          'Joshi J et al. (2016) J Ayurveda Integr Med — Shatavari improved follicular development in PCOS clinical trial',
          'Sharma A et al. (2018) J Ethnopharmacol — Saraca indica (Ashoka): 70-80% menorrhagia reduction, oxytocin-like activity',
          'Donga SB & Deshpande A (2014) AYU — Artavakshaya management with Phala Ghrita protocol',
          'Chandrasekhar K et al. (2012) IJAM — Ashwagandha: 28% cortisol reduction (n=64, double-blind RCT)',
          'Gogte VM (2000) — Dravyagunavignyan: Ayurvedic pharmacology and therapeutic uses reference',
        ]},
        // Modern Medical Research
        { category: 'Reproductive Medicine', citations: [
          'Wilcox AJ et al. (1995) BMJ — Day-specific conception probabilities (n=221, 625 cycles)',
          'Dunson DB et al. (2002) Hum Reprod — Age-specific decline in fecundity: 50% reduction by age 40',
          'Lenton EA et al. (1984) — Luteal phase variability: 7-19 days (mean 12.4±2.4), NOT always 14 days',
          'Bull JR et al. (2019) npj Digital Medicine — 612K real-world cycles: mean 29.3d, only 13% are 28 days',
          'Stirnemann JJ et al. (2013) — BMI and age effects on menstrual cycle characteristics',
          'Bigelow JL et al. (2004) — Cervical mucus: peak CM = 94.5% ovulation sensitivity',
          'Baird DD et al. (2005) — BBT thermal shift: 97% ovulation specificity (3-over-6 rule)',
          'Stanford JB et al. (2002) — Symptothermal method: 99.4% correct-use effectiveness',
          'Barron ML & Fehring RJ (2005) — Marquette method efficacy validation',
          'Regidor PA et al. (2018) — LH surge variability: 46% have <24h surge duration',
          'Ecochard R et al. (2001) Hum Reprod — ~6% of cycles have multiple LH surges',
          'Soumpasis I et al. (2020) JMIR — Real-world fertility app tracking (n=32,000)',
          'Symul L et al. (2019) npj Digital Medicine — Menstrual cycle prediction accuracy analysis',
        ]},
        // Clinical Guidelines
        { category: 'Clinical Guidelines', citations: [
          'NICE CG156 (2013) — Fertility assessment and treatment guideline',
          'ACOG Practice Bulletin — Clinical management of anovulation',
          'RCOG Green-top Guideline No.47 — Heavy menstrual bleeding (>80ml or >7 days)',
          'WHO (2004) — Standardized days method and ovulation method guidelines for family planning',
        ]},
        // Mental Health & PMS
        { category: 'Mental Health & Hormones', citations: [
          'Hantsoo L & Epperson CN (2015) Curr Psychiatry Rep — Premenstrual dysphoric disorder (PMDD)',
          'Rapkin AJ & Akopians AL (2012) — Serotonin and premenstrual syndrome pathophysiology',
          'Yonkers KA et al. (2008) Lancet — PMDD epidemiology, diagnosis, and treatment',
          'Quaranta S et al. (2007) — Magnesium reduces PMS severity by 40% (RCT)',
          'Sundström Poromaa I & Gingnell M (2014) — Menstrual cycle effects on cognition and emotion',
          'Dreher et al. (2007) PNAS — Reward processing across the menstrual cycle',
        ]},
        // Speroff Endocrinology
        { category: 'Endocrinology', citations: [
          'Speroff L & Fritz MA — Clinical Gynecologic Endocrinology and Infertility (hormone estimation model)',
        ]},
      ],
    };

    await cacheSet(cacheKey, result, 3600); // 1hr cache
    return result;
  }

  // ════════════════════════════════════════════════════════════════
  // EXISTING METHODS (preserved)
  // ════════════════════════════════════════════════════════════════
  async logSymptoms(userId: string, data: { symptoms: string[]; severity?: number; notes?: string }) {
    const result = await prisma.symptomLog.create({ data: { userId, ...data } });
    await cacheDel(`predictions:${userId}`);
    await cacheDel(`ayurveda:${userId}`);
    await cacheDel('insights:' + userId);
    return result;
  }

  async logMood(userId: string, data: { mood: any; notes?: string }) {
    const result = await prisma.moodLog.create({ data: { userId, mood: data.mood, notes: data.notes } });
    await cacheDel(`predictions:${userId}`);
    await cacheDel(`ayurveda:${userId}`);
    await cacheDel('insights:' + userId);
    return result;
  }

  async getMoodHistory(userId: string, days = 30) {
    const since = new Date(Date.now() - days * 86400000);
    return prisma.moodLog.findMany({ where: { userId, logDate: { gte: since } }, orderBy: { logDate: 'desc' } });
  }

  async getSymptomHistory(userId: string, days = 30) {
    const since = new Date(Date.now() - days * 86400000);
    return prisma.symptomLog.findMany({ where: { userId, logDate: { gte: since } }, orderBy: { logDate: 'desc' } });
  }
}

// ─── Hormone level estimation ────────────────────────────────────
// Based on standard menstrual cycle endocrinology (Speroff & Fritz)
function getHormoneEstimates(cycleDay: number, ovulationDay: number, periodLength: number, cycleLength: number) {
  const phasePct = cycleDay / cycleLength;
  const ovPct = ovulationDay / cycleLength;

  // Estrogen: rises in follicular, peaks at ovulation, secondary rise in luteal
  let estrogen: number;
  if (cycleDay <= periodLength) estrogen = 15 + (cycleDay / periodLength) * 10;
  else if (cycleDay <= ovulationDay) estrogen = 25 + ((cycleDay - periodLength) / (ovulationDay - periodLength)) * 75;
  else if (cycleDay <= ovulationDay + 3) estrogen = 100 - ((cycleDay - ovulationDay) / 3) * 50;
  else estrogen = 50 + Math.sin(((cycleDay - ovulationDay - 3) / (cycleLength - ovulationDay - 3)) * Math.PI) * 20;

  // Progesterone: low until ovulation, then rises sharply, peaks mid-luteal
  let progesterone: number;
  if (cycleDay <= ovulationDay) progesterone = 5;
  else {
    const lutealDay = cycleDay - ovulationDay;
    const lutealLength = cycleLength - ovulationDay;
    const peakDay = Math.floor(lutealLength * 0.5);
    if (lutealDay <= peakDay) progesterone = 5 + (lutealDay / peakDay) * 90;
    else progesterone = 95 - ((lutealDay - peakDay) / (lutealLength - peakDay)) * 70;
  }

  // LH: baseline, then massive surge 24-48h before ovulation
  let lh: number;
  if (cycleDay >= ovulationDay - 2 && cycleDay <= ovulationDay) {
    const dist = ovulationDay - cycleDay;
    lh = dist === 2 ? 40 : dist === 1 ? 85 : 100;
  } else lh = 10;

  // FSH: elevated early follicular, drops, small surge at ovulation
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

// ─── Symptom-phase correlation ───────────────────────────────────
function computeSymptomPhaseCorrelation(
  cycles: any[],
  symptomLogs: any[],
  avgCycleLength: number,
  lutealPhase: number,
) {
  const ovulationDay = avgCycleLength - lutealPhase;
  const phaseSymptoms: Record<string, Record<string, number>> = {
    menstrual: {},
    follicular: {},
    ovulation: {},
    luteal: {},
  };

  for (const log of symptomLogs) {
    // Find which cycle this log belongs to
    const cycle = cycles.find(c =>
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

  // Return top 5 symptoms per phase
  const result: Record<string, { symptom: string; count: number }[]> = {};
  for (const [phase, symptoms] of Object.entries(phaseSymptoms)) {
    result[phase] = Object.entries(symptoms)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([symptom, count]) => ({ symptom, count }));
  }
  return result;
}

// ══════════════════════════════════════════════════════════════════
// AYURVEDIC + MODERN SCIENCE INSIGHTS ENGINE
// ══════════════════════════════════════════════════════════════════
//
// RESEARCH BASIS (Ayurveda):
// ─────────────────────────────────────────────────────────────────
// 10. Charaka Samhita (Sutrasthana Ch.1-7) — Tridosha theory: Vata
//     (air+ether), Pitta (fire+water), Kapha (earth+water) govern
//     physiological & psychological functions
// 11. Sushruta Samhita (Sharirasthana Ch.3) — Artava (menstrual
//     blood) is upadhatu of Rasa dhatu; Rajah governed by Pitta
//     with Apana Vata for downward flow
// 12. Ashtanga Hridaya (Sharirasthana Ch.1) — Ritu Kala: optimal
//     conception period = days 12-16 (Rutukala), after Ritusnana
//     (post-menstrual cleansing bath)
// 13. Kashyapa Samhita (Khilasthana) — Garbhadhana Samskara:
//     pre-conception purification, diet, and rituals for healthy
//     conception (Shukra + Artava optimization)
// 14. Vagbhata — Rajodushti: menstrual disorders classified by
//     dosha imbalance (Vataja = pain, Pittaja = heavy/hot flow,
//     Kaphaja = mucus/clots)
// 15. Bhavaprakasha Nighantu — Shatavari, Ashoka, Lodhra, Kumari
//     (Aloe) for Stree Roga (gynecological health)
// 16. Modern integrative: Priyanka et al. (2020) J Ayurveda Integr
//     Med — Ayurvedic Prakriti correlates with menstrual patterns
//     and hormonal profiles (Pitta prakriti = shorter cycles,
//     Kapha = heavier flow, Vata = irregular cycles)
// ══════════════════════════════════════════════════════════════════

// ─── Dosha-Phase Matrix ─────────────────────────────────────────
// Each dosha has specific vulnerabilities and recommendations per
// menstrual cycle phase, based on classical Ayurvedic texts
const DOSHA_PHASE_GUIDANCE: Record<string, Record<string, {
  dominantDosha: string;
  imbalanceRisk: string;
  diet: string[];
  herbs: string[];
  yoga: string[];
  lifestyle: string[];
  avoid: string[];
  modernCorrelation: string;
}>> = {
  Vata: {
    menstrual: {
      dominantDosha: 'Apana Vata governs downward flow (Charaka Samhita)',
      imbalanceRisk: 'Irregular flow, cramping, scanty bleeding, anxiety',
      diet: [
        'Warm sesame oil-cooked foods — grounding & Vata-pacifying',
        'Iron-rich: dates, pomegranate, black sesame, jaggery',
        'Ghee with warm milk + pinch of turmeric (Haldi Doodh)',
        'Moong dal khichdi — easy to digest, nourishing',
        'Avoid raw/cold foods, salads, iced drinks',
      ],
      herbs: [
        'Dashmool Kwath — 10-root decoction, calms Vata, relieves cramps (Charaka Chi.30)',
        'Ashoka bark (Saraca indica) — Artava Sthapana, regulates flow',
        'Shatavari — nourishes Rasa dhatu, balances hormones',
        'Ajwain water — relieves bloating and spasmodic pain',
      ],
      yoga: [
        'Supta Baddha Konasana (reclined butterfly) — opens pelvis',
        'Balasana (child pose) — calms Vata, relieves lower back',
        'Gentle Pranayama: Nadi Shodhana (alternate nostril) — balances Vata',
        'Avoid inversions, intense cardio during menstruation',
      ],
      lifestyle: [
        'Abhyanga (warm sesame oil massage) on lower abdomen & feet',
        'Warm castor oil pack on lower belly for cramp relief',
        'Early sleep by 10 PM — Vata aggravates in late night (2-6 AM)',
        'Rest and reduce workload — Rajahsvala Paricharya (menstrual regimen)',
      ],
      avoid: ['Cold beverages', 'Intense exercise', 'Fasting', 'Late nights', 'Excessive travel'],
      modernCorrelation: 'Prostaglandins peak → uterine contractions. Warm foods ↑ blood flow, reduce spasm (matches Vata-pacifying approach). Magnesium + iron supplementation clinically proven for dysmenorrhea.',
    },
    follicular: {
      dominantDosha: 'Kapha rises as endometrium rebuilds (anabolic phase)',
      imbalanceRisk: 'Low energy, sluggishness if Vata depleted from menstruation',
      diet: [
        'Gradually increase protein: paneer, legumes, nuts, seeds',
        'Ashwagandha milk — adaptogenic, rebuilds Ojas (vitality)',
        'Seasonal fruits, warm soups, cooked vegetables',
        'Flaxseeds — phytoestrogens support follicular development',
      ],
      herbs: [
        'Ashwagandha (standardized root extract, as directed by practitioner) — adaptogenic, reduces cortisol (Withania somnifera)',
        'Shatavari — phytoestrogenic, supports follicle maturation',
        'Guduchi (Tinospora) — Rasayana, builds immunity post-period',
        'Triphala at night — gentle detox, supports digestion',
      ],
      yoga: [
        'Sun Salutations (Surya Namaskar) — building energy',
        'Standing poses: Virabhadrasana I & II — strength & grounding',
        'Kapalabhati Pranayama — stimulates metabolism',
        'Gradually increase intensity as energy returns',
      ],
      lifestyle: [
        'Rise before sunrise (Brahma Muhurta) — peak Vata time for creativity',
        'Warm oil massage before bath — nourishes Vata',
        'Start new projects — estrogen rising = peak creativity & confidence',
        'Socialize — this is your most extroverted phase',
      ],
      avoid: ['Excessive fasting', 'Irregular meal times', 'Cold/dry foods'],
      modernCorrelation: 'Rising estradiol stimulates follicular growth. Phytoestrogens (flax, shatavari) may support FSH sensitivity. Ashwagandha reduces cortisol by 28% (Chandrasekhar 2012 IJAM).',
    },
    ovulation: {
      dominantDosha: 'Pitta peaks — Artava (ovum) is Agneya (fiery) in nature',
      imbalanceRisk: 'Excess heat, irritability, skin breakouts',
      diet: [
        'Cooling foods: cucumber, coconut water, mint chutney, fennel',
        'Rose petal jam (Gulkand) — cools Pitta, supports Shukra dhatu',
        'Pomegranate — Pitta-pacifying, rich in antioxidants',
        'Light meals — Agni (digestive fire) is moderate',
      ],
      herbs: [
        'Shatavari — peak fertility support, nourishes Artava',
        'Yashtimadhu (Licorice) — cooling, anti-inflammatory (avoid if hypertensive; limit to 4-6 weeks)',
        'Gulkand (rose petal preserve) or food-grade rose water (Arq-e-Gulab) — cools Pitta, calms mind',
        'Kumari (Aloe vera) — Pitta-pacifying, supports cervical mucus',
      ],
      yoga: [
        'Hip openers: Pigeon pose, Malasana (garland) — pelvic circulation',
        'Sheetali Pranayama (cooling breath) — cools excess Pitta',
        'Moderate cardio — peak strength window',
        'Partner yoga if TTC — bonding hormone release',
      ],
      lifestyle: [
        'Moonlight walks — cooling, romantic (Chandra Namaskar energy)',
        'Wear white/light colors — reflects heat, calms Pitta',
        'If TTC: this is Ritu Kala — optimal conception window (Ashtanga Hridaya)',
        'Intercourse timing: egg-white CM + positive LH = peak 24-48h window',
      ],
      avoid: ['Spicy food', 'Excessive sun', 'Hot baths', 'Anger/arguments'],
      modernCorrelation: 'LH surge triggers ovulation within 24-48h. Egg viable 12-24h. Body temp rises 0.2-0.5°C (BBT shift). Cervical mucus becomes egg-white consistency — 94.5% ovulation sensitivity (Bigelow 2004).',
    },
    luteal: {
      dominantDosha: 'Vata begins to accumulate, Pitta sustains corpus luteum',
      imbalanceRisk: 'PMS: anxiety (Vata), irritability (Pitta), water retention (Kapha)',
      diet: [
        'Complex carbs: sweet potato, whole grains — serotonin support',
        'Magnesium-rich: pumpkin seeds, dark chocolate, spinach',
        'Warm turmeric latte — anti-inflammatory, Pitta-calming',
        'Sesame-jaggery laddoo — iron + warmth for Vata',
      ],
      herbs: [
        'Ashoka bark — Pitta-Kapha balance, prevents heavy upcoming flow',
        'Shankhpushpi — calms anxiety, supports progesterone (Vata-Pitta)',
        'Brahmi — reduces mental agitation, improves sleep',
        'Lodhra (Symplocos) — Kapha-pacifying, prevents water retention',
      ],
      yoga: [
        'Restorative: Viparita Karani (legs up wall) — calms nervous system',
        'Yin yoga — slow, grounding, Vata-pacifying',
        'Yoga Nidra — deep relaxation, reduces PMS symptoms',
        'Reduce intensity gradually as period approaches',
      ],
      lifestyle: [
        'Journal/reflect — progesterone = introspective energy',
        'Warm baths with Epsom salt — magnesium absorption through skin',
        'Digital sunset by 8 PM — blue light disrupts melatonin',
        'Prepare for upcoming period: stock warm foods, plan lighter schedule',
      ],
      avoid: ['Caffeine excess', 'Sugar binges', 'Late nights', 'Over-scheduling'],
      modernCorrelation: 'Progesterone dominates: ↑ body temp, ↑ appetite, ↓ serotonin. If no implantation, corpus luteum degrades → progesterone crash → PMS. Magnesium reduces PMS severity by 40% (Quaranta 2007).',
    },
  },
  Pitta: {
    menstrual: {
      dominantDosha: 'Pitta dominant — Rakta (blood) is Pitta\'s seat',
      imbalanceRisk: 'Heavy bleeding, clots, headaches, hot flashes, irritability',
      diet: [
        'Cooling: coconut water, cucumber raita, coriander water',
        'Iron replenishment: beetroot juice, pomegranate, dates',
        'Gulkand (rose petal preserve) — classic Pitta coolant',
        'Avoid spicy, fermented, sour foods during bleeding',
      ],
      herbs: [
        'Ashoka bark — primary herb for Pittaja Yoniroga (heavy periods)',
        'Ushira (Vetiver) water — cools Rakta dhatu, reduces heavy flow',
        'Durva grass (Cynodon) — Raktastambhana (stops excess bleeding)',
        'Chandanadi Vati — sandalwood-based, cools internal heat',
      ],
      yoga: [
        'Sheetali/Sheetkari Pranayama — cooling breaths for Pitta',
        'Supta Virasana (reclined hero) — cools abdomen',
        'Gentle forward bends — calming without heating',
        'Chandra Namaskar (moon salutation) — cooling alternative to Surya',
      ],
      lifestyle: [
        'Cool compress on forehead if headaches occur',
        'Coconut oil massage instead of sesame (too heating for Pitta)',
        'Sleep in cool, well-ventilated room',
        'Practice Pitta-calming meditation: visualization of moonlight/water',
      ],
      avoid: ['Spicy food', 'Sun exposure', 'Hot baths', 'Competitive activities', 'Alcohol'],
      modernCorrelation: 'Pitta prakriti correlates with higher estradiol levels and shorter cycles (Priyanka 2020). Heavy menstrual bleeding (menorrhagia) is clinical when >80ml/cycle. Iron deficiency risk is real — supplement with Vitamin C for absorption.',
    },
    follicular: {
      dominantDosha: 'Kapha rebuilding phase, Pitta cooling naturally',
      imbalanceRisk: 'Skin inflammation, acid reflux if Pitta still elevated',
      diet: [
        'Bitter greens: neem juice (small dose), bitter gourd, methi',
        'Sweet fruits: grapes, melons, pears — naturally Pitta-cooling',
        'Moderate protein: mung beans, tofu, cooling fish',
        'Fresh mint + fennel water throughout the day',
      ],
      herbs: [
        'Amalaki (Indian Gooseberry) — Pitta Rasayana, vitamin C rich',
        'Neem — blood purifier, skin-clearing (Pitta tends to breakouts)',
        'Shatavari — supports estrogen rise without overheating',
        'Aloe vera juice — cools digestive Pitta',
      ],
      yoga: [
        'Moderate Vinyasa — channel Pitta energy productively',
        'Twists for detox: Ardha Matsyendrasana — liver/digestion support',
        'Swimming — ideal for Pitta (cooling exercise)',
        'Trataka (candle gazing) — focuses Pitta mind without agitation',
      ],
      lifestyle: [
        'Channel ambition into creative projects — Pitta peak productivity',
        'Eat meals on schedule — Pitta needs regular Agni management',
        'Nature walks near water — rivers, lakes cool Pitta',
        'Practice compassion meditation — Pitta tends toward criticism',
      ],
      avoid: ['Skipping meals', 'Over-working', 'Excessive competition'],
      modernCorrelation: 'Follicular phase: estradiol rises → skin improves, energy peaks. For Pitta types with acne: zinc + neem shown to reduce inflammatory acne by 50% (Yee 2020 Dermatol Ther).',
    },
    ovulation: {
      dominantDosha: 'Peak Pitta — ovulation itself is an Agneya (fiery) event',
      imbalanceRisk: 'Ovulation pain (mittelschmerz), excess heat, skin flares',
      diet: [
        'Maximum cooling: raw coconut, watermelon, khus sherbet',
        'Rose sherbet with sabja seeds — classic Pitta recipe',
        'Fennel + coriander seed tea — digestive cooling',
        'Light meals — strong Agni needs less fuel',
      ],
      herbs: [
        'Shatavari (peak dose during fertile window, as directed by practitioner)',
        'Kumari (Aloe) — cools uterine Pitta, supports CM quality',
        'Rose water — internal cooling, emotional balance',
        'Brahmi — calms Pitta mind, reduces over-thinking',
      ],
      yoga: [
        'Dynamic flow — Pitta has maximum power at ovulation',
        'Hip openers with breath focus — pelvic energy flow',
        'Cooling Pranayama after exercise — Sheetali + Brahmari',
        'Dance/creative movement — express Pitta fire constructively',
      ],
      lifestyle: [
        'If TTC: peak window — Ritu Kala (Ashtanga Hridaya Sha.1)',
        'Keep emotions cool — Pitta temper peaks with hormones',
        'Apply sandalwood paste on pulse points — Pitta cooling ritual',
        'Evening walks — avoid midday sun',
      ],
      avoid: ['Arguments', 'Spicy food', 'Midday sun', 'Over-exercising'],
      modernCorrelation: 'Pitta types may experience stronger mittelschmerz (ovulation pain) due to inflammatory tendency. NSAIDs work but cooling herbs offer gentler approach. Cervical mucus quality peaks — egg-white CM is the fertility gold standard.',
    },
    luteal: {
      dominantDosha: 'Pitta sustains corpus luteum, Vata begins rising',
      imbalanceRisk: 'Anger, migraines, skin breakouts, acid reflux, insomnia',
      diet: [
        'Anti-inflammatory: turmeric + black pepper, omega-3 rich foods',
        'Bitter + sweet tastes: kale, dates, almonds, milk',
        'Chamomile + lavender tea before bed',
        'Small frequent meals — prevent Pitta acid spikes',
      ],
      herbs: [
        'Shankhpushpi — calms Pitta-aggravated mind',
        'Brahmi — neuroprotective, reduces PMS irritability',
        'Yashtimadhu — soothes digestive Pitta (avoid if hypertensive; limit to 4-6 weeks)',
        'Triphala — gentle detox, prepare for upcoming flow',
      ],
      yoga: [
        'Cooling Yin yoga — long holds, surrender',
        'Forward folds — calms nervous system',
        'Supported backbends — open chest without strain',
        'Brahmari Pranayama (humming bee) — immediate Pitta calm',
      ],
      lifestyle: [
        'Early dinner by 7 PM — allow digestive rest',
        'Moonlight meditation — cooling, Pitta-balancing',
        'Cool room for sleep — Pitta insomnia worsens in heat',
        'Creative outlet: painting, music — channel PMS intensity positively',
      ],
      avoid: ['Spicy food', 'Alcohol', 'Late dinners', 'Heated arguments', 'Overworking'],
      modernCorrelation: 'Progesterone is thermogenic — Pitta types feel this more intensely. Migraines linked to estrogen withdrawal pre-menstrually. Magnesium + riboflavin shown to reduce menstrual migraines by 50% (Mauskop 2012).',
    },
  },
  Kapha: {
    menstrual: {
      dominantDosha: 'Kapha tendency — heavier, longer, more mucoid flow',
      imbalanceRisk: 'Heavy flow with clots, lethargy, water retention, emotional eating',
      diet: [
        'Light, warm, stimulating: ginger tea, pepper, dry foods',
        'Avoid dairy, sweets, heavy foods during period',
        'Warm water with lemon + honey — Kapha-reducing morning drink',
        'Spiced mung soup — light, warm, easy to digest',
      ],
      herbs: [
        'Lodhra (Symplocos racemosa) — #1 herb for Kaphaja Yoniroga',
        'Trikatu (ginger-pepper-pippali) — kindles Agni, reduces Kapha',
        'Guggulu — anti-inflammatory, reduces water retention',
        'Triphala — prevents sluggish elimination',
        'Manjistha (Rubia cordifolia) — Rakta Shodhaka, blood purifier, reduces clots',
      ],
      yoga: [
        'Gentle Surya Namaskar — keep energy moving (Kapha stagnates)',
        'Twist poses — squeeze out Kapha from tissues',
        'Kapalabhati (skull-shining breath) — energizing, Kapha-reducing',
        'Even during period, light movement prevents Kapha buildup',
      ],
      lifestyle: [
        'Dry brush (Garshana) before shower — stimulates lymphatic flow',
        'Warm herbal steam — reduces congestion (Kapha = mucus)',
        'Don\'t oversleep — Kapha people tend to excess sleep during period',
        'Stay warm — cold increases Kapha and worsens water retention',
      ],
      avoid: ['Cold foods', 'Dairy', 'Oversleeping', 'Inactivity', 'Heavy meals'],
      modernCorrelation: 'Kapha prakriti associated with higher BMI, longer cycles, heavier flow (Priyanka 2020). Water retention is prostaglandin-mediated. Light exercise during menstruation reduces bloating by 30% (Daley 2009 BJOG).',
    },
    follicular: {
      dominantDosha: 'Kapha naturally dominant — endometrium rebuilding (anabolic)',
      imbalanceRisk: 'Weight gain, sluggishness, congestion',
      diet: [
        'Stimulating spices: turmeric, black pepper, cumin, mustard seeds',
        'Light proteins: chickpeas, sprouts, grilled vegetables',
        'Honey in warm water — Kapha-reducing (never heat honey directly)',
        'Cruciferous vegetables: broccoli, cauliflower — support estrogen metabolism',
      ],
      herbs: [
        'Guggulu — thyroid support, weight management (Kapha tendency)',
        'Punarnava — kidney tonic, reduces water retention',
        'Chitrak (Plumbago) — kindles digestive fire',
        'Tulsi — adaptogenic, lightens Kapha heaviness',
      ],
      yoga: [
        'Vigorous Vinyasa or Ashtanga — peak time to challenge Kapha',
        'Backbends: Ustrasana, Bhujangasana — open chest, reduce Kapha',
        'Running, HIIT — Kapha benefits from intense cardio',
        'Bhastrika Pranayama (bellows breath) — ignites Agni',
      ],
      lifestyle: [
        'Wake before 6 AM — avoid Kapha time (6-10 AM = sluggishness)',
        'Dry sauna or steam — reduces Kapha and water weight',
        'Start challenging projects — estrogen energy + Kapha stability = productivity',
        'Reduce screen time — increase physical activity',
      ],
      avoid: ['Oversleeping', 'Heavy breakfast', 'Dairy', 'Sedentary behavior'],
      modernCorrelation: 'Follicular estrogen rise in Kapha types may cause more fluid retention. Cruciferous vegetables contain DIM (diindolylmethane) which supports healthy estrogen metabolism — clinically relevant for PCOS-prone Kapha types.',
    },
    ovulation: {
      dominantDosha: 'Pitta temporarily peaks — ovulation is universal Pitta event',
      imbalanceRisk: 'Bloating, mild acne from hormone surge',
      diet: [
        'Balance Kapha-Pitta: warm but not too spicy',
        'Moderate portions — resist Kapha urge to overeat',
        'Fresh ginger before meals — supports Agni',
        'Bitter salads with warm dressing — Kapha + Pitta pacifying',
      ],
      herbs: [
        'Shatavari — fertility support (universal for all doshas at ovulation)',
        'Ashwagandha — adaptogenic, supports Shukra dhatu',
        'Pippali (long pepper) — stimulates without overheating',
        'Brahmi — focus and clarity',
      ],
      yoga: [
        'Power yoga or sport — peak physical performance',
        'Hip openers with dynamic movement — not static',
        'Team sports — Kapha thrives with social energy',
        'Agni Sara — abdominal churning, stimulates Kapha center',
      ],
      lifestyle: [
        'If TTC: be consistent with timing — Kapha benefits from routine',
        'Social activities — Kapha ovulation = peak charm and warmth',
        'Reduce sugar and dairy — prevent Kapha-related CM mucus issues',
        'Short, energizing showers — not long soaks',
      ],
      avoid: ['Heavy meals', 'Excessive dairy', 'Napping', 'Sugar'],
      modernCorrelation: 'Ovulation window for Kapha types: cervical mucus may be thicker/more opaque than textbook egg-white. Track CM changes relative to YOUR baseline, not generic descriptions.',
    },
    luteal: {
      dominantDosha: 'Kapha increases pre-menstrually — water + earth elements',
      imbalanceRisk: 'Severe water retention, emotional eating, depression, lethargy',
      diet: [
        'Anti-Kapha: warm, light, spiced — no comfort food binging',
        'Warm spiced apple or pear — sweet taste without Kapha increase',
        'Ginger-lemon water throughout day — metabolism support',
        'Avoid: cheese, ice cream, bread, pasta (worst Kapha foods)',
      ],
      herbs: [
        'Punarnava — #1 for Kapha water retention',
        'Trikatu — maintains Agni as Kapha rises',
        'Guggulu — mood support, thyroid balance',
        'Jatamansi (Nardostachys jatamansi) — clears Kapha mental fog',
      ],
      yoga: [
        'Maintain exercise — DON\'T give in to Kapha lethargy',
        'Backbends and chest openers — counter Kapha heaviness',
        'Ujjayi Pranayama — warming, focusing breath',
        'Group classes — accountability prevents Kapha avoidance',
      ],
      lifestyle: [
        'Don\'t comfort eat — recognize it as Kapha PMS pattern',
        'Morning exercise non-negotiable — prevents spiraling lethargy',
        'Dry brushing daily — moves lymph, reduces bloating',
        'Plan social commitments — Kapha PMS = isolation tendency',
      ],
      avoid: ['Comfort food', 'Isolation', 'Sleeping past 7 AM', 'Skipping exercise', 'Dairy'],
      modernCorrelation: 'Kapha PMS is dominated by water retention (up to 3-5 lbs) and emotional eating driven by serotonin drop. Regular exercise maintains serotonin. Dandelion tea (similar to Punarnava) clinically reduces water retention.',
    },
  },
};

// ─── Conception Guidance (Ritu Kala + Modern Science) ─────────
const CONCEPTION_GUIDANCE: Record<string, {
  rituKala: string;
  shukraDhatuTips: string[];
  garbhadhanaDiet: string[];
  herbs: string[];
  modernTiming: string[];
  spiritualPractice: string[];
}> = {
  Vata: {
    rituKala: 'Vata women: Ritu Kala (fertile window) may shift due to irregular cycles. Track BBT + CM for 3+ cycles to establish YOUR pattern (not textbook day 14).',
    shukraDhatuTips: [
      'Abhyanga with Bala oil — nourishes Vata reproductive tissues',
      'Warm, unctuous diet — ghee, sesame, almonds build Shukra dhatu',
      'Regular routine (Dinacharya) — Vata fertility depends on stability',
      'Address anxiety first — cortisol directly suppresses GnRH (fertility hormone)',
    ],
    garbhadhanaDiet: [
      'Pre-conception (3 months): daily ghee, warm milk, soaked almonds',
      'Shatavari + Ashwagandha — classic fertility duo for Vata',
      'Black sesame laddoo — iron + healthy fats for implantation',
      'Avoid raw/cold foods — impairs Agni → poor nutrient absorption',
    ],
    herbs: [
      'Shatavari (as directed by practitioner) — phytoestrogenic, uterine tonic',
      'Ashwagandha (standardized root extract, as directed by practitioner) — reduces cortisol 28%, improves egg quality (Chandrasekhar 2012)',
      'Bala (Sida cordifolia) — Vata-specific reproductive tonic',
      'Dashmool — calms Vata, supports implantation',
    ],
    modernTiming: [
      'Track BBT for 3+ cycles — Vata cycles vary; your luteal phase is key',
      'Intercourse every other day during fertile window — sperm need 48h to regenerate',
      'Egg-white CM + positive LH = peak 24-48h (Wilcox 1995: 31-33% conception rate)',
      'Post-intercourse: lie still 15 min — no evidence this helps, but reduces anxiety (Vata benefit)',
    ],
    spiritualPractice: [
      'Garbhadhana Samskara: pre-conception prayer/intention setting',
      'Create calm, warm environment — Vata needs Sattvik (pure) surroundings',
      'Both partners: reduce travel and stimulation for 3 months pre-conception',
    ],
  },
  Pitta: {
    rituKala: 'Pitta women: typically regular cycles with clear ovulation signs. Your fertile window is usually predictable. Watch for excess heat reducing cervical mucus quality.',
    shukraDhatuTips: [
      'Cool Pitta reproductive fire — excess heat can damage egg quality',
      'Moonlight bathing (Chandrika Snana) — traditional Pitta fertility practice',
      'Reduce competition/stress — cortisol from overwork is conception enemy',
      'Pitta women often delay conception for career — age factor matters most after 35',
    ],
    garbhadhanaDiet: [
      'Pre-conception (3 months): cooling, sweet, nourishing foods',
      'Daily: sweet fruits (grapes, pomegranate), coconut, ghee',
      'Shatavari milk at bedtime — cools Pitta, builds Artava',
      'Reduce caffeine, spicy food, alcohol — all aggravate Pitta + reduce fertility',
    ],
    herbs: [
      'Shatavari (peak dose during fertile window, as directed by practitioner) — cooling fertility tonic (best herb for Pitta fertility)',
      'Guduchi — Pitta Rasayana, immune modulation',
      'Kumari (Aloe vera) — cools uterine Pitta, improves endometrial lining',
      'Yashtimadhu — anti-inflammatory, supports implantation (avoid if hypertensive; limit to 4-6 weeks)',
    ],
    modernTiming: [
      'Pitta cycles are often 26-28 days — ovulation around day 12-14',
      'Cervical mucus signs are usually clear — trust your body\'s signals',
      'Avoid hot tubs, saunas during fertile window — heat damages egg (and sperm)',
      'Conception rate peaks at CM day + LH peak: coordinate for maximum probability',
    ],
    spiritualPractice: [
      'Let go of control — Pitta\'s biggest conception block is trying too hard',
      'Cooling meditation: visualize moonlight on a calm lake',
      'Practice acceptance — conception has inherent uncertainty',
    ],
  },
  Kapha: {
    rituKala: 'Kapha women: cycles may be longer (30-35 days). Ovulation may occur later (day 16-20). Don\'t assume day 14 — track CM and LH for YOUR ovulation day.',
    shukraDhatuTips: [
      'Stimulate sluggish Agni — Kapha fertility issues often stem from Ama (toxins)',
      'Pre-conception Panchakarma (detox) — especially Vamana (emesis therapy) for Kapha',
      'Weight management — BMI >30 reduces fertility by 50% (clinical correlation)',
      'Regular vigorous exercise — improves insulin sensitivity → improves ovulation',
    ],
    garbhadhanaDiet: [
      'Pre-conception (3 months): light, warm, Kapha-reducing diet',
      'Honey + warm water morning ritual — reduces Kapha, improves metabolism',
      'Avoid dairy, sugar, wheat — worst Kapha-aggravating foods',
      'Sprouted fenugreek — insulin-sensitizing, supports ovulation in PCOS',
    ],
    herbs: [
      'Shatavari (lower dose for Kapha, as directed by practitioner — too much increases Kapha)',
      'Ashwagandha (standardized root extract, as directed by practitioner) — adaptogenic, supports thyroid (Kapha tendency: hypothyroid)',
      'Guggulu — weight management, thyroid support, anti-Ama',
      'Chitrak + Trikatu — kindles digestive and reproductive Agni',
    ],
    modernTiming: [
      'Longer cycles = later ovulation — track for 3+ months to find YOUR pattern',
      'PCOS screening recommended for Kapha with BMI >27 and irregular cycles',
      'Weight loss of even 5% improves ovulation rates significantly (Clark 1995)',
      'Metformin (modern) parallels Guggulu (traditional) for insulin-mediated anovulation',
    ],
    spiritualPractice: [
      'Active Garbhadhana: Kapha needs motivation, not relaxation',
      'Couple exercise routine — build energy together',
      'Set conception intention with clear timeline — Kapha needs structure',
    ],
  },
};

// ─── Dosha-specific symptom interpretation ────────────────────
function interpretSymptomsForDosha(dosha: string, symptoms: string[], phase: string): string[] {
  const interpretations: string[] = [];
  const d = dosha;

  for (const sym of symptoms) {
    const s = sym.toLowerCase();
    if (s.includes('cramp') || s.includes('pain')) {
      if (d === 'Vata') interpretations.push('Cramping in Vata = Apana Vata disturbance. Warm sesame oil on lower abdomen + Dashmool Kwath');
      else if (d === 'Pitta') interpretations.push('Pain with heat/burning = Pitta inflammation. Cool compress + Ashoka bark tea');
      else interpretations.push('Heavy, dull cramps = Kapha congestion. Ginger compress + Trikatu');
    }
    if (s.includes('bloat')) {
      if (d === 'Vata') interpretations.push('Bloating = Vata gas (Adhmana). Ajwain water + Hingvastak churna');
      else if (d === 'Kapha') interpretations.push('Bloating + water retention = Kapha. Punarnava + dry ginger tea');
      else interpretations.push('Bloating = digestive Pitta. Fennel + coriander water');
    }
    if (s.includes('mood') || s.includes('anxiety') || s.includes('irritab')) {
      if (d === 'Vata') interpretations.push('Anxiety/mood swings = Vata mental imbalance. Brahmi + Shankhpushpi + warm milk');
      else if (d === 'Pitta') interpretations.push('Irritability/anger = Pitta mental heat. Brahmi + Gulkand + cooling pranayama');
      else interpretations.push('Depression/withdrawal = Kapha mental heaviness. Jatamansi (Nardostachys jatamansi) + Tulsi + vigorous exercise');
    }
    if (s.includes('headache') || s.includes('migraine')) {
      if (d === 'Pitta') interpretations.push('Menstrual migraine = Pitta Rakta imbalance. Sandalwood paste on temples + Shirolepa');
      else if (d === 'Vata') interpretations.push('Tension headache = Vata. Warm sesame oil on temples + Nasya (nasal oil)');
      else interpretations.push('Heavy headache = Kapha congestion. Eucalyptus steam + Trikatu');
    }
    if (s.includes('acne') || s.includes('skin')) {
      if (d === 'Pitta') interpretations.push('Hormonal acne = Pitta Rakta Dushti. Neem + Manjistha + turmeric face pack');
      else if (d === 'Kapha') interpretations.push('Cystic acne = Kapha Ama in Rakta. Guggulu + Triphala + light diet');
      else interpretations.push('Dry skin = Vata Rakta. Internal ghee + Kumari (Aloe vera gel)');
    }
    if (s.includes('fatigue') || s.includes('tired')) {
      if (d === 'Kapha') interpretations.push('Fatigue = Kapha Tamas. Don\'t rest more — exercise! Ashwagandha + Shilajit');
      else if (d === 'Vata') interpretations.push('Exhaustion = Vata depletion. Rest IS medicine. Bala + warm nourishing foods');
      else interpretations.push('Burnout fatigue = Pitta depletion. Shatavari + Amalaki + complete rest');
    }
  }

  return interpretations.length > 0 ? interpretations : [`Your ${d} constitution during ${phase} phase: follow the dosha-phase guidelines for personalized care`];
}

// ─── Tracking completeness score ─────────────────────────────────
function computeTrackingScore(bbtCount: number, cmCount: number, dailyCount: number, cycleCount: number): {
  score: number;
  grade: string;
  tips: string[];
} {
  let score = 0;
  const tips: string[] = [];

  if (cycleCount >= 3) score += 25;
  else { score += cycleCount * 8; tips.push('Log at least 3 cycles for better predictions'); }

  if (bbtCount >= 20) score += 25;
  else if (bbtCount > 0) { score += Math.min(25, bbtCount); tips.push('Log BBT daily for thermal shift detection'); }
  else tips.push('Start tracking BBT to confirm ovulation with 97% accuracy');

  if (cmCount >= 15) score += 25;
  else if (cmCount > 0) { score += Math.min(25, cmCount * 2); tips.push('Log cervical mucus daily for peak fertility detection'); }
  else tips.push('Track cervical mucus — egg-white CM predicts ovulation with 94.5% sensitivity');

  if (dailyCount >= 20) score += 25;
  else if (dailyCount > 0) { score += Math.min(25, dailyCount); tips.push('Complete daily fertility logs for comprehensive analysis'); }
  else tips.push('Use daily fertility logging for the most accurate predictions');

  const grade = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : score >= 25 ? 'D' : 'F';
  return { score: Math.min(100, score), grade, tips: tips.slice(0, 3) };
}

// ─── Dosha descriptions ─────────────────────────────────────────
function getDoshaDescription(dosha: string): {
  name: string; element: string; qualities: string; cyclePattern: string; fertilityConcern: string;
} {
  const descs: Record<string, any> = {
    Vata: {
      name: 'Vata (Air + Ether)',
      element: 'Movement, creativity, quick changes',
      qualities: 'Light, dry, cold, mobile, subtle',
      cyclePattern: 'Irregular cycles (26-35 days variable), scanty flow, more cramps. Follicular phase may vary widely. Sensitive to stress → cycle disruption.',
      fertilityConcern: 'Irregular ovulation timing. Anxiety disrupts HPO axis (hypothalamic-pituitary-ovarian). Focus on routine, warmth, nourishment.',
    },
    Pitta: {
      name: 'Pitta (Fire + Water)',
      element: 'Transformation, metabolism, intellect',
      qualities: 'Hot, sharp, oily, liquid, spreading',
      cyclePattern: 'Regular, predictable cycles (25-28 days), medium-heavy flow, bright red, may feel warm. Prone to PMS irritability, headaches, acne.',
      fertilityConcern: 'Excess heat can reduce egg quality. Inflammation may affect implantation. Focus on cooling, reducing intensity.',
    },
    Kapha: {
      name: 'Kapha (Earth + Water)',
      element: 'Structure, stability, nurturing',
      qualities: 'Heavy, slow, cool, oily, smooth, dense',
      cyclePattern: 'Longer cycles (28-35 days), heavy flow, more clots/mucus. Prone to water retention, lethargy, emotional eating during PMS.',
      fertilityConcern: 'PCOS tendency (insulin resistance). Anovulation risk with higher BMI. Focus on stimulation, weight management, Agni.',
    },
  };
  return descs[dosha] || descs.Vata;
}

// ─── Dynamic daily tip generator ─────────────────────────────────
function generateDailyTip(
  dosha: string, phase: string, cycleDay: number,
  ovulationDay: number, cycleLength: number, goal: string,
): { title: string; body: string; emoji: string; category: string } {
  const daysToOvulation = ovulationDay - cycleDay;
  const daysToPeriod = cycleLength - cycleDay;

  // Pre-ovulation countdown tips
  if (daysToOvulation >= 1 && daysToOvulation <= 3 && (goal === 'fertility' || goal === 'ttc')) {
    return {
      title: 'Fertile Window Alert',
      body: dosha === 'Vata'
        ? `${daysToOvulation} days to estimated ovulation. Warm, nourishing foods today. Shatavari + Ashwagandha. Create calm, loving environment — Vata fertility needs stability.`
        : dosha === 'Pitta'
        ? `${daysToOvulation} days to estimated ovulation. Cool, sweet foods. Shatavari peak dose. Avoid arguments — Pitta fire needs channeling into love, not anger.`
        : `${daysToOvulation} days to estimated ovulation. Light, stimulating diet. Stay active. Shatavari + exercise — Kapha needs energy for optimal ovulation.`,
      emoji: '🌸',
      category: 'fertility',
    };
  }

  // Period approaching tips
  if (daysToPeriod >= 1 && daysToPeriod <= 3) {
    return {
      title: 'Period Approaching',
      body: dosha === 'Vata'
        ? 'Stock up on warm foods, sesame oil, and herbal teas. Plan a lighter schedule. Your Vata body needs extra grounding as Apana Vata prepares for downward flow.'
        : dosha === 'Pitta'
        ? 'Pre-cool your system: increase Gulkand, coconut water, and cooling foods. Pitta menstruation benefits from advance cooling to prevent heavy flow and headaches.'
        : 'Increase ginger tea and light meals. Don\'t give in to comfort food cravings — Kapha PMS is a trap. Stay active to prevent the heavy, stagnant feeling.',
      emoji: '🌙',
      category: 'preparation',
    };
  }

  // Phase-specific tips
  const phaseTips: Record<string, Record<string, { title: string; body: string; emoji: string; category: string }>> = {
    Vata: {
      menstrual: { title: 'Vata Menstrual Care', body: 'Warm sesame oil abhyanga on lower abdomen. Dashmool tea for cramps. Rest is Rajahsvala Paricharya — honor your body\'s need for stillness.', emoji: '🫖', category: 'self-care' },
      follicular: { title: 'Building Energy', body: 'Estrogen is rising — your creativity peaks. Ashwagandha + warm milk at bedtime. Start new projects. Eat protein-rich, warm meals to rebuild after menstruation.', emoji: '🌅', category: 'energy' },
      ovulation: { title: 'Peak Radiance', body: 'Cooling foods today — Pitta peaks universally at ovulation. Rose water, coconut, and fennel. Your charm is at maximum — enjoy social connections.', emoji: '✨', category: 'vitality' },
      luteal: { title: 'Grounding Phase', body: 'Vata rises in luteal phase. Complex carbs, warm spiced milk, journaling. Reduce stimulation. Brahmi + Shankhpushpi for anxiety prevention.', emoji: '🍂', category: 'balance' },
    },
    Pitta: {
      menstrual: { title: 'Pitta Menstrual Care', body: 'Cool compress on abdomen. Ashoka bark tea for heavy flow. Avoid spicy food and sun exposure. This is your cooling reset — embrace the pause.', emoji: '❄️', category: 'self-care' },
      follicular: { title: 'Power Phase', body: 'Channel your Pitta ambition — this is your most productive phase. Moderate exercise, bitter greens for liver support. Amalaki for vitamin C.', emoji: '⚡', category: 'energy' },
      ovulation: { title: 'Peak Fire', body: 'Maximum cooling needed. Rose sherbet, sandalwood, moonlight walks. Your confidence is magnetic but watch for sharp words — Pitta tongue is sharpest at ovulation.', emoji: '🌕', category: 'vitality' },
      luteal: { title: 'Controlled Burn', body: 'Pitta PMS = irritability + migraines. Early dinner, Brahmi tea, cooling pranayama. Channel intensity into creative expression, not confrontation.', emoji: '🎨', category: 'balance' },
    },
    Kapha: {
      menstrual: { title: 'Kapha Menstrual Care', body: 'Light, warm, stimulating foods. Ginger tea, not comfort food. Gentle movement even during period — Kapha stagnates without it. Lodhra for heavy flow.', emoji: '🌿', category: 'self-care' },
      follicular: { title: 'Activation Phase', body: 'This is your transformation window. Vigorous exercise, light diet, wake before 6 AM. Guggulu for metabolism. Don\'t waste this estrogen-fueled energy!', emoji: '🏃‍♀️', category: 'energy' },
      ovulation: { title: 'Social Peak', body: 'Your warmth and nurturing nature is magnetic now. Stay active, eat light. Moderate Kapha urge to overeat. Your fertility cues may differ — track YOUR CM baseline.', emoji: '💫', category: 'vitality' },
      luteal: { title: 'Anti-Stagnation', body: 'Kapha PMS = water retention + comfort eating + isolation. Combat ALL THREE: exercise daily, eat spiced light foods, schedule social plans.', emoji: '🌊', category: 'balance' },
    },
  };

  return phaseTips[dosha]?.[phase] || phaseTips.Vata.follicular;
}

// ─── Dosha balance score ─────────────────────────────────────────
function computeDoshaBalance(dosha: string, symptoms: string[], phase: string): {
  score: number;
  status: string;
  dominantImbalance: string;
  tip: string;
} {
  // Higher score = more balanced
  let score = 80; // Start with "mostly balanced"
  const imbalances: string[] = [];

  for (const sym of symptoms) {
    const s = sym.toLowerCase();
    // Vata imbalance signs
    if (s.includes('anxiety') || s.includes('insomnia') || s.includes('constipat') || s.includes('dry')) {
      score -= 8; imbalances.push('Vata');
    }
    // Pitta imbalance signs
    if (s.includes('acne') || s.includes('anger') || s.includes('heartburn') || s.includes('hot flash') || s.includes('headache')) {
      score -= 8; imbalances.push('Pitta');
    }
    // Kapha imbalance signs
    if (s.includes('bloat') || s.includes('lethargy') || s.includes('weight') || s.includes('congest') || s.includes('depression')) {
      score -= 8; imbalances.push('Kapha');
    }
    // General
    if (s.includes('cramp') || s.includes('pain') || s.includes('fatigue') || s.includes('nausea')) {
      score -= 5;
    }
  }

  score = Math.max(20, Math.min(100, score));

  // Count dominant imbalance
  const counts: Record<string, number> = { Vata: 0, Pitta: 0, Kapha: 0 };
  imbalances.forEach(d => counts[d]++);
  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const dominantImbalance = dominant[1] > 0 ? dominant[0] : 'None';

  const status = score >= 75 ? 'Well Balanced' : score >= 50 ? 'Mild Imbalance' : score >= 30 ? 'Moderate Imbalance' : 'Significant Imbalance';

  const tips: Record<string, string> = {
    Vata: 'Ground your Vata with warm, oily foods, regular routine, and abhyanga (oil massage). Avoid cold, dry, irregular patterns.',
    Pitta: 'Cool your Pitta with sweet, bitter foods, moonlight, and surrender practices. Avoid heat, competition, and spicy foods.',
    Kapha: 'Stimulate your Kapha with vigorous exercise, light/spiced foods, and early rising. Avoid heaviness, oversleeping, and dairy.',
    None: `Your ${dosha} dosha is well-balanced this cycle. Continue your current practices.`,
  };

  return { score, status, dominantImbalance, tip: tips[dominantImbalance] };
}

// ─── Seasonal (Ritu) adjustment ──────────────────────────────────
// Ayurveda recognizes 6 seasons that affect dosha balance
function getSeasonalAdjustment(dosha: string): {
  currentRitu: string;
  dominantDosha: string;
  adjustment: string[];
} {
  const month = new Date().getMonth(); // 0-11
  // Indian Ritu Chakra (approximate Gregorian mapping):
  // Shishira (Jan-Feb): Kapha accumulates
  // Vasanta (Mar-Apr): Kapha aggravates
  // Grishma (May-Jun): Vata accumulates, Pitta rises
  // Varsha (Jul-Aug): Vata aggravates
  // Sharad (Sep-Oct): Pitta aggravates
  // Hemanta (Nov-Dec): Vata calms, Kapha builds

  let ritu: string, seasonDosha: string, adjustments: string[];

  if (month <= 1) { // Jan-Feb
    ritu = 'Shishira (Late Winter)'; seasonDosha = 'Kapha';
    adjustments = dosha === 'Kapha'
      ? ['Extra vigilance — Kapha season + Kapha constitution = maximum imbalance risk', 'Dry garshana massage daily', 'Wake before sunrise, exercise vigorously', 'Reduce dairy and sweets completely']
      : dosha === 'Vata'
      ? ['Winter cold aggravates Vata — extra warm foods and oil massage', 'Sesame oil abhyanga before morning bath', 'Heavy, nourishing soups and stews']
      : ['Winter cools Pitta naturally — enjoy this balanced season', 'Moderate exercise, warm spices are okay now', 'Good season for Pitta to build strength'];
  } else if (month <= 3) { // Mar-Apr
    ritu = 'Vasanta (Spring)'; seasonDosha = 'Kapha';
    adjustments = dosha === 'Kapha'
      ? ['Spring detox essential — accumulated winter Kapha must be cleared', 'Consider gentle Panchakarma or home detox', 'Honey + warm water every morning', 'Trikatu daily to kindle Agni']
      : dosha === 'Pitta'
      ? ['Spring is mild for Pitta — good time for moderate intensity', 'Light, seasonal foods — sprouts, greens, berries', 'Outdoor exercise as weather warms']
      : ['Spring eases Vata coldness — enjoy the warming trend', 'Gradually lighten diet from winter heaviness', 'Outdoor walks for grounding + vitamin D'];
  } else if (month <= 5) { // May-Jun
    ritu = 'Grishma (Summer)'; seasonDosha = 'Pitta';
    adjustments = dosha === 'Pitta'
      ? ['Maximum Pitta danger — summer heat + Pitta constitution', 'Cooling everything: food, drinks, environment', 'Moonlight walks, avoid midday sun', 'Gulkand, coconut water, khus sherbet daily']
      : dosha === 'Vata'
      ? ['Summer dryness can aggravate Vata — stay hydrated and oiled', 'Avoid air conditioning extremes — Vata hates sudden temp changes', 'Coconut oil instead of sesame for summer massage']
      : ['Summer lightens Kapha naturally — excellent season for you', 'Take advantage to increase exercise and lighten diet', 'Swimming is ideal — cooling + exercise'];
  } else if (month <= 7) { // Jul-Aug
    ritu = 'Varsha (Monsoon)'; seasonDosha = 'Vata';
    adjustments = dosha === 'Vata'
      ? ['Monsoon = peak Vata aggravation — wind, dampness, irregularity', 'Extra warm, cooked, well-spiced foods', 'Avoid raw foods — digestive fire weakest now', 'Basti (enema) therapy traditionally recommended for Vata in Varsha']
      : dosha === 'Pitta'
      ? ['Monsoon cools Pitta — relatively comfortable season', 'Watch for digestive issues from humidity', 'Light, warm foods — avoid raw and fermented']
      : ['Monsoon dampness + Kapha = congestion risk', 'Keep warm, dry, and active', 'Ginger + tulsi tea for respiratory health'];
  } else if (month <= 9) { // Sep-Oct
    ritu = 'Sharad (Autumn)'; seasonDosha = 'Pitta';
    adjustments = dosha === 'Pitta'
      ? ['Accumulated summer Pitta releases in autumn — skin issues, acidity', 'Virechana (purgation) therapy traditionally done in Sharad', 'Bitter foods: neem juice, bitter gourd, methi', 'Moonlight meditation — Sharad Purnima (full moon) is healing for Pitta']
      : dosha === 'Vata'
      ? ['Autumn dryness begins to aggravate Vata', 'Increase oil massage frequency', 'Warm, moist foods — soups, kitchari, ghee']
      : ['Autumn is transitional for Kapha — maintain summer exercise habits', 'Don\'t retreat indoors too early', 'Light, spiced foods continue to serve you'];
  } else { // Nov-Dec
    ritu = 'Hemanta (Early Winter)'; seasonDosha = 'Vata';
    adjustments = dosha === 'Vata'
      ? ['Early winter: Agni (digestive fire) is strongest — eat well!', 'Warming, heavy, nourishing foods — this is Vata\'s building season', 'Abhyanga with warm sesame oil is essential', 'Sleep early, rise early — honor Vata routine']
      : dosha === 'Pitta'
      ? ['Winter naturally cools Pitta — enjoy heavier, warming foods', 'Spices are well-tolerated now — use freely', 'Good season to build strength and immunity']
      : ['Winter Kapha buildup begins — don\'t oversleep or overeat', 'Maintain exercise routine despite cold weather', 'Warm spices: ginger, cinnamon, black pepper daily'];
  }

  return { currentRitu: ritu, dominantDosha: seasonDosha, adjustment: adjustments };
}
