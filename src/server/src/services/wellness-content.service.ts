import prisma from '../config/database';
import { cacheGet, cacheSet, cacheDelPattern } from '../config/redis';

const CACHE_TTL = 3600; // 1 hour
const CACHE_EMPTY_TTL = 300; // 5 min for empty results (prevents cache stampede)
const CACHE_PREFIX = 'wc:';

const VALID_TYPES = new Set([
  'phase_tip', 'wellness_tip', 'phase_routine', 'phase_yoga', 'phase_tip_wisdom',
  'challenge', 'affirmation', 'self_care_breath', 'journal_prompt', 'self_care',
  'dosha_remedy', 'pregnancy_week',
]);

const MAX_BULK_TYPES = 20;

function safeInt(val: any, fallback?: number): number | undefined {
  if (val === undefined || val === null || val === '') return fallback;
  const n = parseInt(String(val), 10);
  return Number.isNaN(n) ? fallback : n;
}

function cacheKey(type: string, filters: Record<string, string | number | undefined>): string {
  const parts = [CACHE_PREFIX, type];
  if (filters.phase) parts.push(String(filters.phase));
  if (filters.goal) parts.push(String(filters.goal));
  if (filters.dosha) parts.push(String(filters.dosha));
  if (filters.week !== undefined) parts.push(String(filters.week));
  if (filters.category) parts.push(String(filters.category));
  return parts.join(':');
}

class WellnessContentService {
  // ─── Public: fetch content by type + filters ─────────────
  async getByType(type: string, filters: {
    phase?: string;
    goal?: string;
    dosha?: string;
    week?: number;
    category?: string;
  } = {}): Promise<any[]> {
    const key = cacheKey(type, filters);

    try {
      // Layer 1: Redis cache (including cached empty results)
      const cached = await cacheGet<any[]>(key);
      if (cached !== null && cached !== undefined) return cached;

      // Layer 2: Database
      const where: any = { type, isActive: true };
      if (filters.phase) where.phase = filters.phase;
      if (filters.goal) where.goal = filters.goal;
      if (filters.dosha) where.dosha = filters.dosha;
      if (filters.week !== undefined) where.week = filters.week;
      if (filters.category) where.category = filters.category;

      const rows = await prisma.wellnessContent.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true, type: true, key: true, phase: true, goal: true, dosha: true,
          week: true, category: true, emoji: true, title: true, body: true,
          metadata: true, sortOrder: true, sourceReference: true,
        },
      });

      // Cache both non-empty and empty results (empty with shorter TTL)
      await cacheSet(key, rows, rows.length > 0 ? CACHE_TTL : CACHE_EMPTY_TTL);
      return rows;
    } catch (e) {
      console.warn('[WellnessContent] DB/cache failed, frontend will use hardcoded fallback:', (e as any)?.message);
    }

    // Layer 3: Return empty — frontend has hardcoded fallback
    return [];
  }

  // ─── Public: fetch all content for a page in one call ─────
  async getBulk(types: string[], filters: {
    phase?: string;
    goal?: string;
    dosha?: string;
    week?: number;
  } = {}): Promise<Record<string, any[]>> {
    // Limit types to prevent DoS
    const safeTypes = types.slice(0, MAX_BULK_TYPES);
    const result: Record<string, any[]> = {};
    await Promise.all(safeTypes.map(async (type) => {
      result[type] = await this.getByType(type, filters);
    }));
    return result;
  }

  // ─── Admin: list all (paginated, filterable) ──────────────
  async adminList(params: {
    type?: string;
    phase?: string;
    goal?: string;
    dosha?: string;
    week?: number;
    isActive?: boolean;
    page?: number;
    limit?: number;
  } = {}): Promise<{ items: any[]; total: number }> {
    const where: any = {};
    if (params.type) where.type = params.type;
    if (params.phase) where.phase = params.phase;
    if (params.goal) where.goal = params.goal;
    if (params.dosha) where.dosha = params.dosha;
    if (params.week !== undefined) where.week = params.week;
    if (params.isActive !== undefined) where.isActive = params.isActive;

    const page = Math.max(params.page || 1, 1);
    const limit = Math.min(Math.max(params.limit || 50, 1), 200);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.wellnessContent.findMany({
        where,
        orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.wellnessContent.count({ where }),
    ]);

    return { items, total };
  }

  // ─── Admin: create ────────────────────────────────────────
  async create(data: any): Promise<any> {
    const row = await prisma.wellnessContent.create({
      data: {
        type: data.type,
        key: data.key,
        phase: data.phase || null,
        goal: data.goal || null,
        dosha: data.dosha || null,
        week: safeInt(data.week, undefined) ?? null,
        category: data.category || null,
        emoji: data.emoji || null,
        title: data.title || null,
        body: data.body,
        metadata: data.metadata || null,
        sortOrder: safeInt(data.sortOrder, 0) ?? 0,
        isActive: data.isActive === true || data.isActive === 'true',
        sourceReference: data.sourceReference || 'Admin-created',
      },
    });
    await this.invalidateCache(data.type);
    return row;
  }

  // ─── Admin: update ────────────────────────────────────────
  async update(id: string, data: any): Promise<any> {
    const existing = await prisma.wellnessContent.findUnique({ where: { id } });
    if (!existing) throw new Error('Not found');

    const update: any = {};
    if (data.type !== undefined) update.type = data.type;
    if (data.key !== undefined) update.key = data.key;
    if (data.phase !== undefined) update.phase = data.phase || null;
    if (data.goal !== undefined) update.goal = data.goal || null;
    if (data.dosha !== undefined) update.dosha = data.dosha || null;
    if (data.week !== undefined) update.week = data.week !== null ? (safeInt(data.week, undefined) ?? null) : null;
    if (data.category !== undefined) update.category = data.category || null;
    if (data.emoji !== undefined) update.emoji = data.emoji || null;
    if (data.title !== undefined) update.title = data.title || null;
    if (data.body !== undefined) update.body = data.body;
    if (data.metadata !== undefined) update.metadata = data.metadata;
    if (data.sortOrder !== undefined) update.sortOrder = safeInt(data.sortOrder, 0) ?? 0;
    if (data.isActive !== undefined) update.isActive = data.isActive === true || data.isActive === 'true';

    const row = await prisma.wellnessContent.update({ where: { id }, data: update });
    await this.invalidateCache(existing.type);
    if (data.type && data.type !== existing.type) await this.invalidateCache(data.type);
    return row;
  }

  // ─── Admin: delete ────────────────────────────────────────
  async delete(id: string): Promise<void> {
    const existing = await prisma.wellnessContent.findUnique({ where: { id } });
    if (!existing) throw new Error('Not found');
    await prisma.wellnessContent.delete({ where: { id } });
    await this.invalidateCache(existing.type);
  }

  // ─── Admin: toggle active ─────────────────────────────────
  async toggle(id: string): Promise<any> {
    const existing = await prisma.wellnessContent.findUnique({ where: { id } });
    if (!existing) throw new Error('Not found');
    const row = await prisma.wellnessContent.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });
    await this.invalidateCache(existing.type);
    return row;
  }

  // ─── Cache invalidation ───────────────────────────────────
  private async invalidateCache(type: string): Promise<void> {
    try {
      await cacheDelPattern(`${CACHE_PREFIX}${type}*`);
    } catch {
      // Redis unavailable — cache will expire naturally
    }
  }

  // ─── Validate type (used by routes) ─────────────────────
  isValidType(type: string): boolean {
    return VALID_TYPES.has(type);
  }

  // ─── Seed all wellness content into DB ─────────────────
  async seedAll(): Promise<{ inserted: number; skipped: boolean }> {
    const existing = await prisma.wellnessContent.count();
    if (existing > 0) return { inserted: 0, skipped: true };

    const wcData: Array<{
      type: string; key: string; phase?: string; goal?: string; dosha?: string;
      week?: number; category?: string; emoji?: string; title?: string;
      body: string; metadata?: any; sortOrder?: number; sourceReference?: string;
    }> = [];

    // 1. PHASE TIPS — Fertility (16)
    const fertilityPhaseTips: Record<string, string[]> = {
      menstrual: ['\u{1F321}\uFE0F Warm compress relieves cramps', '\u{1F96C} Eat iron-rich foods (spinach, dates)', '\u{1F634} Extra rest is completely valid', '\u{1FAD6} Ginger tea helps inflammation'],
      follicular: ['\u26A1 Great phase to build up workout intensity', '\u{1F680} Start new projects now', '\u{1F951} Load up on healthy fats', '\u{1F483} Your social energy is high'],
      ovulation: ['\u{1F49C} Peak fertility window \u2014 highest chance 1-2 days before ovulation', '\u{1F4A7} Check egg-white cervical mucus', '\u{1F338} Libido naturally peaks', '\u{1F525} Peak energy \u2014 try your most challenging workout'],
      luteal: ['\u{1F330} Magnesium reduces PMS (almonds)', '\u{1F360} Complex carbs stabilize mood', '\u{1F634} Body needs extra sleep now', '\u{1F6AB} Reduce caffeine and salt'],
    };
    for (const [phase, tips] of Object.entries(fertilityPhaseTips)) {
      tips.forEach((tip, i) => {
        const emoji = tip.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u)?.[0] || '';
        wcData.push({ type: 'phase_tip', key: `fertility_${phase}_${i}`, phase, goal: 'fertility', emoji, body: tip, sortOrder: i, sourceReference: `DashboardPage.tsx:phaseTips.${phase}[${i}]` });
      });
    }

    // 2. PHASE TIPS — Periods (16)
    const periodPhaseTips: Record<string, string[]> = {
      menstrual: ['\u{1F321}\uFE0F Warm compress relieves cramps', '\u{1F96C} Eat iron-rich foods (spinach, dates)', '\u{1F634} Extra rest is completely valid', '\u{1FAD6} Ginger tea helps inflammation'],
      follicular: ['\u26A1 Great phase to build up workout intensity', '\u{1F680} Start new projects now', '\u{1F951} Load up on healthy fats', '\u{1F483} Your social energy is high'],
      ovulation: ['\u{1F338} You may feel more confident today', '\u{1F525} Peak energy \u2014 try intense workouts', '\u{1F4A7} Stay extra hydrated', '\u{1F9D8} Great time for challenging goals'],
      luteal: ['\u{1F330} Magnesium reduces PMS (almonds)', '\u{1F360} Complex carbs stabilize mood', '\u{1F634} Body needs extra sleep now', '\u{1F6AB} Reduce caffeine and salt'],
    };
    for (const [phase, tips] of Object.entries(periodPhaseTips)) {
      tips.forEach((tip, i) => {
        const emoji = tip.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u)?.[0] || '';
        wcData.push({ type: 'phase_tip', key: `periods_${phase}_${i}`, phase, goal: 'periods', emoji, body: tip, sortOrder: i, sourceReference: `DashboardPage.tsx:periodTips.${phase}[${i}]` });
      });
    }

    // 3. WELLNESS TIPS (8)
    const wellnessTipsList = [
      '\u{1F4A7} Stay well hydrated throughout the day \u2014 your skin and energy will thank you',
      '\u{1F9D8} Even 5 minutes of deep breathing can measurably reduce stress hormones',
      '\u{1F634} Blue light before bed delays melatonin \u2014 try reading instead',
      '\u{1F3C3} A 20-minute walk can boost mood for several hours',
      '\u{1F957} Nutrient-rich lunches with greens may help sustain afternoon energy',
      '\u{1F305} Morning sunlight for 10 min resets your circadian rhythm',
      '\u{1F4F5} Screen breaks every 45 min reduce eye strain and stress',
      '\u{1FAD6} Chamomile or lavender tea before bed may help improve sleep quality',
    ];
    wellnessTipsList.forEach((tip, i) => {
      const emoji = tip.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u)?.[0] || '';
      wcData.push({ type: 'wellness_tip', key: `wellness_${i}`, goal: 'wellness', emoji, body: tip, sortOrder: i, sourceReference: `DashboardPage.tsx:wellnessTips[${i}]` });
    });

    // 4. PHASE ROUTINES (49)
    const phaseRoutines: Record<string, { morning: string[]; afternoon: string[]; evening: string[] }> = {
      menstrual: {
        morning: ['\u{1F305} Gentle stretch (5 min)', '\u{1FAD6} Warm ginger tea', '\u{1F9D8} Child\'s Pose yoga', '\u{1F48A} Iron supplement (if doctor-recommended)', '\u{1F96C} Iron-rich breakfast (spinach, dates)'],
        afternoon: ['\u{1F321}\uFE0F Warm compress for cramps', '\u{1F634} 10-min rest if needed', '\u{1F963} Light, warm meal', '\u{1F4A7} Extra hydration (2.5L)'],
        evening: ['\u{1F6C1} Warm bath with Epsom salt', '\u{1F4D6} Light journaling', '\u{1FAD6} Chamomile tea', '\u{1F319} Early bedtime \u2014 rest is healing'],
      },
      follicular: {
        morning: ['\u2600\uFE0F Sun salutations (10 min)', '\u{1F951} Nutrient-dense breakfast', '\u{1F9E0} Set weekly intentions', '\u{1F4AA} Start a new healthy habit', '\u{1F680} Best time for bold decisions'],
        afternoon: ['\u{1F3C3} Ideal for intense workout', '\u{1F957} Antioxidant-rich lunch', '\u{1F4DA} Learn something new', '\u{1F91D} Connect with people'],
        evening: ['\u{1F9D8} Energizing vinyasa flow', '\u{1F4D3} Journal progress', '\u{1F634} 8h sleep for optimal recovery'],
      },
      ovulation: {
        morning: ['\u{1F49C} High-intensity workout', '\u{1F95C} Protein-rich breakfast', '\u{1F938} Challenge your body', '\u{1F4A7} Stay well hydrated today', '\u{1F31F} You\'re at peak confidence'],
        afternoon: ['\u{1F957} Zinc & fiber-rich lunch', '\u{1F465} Social energy is high', '\u{1F3AF} Tackle hardest tasks now', '\u{1F4BC} Best day for negotiations'],
        evening: ['\u{1F9D8} Hip-opening yoga flow', '\u{1F6C0} Luxurious self-care', '\u{1F49C} Connect deeply with loved ones'],
      },
      luteal: {
        morning: ['\u{1F305} Gentle yoga (15 min)', '\u{1F330} Magnesium-rich breakfast', '\u{1F62E}\u200D\u{1F4A8} Box breathing (5 min)', '\u{1F4D3} Journal feelings \u2014 don\'t suppress'],
        afternoon: ['\u{1F957} Complex carbs (sweet potato, oats)', '\u{1F634} Power nap if needed', '\u{1F6B6} Slow walk in nature', '\u{1F6AB} Limit caffeine'],
        evening: ['\u{1F6C1} Calming lavender bath', '\u{1FAD6} Ashwagandha or chamomile tea', '\u{1F4F5} No screens after 9pm', '\u{1F319} Sleep by 10pm'],
      },
    };
    for (const [phase, times] of Object.entries(phaseRoutines)) {
      for (const [timeOfDay, items] of Object.entries(times)) {
        items.forEach((item, i) => {
          const emoji = item.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u)?.[0] || '';
          wcData.push({ type: 'phase_routine', key: `${phase}_${timeOfDay}_${i}`, phase, category: timeOfDay, emoji, body: item, sortOrder: i, sourceReference: `WellnessPage.tsx:PHASE_DATA.${phase}.routine.${timeOfDay}[${i}]` });
        });
      }
    }

    // 5. PHASE YOGA (16)
    const phaseYoga: Record<string, { name: string; emoji: string; dur: string; benefit: string }[]> = {
      menstrual: [
        { name: "Child's Pose", emoji: '\u{1F9CE}', dur: '3 min', benefit: 'Relieves cramps' },
        { name: 'Supine Twist', emoji: '\u{1F504}', dur: '2 min', benefit: 'Relaxes lower back' },
        { name: 'Butterfly Pose', emoji: '\u{1F98B}', dur: '3 min', benefit: 'Opens hips' },
        { name: 'Legs Up Wall', emoji: '\u{1F9B5}', dur: '5 min', benefit: 'Reduces fatigue' },
      ],
      follicular: [
        { name: 'Sun Salutation', emoji: '\u2600\uFE0F', dur: '10 min', benefit: 'Energizes body' },
        { name: 'Warrior I & II', emoji: '\u{1F4AA}', dur: '5 min', benefit: 'Builds strength' },
        { name: 'Dancer Pose', emoji: '\u{1F483}', dur: '3 min', benefit: 'Balance & focus' },
        { name: 'Vinyasa Flow', emoji: '\u{1F30A}', dur: '20 min', benefit: 'Full body energy' },
      ],
      ovulation: [
        { name: 'Camel Pose', emoji: '\u{1F42A}', dur: '3 min', benefit: 'Opens heart' },
        { name: 'Bridge Pose', emoji: '\u{1F309}', dur: '3 min', benefit: 'Hip flexors' },
        { name: 'Pigeon Pose', emoji: '\u{1F54A}\uFE0F', dur: '5 min', benefit: 'Hip release' },
        { name: 'Wheel Pose', emoji: '\u2B55', dur: '2 min', benefit: 'Peak energy' },
      ],
      luteal: [
        { name: 'Yin Yoga', emoji: '\u{1F319}', dur: '20 min', benefit: 'Deep tissue release' },
        { name: 'Forward Fold', emoji: '\u{1F647}', dur: '5 min', benefit: 'Calms nervous system' },
        { name: 'Spinal Twist', emoji: '\u{1F300}', dur: '3 min', benefit: 'Aids digestion & spinal mobility' },
        { name: 'Corpse Pose', emoji: '\u{1F634}', dur: '10 min', benefit: 'Deep restoration' },
      ],
    };
    for (const [phase, poses] of Object.entries(phaseYoga)) {
      poses.forEach((pose, i) => {
        wcData.push({ type: 'phase_yoga', key: `${phase}_yoga_${i}`, phase, emoji: pose.emoji, title: pose.name, body: pose.benefit, metadata: { duration: pose.dur }, sortOrder: i, sourceReference: `WellnessPage.tsx:PHASE_DATA.${phase}.yoga[${i}]` });
      });
    }

    // 6. PHASE TIP WISDOM (4)
    const phaseWisdom: Record<string, string> = {
      menstrual: 'Rest is your superpower right now. Your body is doing extraordinary work.',
      follicular: 'Your energy is rising! This is the best time to start new goals and challenges.',
      ovulation: 'Peak fertility and confidence. You\'re literally glowing \u2014 use this energy wisely!',
      luteal: 'Progesterone peaks then drops \u2014 mood changes are real. Practice radical self-compassion.',
    };
    for (const [phase, tip] of Object.entries(phaseWisdom)) {
      wcData.push({ type: 'phase_tip_wisdom', key: `wisdom_${phase}`, phase, body: tip, sortOrder: 0, sourceReference: `WellnessPage.tsx:PHASE_DATA.${phase}.tip` });
    }

    // 7. CHALLENGES (4)
    const challenges = [
      { id: 'iron', title: '7-Day Iron Boost', emoji: '\u{1F33F}', days: 7, desc: 'Eat iron-rich foods daily', color: '#E11D48', bg: '#FFF1F2', badge: '\u{1F396}' },
      { id: 'stress', title: '14-Day Stress-Free', emoji: '\u{1F9D8}', days: 14, desc: 'Meditate 5 minutes daily', color: '#7C3AED', bg: '#F5F3FF', badge: '\u{1F947}' },
      { id: 'sync', title: '21-Day Cycle Sync', emoji: '\u{1F338}', days: 21, desc: 'Phase-aligned living', color: '#EC4899', bg: '#FDF2F8', badge: '\u{1F3C6}' },
      { id: 'water', title: '8-Glass Water', emoji: '\u{1F4A7}', days: 7, desc: '8 glasses every day', color: '#3B82F6', bg: '#EFF6FF', badge: '\u{1F48E}' },
    ];
    challenges.forEach((c, i) => {
      wcData.push({ type: 'challenge', key: `challenge_${c.id}`, emoji: c.emoji, title: c.title, body: c.desc, metadata: { days: c.days, color: c.color, bg: c.bg, badge: c.badge }, sortOrder: i, sourceReference: `WellnessPage.tsx:CHALLENGES[${i}]` });
    });

    // 8. AFFIRMATIONS (4)
    const affirmations: Record<string, { title: string; emoji: string; affirmation: string }> = {
      menstrual: { title: 'Rest & Restore', emoji: '\u{1FA78}', affirmation: 'I honor my body\'s need for rest. I am allowed to slow down.' },
      follicular: { title: 'Create & Explore', emoji: '\u{1F331}', affirmation: 'I am full of creative energy. Today I start something new.' },
      ovulation: { title: 'Shine & Connect', emoji: '\u2728', affirmation: 'I am confident, radiant, and worthy of all good things.' },
      luteal: { title: 'Nurture & Complete', emoji: '\u{1F343}', affirmation: 'I am enough exactly as I am. My feelings are valid.' },
    };
    for (const [phase, a] of Object.entries(affirmations)) {
      wcData.push({ type: 'affirmation', key: `affirmation_${phase}`, phase, emoji: a.emoji, title: a.title, body: a.affirmation, sortOrder: 0, sourceReference: `SelfCarePage.tsx:phaseWellness.${phase}.affirmation` });
    }

    // 9. BREATHING EXERCISES (4)
    const breathExercises: Record<string, string> = {
      menstrual: '4-7-8 Relaxation: Inhale 4s, hold 7s, exhale 8s',
      follicular: 'Energizing Breath (Kapalabhati): Quick inhale-exhale through nose, 30 rounds. Avoid during menstruation or pregnancy.',
      ovulation: 'Box Breathing: Inhale 4s, hold 4s, exhale 4s, hold 4s',
      luteal: 'Nadi Shodhana: Alternate nostril breathing, 10 rounds',
    };
    for (const [phase, desc] of Object.entries(breathExercises)) {
      wcData.push({ type: 'self_care_breath', key: `breath_${phase}`, phase, body: desc, sortOrder: 0, sourceReference: `SelfCarePage.tsx:phaseWellness.${phase}.breath` });
    }

    // 10. JOURNAL PROMPTS (4)
    const journalPrompts: Record<string, string> = {
      menstrual: 'What does my body need most right now? How can I be gentle with myself this week?',
      follicular: 'What new project or goal excites me? What would I do if I couldn\'t fail?',
      ovulation: 'What conversation have I been avoiding? Today I have the courage to speak my truth.',
      luteal: 'What am I grateful for today? What can I let go of that no longer serves me?',
    };
    for (const [phase, prompt] of Object.entries(journalPrompts)) {
      wcData.push({ type: 'journal_prompt', key: `journal_${phase}`, phase, body: prompt, sortOrder: 0, sourceReference: `SelfCarePage.tsx:phaseWellness.${phase}.journalPrompt` });
    }

    // 11. SELF-CARE IDEAS (20)
    const selfCareIdeas: Record<string, string[]> = {
      menstrual: ['Warm bath with essential oils', 'Gentle stretching or yin yoga', 'Hot tea and a good book', 'Say no to one extra commitment', 'Eat your favorite comfort food guilt-free'],
      follicular: ['Try a new workout or class', 'Plan something social', 'Start a creative project', 'Meal prep healthy foods', 'Explore somewhere new'],
      ovulation: ['Have that important conversation', 'Dress up and feel good', 'Connect deeply with someone', 'Dance or move joyfully', 'Express yourself creatively'],
      luteal: ['Dark chocolate (guilt-free magnesium!)', 'Early bedtime with calming music', 'Warm oil self-massage', 'Organize or clean one space', 'Call someone who makes you smile'],
    };
    for (const [phase, ideas] of Object.entries(selfCareIdeas)) {
      ideas.forEach((idea, i) => {
        wcData.push({ type: 'self_care', key: `selfcare_${phase}_${i}`, phase, body: idea, sortOrder: i, sourceReference: `SelfCarePage.tsx:phaseWellness.${phase}.selfCare[${i}]` });
      });
    }

    // 12. DOSHA REMEDIES (36)
    const doshaRemedies: Record<string, Record<string, string[]>> = {
      vata: {
        menstrual: ['Warm sesame oil massage (Abhyanga)', 'Ashwagandha tea for calm', 'Warm, grounding foods (soups, root veggies)'],
        follicular: ['Warming spices (ginger, cinnamon)', 'Routine-based daily schedule', 'Nourishing fats (ghee, avocado)'],
        ovulation: ['Stay warm and grounded', 'Gentle movement, avoid overexertion', 'Warm milk with saffron before bed'],
        luteal: ['Oil self-massage before bed', 'Avoid cold, raw foods', 'Calming herbs (Brahmi, Jatamansi)'],
      },
      pitta: {
        menstrual: ['Coconut oil cooling massage', 'Rose water face mist', 'Cooling foods (cucumber, mint)'],
        follicular: ['Aloe vera juice morning drink', 'Avoid excess spicy/sour foods', 'Moderate exercise in cool environment'],
        ovulation: ['Sandalwood cooling paste', 'Sweet fruits (grapes, pomegranate)', 'Moonlight meditation'],
        luteal: ['Pitta-balancing herbs (Shatavari)', 'Cooling pranayama (Shitali)', 'Avoid competitive activities'],
      },
      kapha: {
        menstrual: ['Dry brushing before bath', 'Warming herbal tea (Trikatu)', 'Light, warm meals \u2014 avoid dairy'],
        follicular: ['Vigorous exercise (best phase!)', 'Honey in warm water morning', 'Pungent spices stimulate metabolism'],
        ovulation: ['Stay active and social', 'Light, dry foods preferred', 'Triphala for digestive balance'],
        luteal: ['Avoid heavy, oily comfort foods', 'Energizing aromatherapy (eucalyptus)', 'Stimulating yoga (Surya Namaskar)'],
      },
    };
    for (const [dosha, phases] of Object.entries(doshaRemedies)) {
      for (const [phase, items] of Object.entries(phases)) {
        items.forEach((item, i) => {
          wcData.push({ type: 'dosha_remedy', key: `dosha_${dosha}_${phase}_${i}`, phase, dosha, body: item, sortOrder: i, sourceReference: `DashboardPage.tsx:doshaRemedies.${dosha}.${phase}[${i}]` });
        });
      }
    }

    // 13. PREGNANCY WEEK DATA (~210)
    const pregWeekData: Record<number, { size: string; emoji: string; len: string; wt: string; tri: number; baby: string[]; mom: string[]; tips: string[]; nutrition: string[]; exercise: string[] }> = {
      4: { size: 'Poppy Seed', emoji: '\u{1F33E}', len: '0.1 cm', wt: '<1g', tri: 1,
        baby: ['Embryo implants in uterus wall', 'Neural tube beginning to form', 'Tiny heart starts to develop', 'Amniotic sac forming around embryo'],
        mom: ['Missed period \u2014 first sign!', 'Fatigue and breast tenderness', 'Possible light spotting (implantation)', 'Heightened sense of smell'],
        tips: ['Start prenatal vitamins with 400\u00B5g folic acid', 'Avoid alcohol, smoking & raw fish', 'Schedule your first prenatal appointment', 'Begin tracking symptoms in a journal'],
        nutrition: ['Folic acid (leafy greens, fortified cereals)', 'Iron (red meat, spinach, lentils)', 'Stay hydrated \u2014 8\u201310 glasses/day', 'Small frequent meals if nauseated'],
        exercise: ['Walking 20\u201330 min daily', 'Gentle yoga & stretching', 'Avoid contact sports', 'Listen to your body \u2014 rest when tired'] },
      8: { size: 'Raspberry', emoji: '\u{1FAD0}', len: '1.6 cm', wt: '1g', tri: 1,
        baby: ['All major organs forming', 'Tiny fingers and toes appear', 'Heart beats at 150\u2013170 BPM', 'Eyelids starting to fuse shut'],
        mom: ['Morning sickness at its peak', 'Frequent urination begins', 'Breast size increasing', 'Extreme fatigue is normal'],
        tips: ['Eat small meals every 2\u20133 hours', 'Ginger tea helps with nausea', 'Get 8\u20139 hours of sleep', 'First ultrasound may happen now'],
        nutrition: ['Vitamin B6 helps nausea (bananas, nuts)', 'Protein at every meal', 'Avoid unpasteurized dairy', 'Calcium-rich foods (yogurt, cheese)'],
        exercise: ['Prenatal swimming', 'Light pilates', 'Kegel exercises \u2014 start now!', 'Rest on your side when possible'] },
      12: { size: 'Lime', emoji: '\u{1F34B}', len: '5.4 cm', wt: '14g', tri: 1,
        baby: ['Reflexes developing \u2014 can kick!', 'Fingernails and toenails growing', 'Vocal cords beginning to form', 'Kidneys start producing urine'],
        mom: ['Nausea often starts improving', 'Energy returning gradually', 'Slight baby bump may show', 'Skin may glow or break out'],
        tips: ['First trimester screening (NT scan)', 'Share news with close family', 'Start moisturizing belly daily', 'Begin researching birthing classes'],
        nutrition: ['Omega-3 fatty acids (salmon, walnuts)', 'Fiber-rich foods prevent constipation', 'Vitamin D (sunlight, fortified milk)', 'Limit caffeine to 200mg/day'],
        exercise: ['Prenatal yoga classes', 'Stationary cycling', 'Arm exercises with light weights', 'Pelvic floor exercises'] },
      16: { size: 'Avocado', emoji: '\u{1F951}', len: '11.6 cm', wt: '100g', tri: 2,
        baby: ['Can make facial expressions!', 'Bones hardening (ossifying)', 'Can hear your heartbeat', 'Eyebrows and eyelashes growing'],
        mom: ['Baby bump clearly visible', 'May feel first flutters ("quickening")', 'Round ligament pain possible', 'Nasal congestion is common'],
        tips: ['Schedule anomaly scan (18\u201320 weeks)', 'Start sleeping on your left side', 'Plan a babymoon trip', 'Begin thinking about baby names'],
        nutrition: ['Increase protein intake to 75g/day', 'Calcium: 1000mg/day (dairy, tofu)', 'Vitamin C (oranges, bell peppers)', 'Iron supplements if prescribed'],
        exercise: ['Swimming is excellent now', 'Prenatal dance classes', 'Walking 30\u201345 min daily', 'Avoid high-altitude exercise'] },
      20: { size: 'Banana', emoji: '\u{1F34C}', len: '16.5 cm', wt: '300g', tri: 2,
        baby: ['Developing sleep/wake cycles', 'Can swallow amniotic fluid', 'Vernix (waxy coating) on skin', 'Gender visible on ultrasound'],
        mom: ['Regular kicks felt daily', 'Skin stretching \u2014 possible itching', 'Linea nigra may appear', 'Hair and nails growing faster'],
        tips: ['HALFWAY THERE! Celebrate!', 'Anatomy scan this week', 'Start a kick count journal', 'Research childbirth education classes'],
        nutrition: ['DHA supplement for brain development', 'Zinc (pumpkin seeds, chickpeas)', 'Magnesium (dark chocolate, avocado)', 'Drink 3 liters of water daily'],
        exercise: ['Aqua aerobics', 'Modified yoga poses', 'Gentle back stretches', 'Avoid exercises lying flat on back'] },
      24: { size: 'Corn Cob', emoji: '\u{1F33D}', len: '30 cm', wt: '600g', tri: 2,
        baby: ['Lungs developing surfactant', 'Face fully formed', 'Responds to your voice', 'Taste buds are functional'],
        mom: ['Braxton Hicks may start', 'Swelling in feet and ankles', 'Glucose screening test due', 'Back pain increasing'],
        tips: ['Take glucose tolerance test', 'Elevate feet when resting', 'Practice relaxation techniques', 'Start planning the nursery'],
        nutrition: ['Monitor sugar intake for GD test', 'Potassium (bananas, sweet potatoes)', 'Fiber to prevent hemorrhoids', 'Small meals to reduce heartburn'],
        exercise: ['Prenatal pilates', 'Side-lying exercises', 'Shoulder and neck stretches', 'Pelvic tilts for back pain'] },
      28: { size: 'Eggplant', emoji: '\u{1F346}', len: '37.5 cm', wt: '1 kg', tri: 3,
        baby: ['Eyes can open and close', 'Brain developing rapidly', 'Can dream (REM sleep!)', 'Responds to light through belly'],
        mom: ['Third trimester begins!', 'Shortness of breath', 'Trouble sleeping at night', 'Frequent Braxton Hicks'],
        tips: ['Start counting kicks daily (10 in 2hrs)', 'Prepare your hospital bag', 'Discuss birth plan with doctor', 'Take a hospital tour'],
        nutrition: ['Increase calorie intake by 450/day', 'Vitamin K (broccoli, kale)', 'Evening primrose oil (after 36w, discuss with doctor)', 'Probiotic foods for gut health'],
        exercise: ['Gentle walking only', 'Birthing ball exercises', 'Deep breathing practice', 'Perineal massage preparation'] },
      32: { size: 'Coconut', emoji: '\u{1F965}', len: '42 cm', wt: '1.7 kg', tri: 3,
        baby: ['Practicing breathing movements', 'Bones hardening (skull stays soft)', 'All five senses are functional', 'Gaining ~250g per week'],
        mom: ['Frequent bathroom trips', 'Heartburn and indigestion', 'Nesting instinct kicks in', 'Difficulty finding comfortable sleep position'],
        tips: ['Finalize birth plan', 'Install car seat', 'Wash baby clothes & bedding', 'Practice labor breathing exercises'],
        nutrition: ['Dates (6/day from 36w helps labor)', 'Red raspberry leaf tea (discuss with doctor first)', 'High-protein snacks', 'Limit salty foods for swelling'],
        exercise: ['Squats for labor preparation', 'Cat-cow stretches', 'Ankle circles for swelling', 'Visualization & meditation'] },
      36: { size: 'Honeydew', emoji: '\u{1F348}', len: '47 cm', wt: '2.6 kg', tri: 3,
        baby: ['Head may engage in pelvis', 'Lungs nearly mature', 'Fat layer developing', 'Gaining 30g every day'],
        mom: ['Increased pelvic pressure', 'Lightning crotch pain', '"Dropping" \u2014 baby moves lower', 'Cervix may start softening'],
        tips: ['Hospital bag should be packed', 'Know the signs of labor', 'Group B strep test this week', 'Rest as much as possible'],
        nutrition: ['Energy-boosting snacks for labor', 'Continue prenatal vitamins', 'Hydration is critical', 'Complex carbs for sustained energy'],
        exercise: ['Walking to encourage engagement', 'Hip circles on birthing ball', 'Relaxation exercises', 'Partner massage techniques'] },
      40: { size: 'Watermelon', emoji: '\u{1F349}', len: '51 cm', wt: '3.4 kg', tri: 3,
        baby: ['Fully developed!', 'Lungs ready for first breath', 'Immune system boosted by antibodies', 'Average 51cm long, 3.4kg'],
        mom: ['Cervix dilating', 'Mucus plug may pass', 'Extreme nesting urge', 'Contractions may begin anytime'],
        tips: ['Baby can arrive any day!', 'Time contractions (5-1-1 rule)', 'Stay calm \u2014 you are ready', 'Call doctor when water breaks'],
        nutrition: ['Light, easily digestible meals', 'Energy bars for early labor', 'Coconut water for electrolytes', 'Honey for quick energy'],
        exercise: ['Walking to stay active and comfortable', 'Nipple stimulation (with doctor OK)', 'Stair climbing', 'Gentle bouncing on birth ball'] },
    };
    for (const [weekNum, data] of Object.entries(pregWeekData)) {
      const w = parseInt(weekNum);
      wcData.push({ type: 'pregnancy_week', key: `preg_week_${w}_meta`, week: w, emoji: data.emoji, title: data.size, body: `Size: ${data.size} | Length: ${data.len} | Weight: ${data.wt}`, metadata: { size: data.size, length: data.len, weight: data.wt, trimester: data.tri }, sortOrder: 0, sourceReference: `PregnancyPage.tsx:weekData[${w}]` });
      for (const cat of ['baby', 'mom', 'tips', 'nutrition', 'exercise'] as const) {
        data[cat].forEach((item, i) => {
          wcData.push({ type: 'pregnancy_week', key: `preg_week_${w}_${cat}_${i}`, week: w, category: cat, body: item, sortOrder: i, sourceReference: `PregnancyPage.tsx:weekData[${w}].${cat}[${i}]` });
        });
      }
    }

    // Batch insert in chunks of 50
    const chunkSize = 50;
    for (let i = 0; i < wcData.length; i += chunkSize) {
      await prisma.wellnessContent.createMany({ data: wcData.slice(i, i + chunkSize) });
    }

    return { inserted: wcData.length, skipped: false };
  }
}

export default new WellnessContentService();
