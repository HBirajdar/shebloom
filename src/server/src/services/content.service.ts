import prisma from '../config/database';
import { cacheGet, cacheSet, cacheDel } from '../config/redis';

// ─── HARDCODED FALLBACKS (used if DB is unavailable) ──────────
// These are exact copies of what was previously hardcoded.
// They serve as safety nets — if DB and cache both fail,
// the app still works with these values.

const FALLBACK_CHAT_RESPONSES = [
  { patternName: 'cramps', regexPattern: 'cramp|pain|period pain|dysmenorrhea', responseText: 'For period cramps, try: 1) Apply heat to your lower abdomen for 20 minutes 2) Ginger tea with honey reduces prostaglandins 3) Gentle child\'s pose yoga 4) Magnesium glycinate supplements (consult your doctor first). If pain is severe, please see a healthcare provider.', category: 'wellness', priority: 10 },
  { patternName: 'pcos', regexPattern: 'pcod|pcos|polycystic', responseText: 'For PCOS management: focus on a low-glycaemic diet (whole grains, legumes, vegetables), regular moderate exercise, stress reduction (yoga works brilliantly), and adequate sleep. Always work with your gynaecologist to tailor a plan for your specific hormone profile.', category: 'medical', priority: 10 },
  { patternName: 'fertility', regexPattern: 'pregnant|pregnancy|conceive|fertility|trying to conceive|ttc', responseText: 'When trying to conceive, track your fertile window (5 days before + day of ovulation). Folic acid (400mcg daily), maintaining a healthy weight, and reducing stress all improve fertility. I recommend consulting a fertility specialist if you\'ve been trying for 12+ months (or 6 months if over 35).', category: 'fertility', priority: 10 },
  { patternName: 'stress', regexPattern: 'stress|anxiety|mood|mental health|depressed|sad', responseText: 'Hormonal fluctuations throughout your cycle directly affect mood. Some strategies: 1) Track your mood daily to spot patterns 2) Try 4-7-8 breathing during anxiety spikes 3) Omega-3s and B vitamins support brain chemistry 4) Adequate sleep (7-9 hours) is crucial. Reach out to a mental health professional if you feel persistently low.', category: 'wellness', priority: 9 },
  { patternName: 'sleep', regexPattern: 'sleep|insomnia|tired|fatigue|exhausted', responseText: 'Hormones affect sleep quality throughout your cycle — progesterone in the luteal phase can cause fatigue while pre-period estrogen drops disturb sleep. Tips: maintain a consistent sleep schedule, avoid screens 1 hour before bed, try magnesium glycinate, and keep your bedroom cool (18-20°C is ideal).', category: 'wellness', priority: 9 },
  { patternName: 'diet', regexPattern: 'diet|food|eat|nutrition|weight', responseText: 'Eating in sync with your cycle is powerful: Menstrual — iron-rich foods; Follicular — fermented foods, sprouts; Ovulation — antioxidant-rich foods (berries, leafy greens); Luteal — complex carbs, magnesium. Avoid ultra-processed foods and excess sugar throughout, as they worsen hormonal imbalance.', category: 'wellness', priority: 8 },
  { patternName: 'exercise', regexPattern: 'exercise|workout|yoga|gym|fitness', responseText: 'Cycle-syncing your workouts: Menstrual — gentle stretching, walking, yin yoga; Follicular — increasing cardio, pilates, dance; Ovulation — HIIT, strength training, running; Luteal — moderate yoga, swimming, light weights. Listen to your body — it knows what it needs!', category: 'wellness', priority: 8 },
  { patternName: 'ayurveda', regexPattern: 'ayurveda|herb|natural|home remedy|dosha', responseText: 'Ayurvedic support for cycles: Shatavari (hormone balance), Ashwagandha (stress adaptogen), Triphala (digestion), and Turmeric (anti-inflammatory). Please consult an Ayurvedic practitioner before starting supplements — dosage and combinations matter for your specific constitution (dosha).', category: 'ayurveda', priority: 8 },
  { patternName: 'late_period', regexPattern: 'late period|missed period|irregular|spotting|delayed period|period delay|period late|not getting period', responseText: 'Late or irregular periods can be caused by stress, sleep disruption, significant weight changes, thyroid issues, PCOS, or early pregnancy. A single late period is often stress-related.\n\n🌿 Ayurvedic remedies: Shatavari (hormone balance), Ashoka bark (uterine health), Ashwagandha (stress relief). Try warm ginger-jaggery water twice daily, sesame seeds with honey, and warm oil self-massage (Abhyanga). Yoga poses like Baddha Konasana and Supta Virasana help stimulate pelvic blood flow.\n\n⚠️ See a doctor if: period is 2+ weeks late, you have severe pain or unusual discharge, there\'s a possibility of pregnancy, or you have a history of PCOS/thyroid issues.\n\nCheck your Dashboard and Tracker for personalized dosha-specific guidance!', category: 'medical', priority: 10 },
];

const FALLBACK_PHASE_ADVICE: Record<string, string[]> = {
  MENSTRUAL: [
    'During your period, focus on rest and gentle movement. Iron-rich foods like spinach and lentils help replenish lost minerals.',
    'Warmth is your best friend right now — a heating pad and ginger tea can ease cramps naturally.',
    'Your energy is naturally lower during menstruation. Honor that by slowing down and prioritising sleep.',
    'Magnesium-rich foods like dark chocolate, nuts, and seeds can reduce period cramps and mood swings.',
  ],
  FOLLICULAR: [
    'Your estrogen is rising — this is your most energetic phase! Great time to start new projects or try a new workout.',
    'Fermented foods like yogurt and kimchi support the gut-hormone axis during your follicular phase.',
    'Channel your mental clarity and creativity now — your brain is primed for learning and problem-solving.',
    'Light cardio and strength training work brilliantly in your follicular phase when energy is building.',
  ],
  OVULATION: [
    'You\'re at peak energy and confidence — this is a great time for important conversations and social connections.',
    'Ovulation boosts libido and body temperature slightly. Stay hydrated and eat antioxidant-rich foods.',
    'Your communication skills are at their sharpest mid-cycle. Schedule presentations or difficult talks now.',
    'High-intensity workouts feel easier now — your body is designed for peak performance around ovulation.',
  ],
  LUTEAL: [
    'Progesterone rises in the luteal phase — cravings for complex carbs are normal. Opt for sweet potato or oats.',
    'Gentle yoga and walking are ideal now. Your body is preparing for the next phase and needs nurturing.',
    'PMS symptoms can be eased with B6-rich foods like bananas, chickpeas, and turkey.',
    'Journaling and creative activities help channel the introspective energy of your luteal phase.',
  ],
};

class ContentService {
  // ─── AI Chat Responses ────────────────────────────────
  async getChatResponses(): Promise<{ patternName: string; regex: RegExp; responseText: string; category: string }[]> {
    const cacheKey = 'content:chat_responses';
    try {
      const cached = await cacheGet(cacheKey);
      if (cached) return (cached as any[]).map(r => ({ ...r, regex: new RegExp(r.regexPattern, 'i') }));

      const dbRows = await prisma.aIChatResponse.findMany({
        where: { isActive: true },
        orderBy: { priority: 'desc' },
      });

      if (dbRows.length > 0) {
        const serialized = dbRows.map(r => ({
          patternName: r.patternName,
          regexPattern: r.regexPattern,
          responseText: r.responseText,
          category: r.category,
        }));
        await cacheSet(cacheKey, serialized, 3600); // 1 hour cache
        return serialized.map(r => ({ ...r, regex: new RegExp(r.regexPattern, 'i') }));
      }
    } catch (e) {
      console.warn('[ContentService] DB/cache failed for chat responses, using fallback:', (e as any)?.message);
    }
    // Fallback to hardcoded
    return FALLBACK_CHAT_RESPONSES.map(r => ({
      patternName: r.patternName,
      regexPattern: r.regexPattern,
      responseText: r.responseText,
      category: r.category,
      regex: new RegExp(r.regexPattern, 'i'),
    }));
  }

  // ─── Phase Advice (for AI chat) ───────────────────────
  async getPhaseAdvice(): Promise<Record<string, string[]>> {
    // Phase advice is simple enough to keep as fallback only for now
    // Can be extended to DB if needed
    return FALLBACK_PHASE_ADVICE;
  }

  // ─── Dosha Phase Guidance ─────────────────────────────
  async getDoshaPhaseGuidance(dosha: string, phase: string): Promise<{
    dominantDosha: string; imbalanceRisk: string;
    diet: string[]; herbs: string[]; yoga: string[]; lifestyle: string[]; avoid: string[];
    modernCorrelation: string;
  } | null> {
    const cacheKey = `content:phase_guidance:${dosha}:${phase}`;
    try {
      const cached = await cacheGet(cacheKey);
      if (cached) return cached as any;

      const row = await prisma.doshaPhaseGuidance.findUnique({
        where: { dosha_phase: { dosha, phase } },
      });

      if (row && row.isActive) {
        const result = {
          dominantDosha: row.dominantDosha || '',
          imbalanceRisk: row.imbalanceRisk || '',
          diet: row.dietTips as string[],
          herbs: row.herbTips as string[],
          yoga: row.yogaTips as string[],
          lifestyle: row.lifestyleTips as string[],
          avoid: row.avoidList as string[],
          modernCorrelation: row.modernCorrelation || '',
        };
        await cacheSet(cacheKey, result, 3600);
        return result;
      }
    } catch (e) {
      console.warn(`[ContentService] DB/cache failed for guidance ${dosha}/${phase}, using fallback:`, (e as any)?.message);
    }
    return null; // Caller will use hardcoded DOSHA_PHASE_GUIDANCE as fallback
  }

  // ─── Ayurvedic Remedies ───────────────────────────────
  async getRemedies(condition: string, dosha?: string): Promise<any[]> {
    const cacheKey = `content:remedies:${condition}:${dosha || 'all'}`;
    try {
      const cached = await cacheGet(cacheKey);
      if (cached) return cached as any[];

      const where: any = { isActive: true, condition };
      if (dosha) where.dosha = { in: [dosha, 'all'] };

      const rows = await prisma.ayurvedicRemedy.findMany({ where });
      if (rows.length > 0) {
        await cacheSet(cacheKey, rows, 3600);
        return rows;
      }
    } catch (e) {
      console.warn(`[ContentService] DB/cache failed for remedies ${condition}/${dosha}:`, (e as any)?.message);
    }
    return []; // Empty array — caller uses its own fallback
  }

  // ─── Dosha Questions ──────────────────────────────────
  async getDoshaQuestions(): Promise<any[]> {
    const cacheKey = 'content:dosha_questions';
    try {
      const cached = await cacheGet(cacheKey);
      if (cached) return cached as any[];

      const rows = await prisma.doshaQuestion.findMany({
        where: { isActive: true },
        orderBy: { orderIndex: 'asc' },
      });
      if (rows.length > 0) {
        await cacheSet(cacheKey, rows, 3600);
        return rows;
      }
    } catch (e) {
      console.warn('[ContentService] DB/cache failed for dosha questions:', (e as any)?.message);
    }
    return [];
  }

  // ─── All Phase Guidance (for admin listing) ───────────
  async getAllPhaseGuidance(): Promise<any[]> {
    try {
      return await prisma.doshaPhaseGuidance.findMany({
        orderBy: [{ dosha: 'asc' }, { phase: 'asc' }],
      });
    } catch { return []; }
  }

  // ─── All AI Responses (for admin listing) ─────────────
  async getAllChatResponses(): Promise<any[]> {
    try {
      return await prisma.aIChatResponse.findMany({
        orderBy: { priority: 'desc' },
      });
    } catch { return []; }
  }

  // ─── All Remedies (for admin listing) ─────────────────
  async getAllRemedies(): Promise<any[]> {
    try {
      return await prisma.ayurvedicRemedy.findMany({
        orderBy: [{ condition: 'asc' }, { dosha: 'asc' }],
      });
    } catch { return []; }
  }

  // ─── Admin: Create methods ───────────────────────────
  async createPhaseGuidance(data: any) {
    // Parse JSON string fields if needed
    for (const f of ['dietTips', 'herbTips', 'yogaTips', 'lifestyleTips', 'avoidList']) {
      if (typeof data[f] === 'string') try { data[f] = JSON.parse(data[f]); } catch {}
    }
    const result = await prisma.doshaPhaseGuidance.create({ data });
    await this.refreshCache();
    return result;
  }

  async createChatResponse(data: any) {
    if (data.priority !== undefined) data.priority = Number(data.priority);
    const result = await prisma.aIChatResponse.create({ data });
    await this.refreshCache();
    return result;
  }

  async createRemedy(data: any) {
    const result = await prisma.ayurvedicRemedy.create({ data });
    await this.refreshCache();
    return result;
  }

  async createDoshaQuestion(data: any) {
    if (typeof data.options === 'string') try { data.options = JSON.parse(data.options); } catch {}
    if (data.weight !== undefined) data.weight = Number(data.weight);
    if (data.orderIndex !== undefined) data.orderIndex = Number(data.orderIndex);
    const result = await prisma.doshaQuestion.create({ data });
    await this.refreshCache();
    return result;
  }

  // ─── Admin: Update methods ────────────────────────────
  async updatePhaseGuidance(id: string, data: any) {
    // Strip non-updatable fields
    delete data.id; delete data.createdAt; delete data.updatedAt;
    for (const f of ['dietTips', 'herbTips', 'yogaTips', 'lifestyleTips', 'avoidList']) {
      if (typeof data[f] === 'string') try { data[f] = JSON.parse(data[f]); } catch {}
    }
    const result = await prisma.doshaPhaseGuidance.update({ where: { id }, data });
    await this.refreshCache();
    return result;
  }

  async updateChatResponse(id: string, data: any) {
    delete data.id; delete data.createdAt; delete data.updatedAt;
    if (data.priority !== undefined) data.priority = Number(data.priority);
    const result = await prisma.aIChatResponse.update({ where: { id }, data });
    await this.refreshCache();
    return result;
  }

  async updateRemedy(id: string, data: any) {
    delete data.id; delete data.createdAt; delete data.updatedAt;
    const result = await prisma.ayurvedicRemedy.update({ where: { id }, data });
    await this.refreshCache();
    return result;
  }

  async updateDoshaQuestion(id: string, data: any) {
    delete data.id; delete data.createdAt; delete data.updatedAt;
    if (typeof data.options === 'string') try { data.options = JSON.parse(data.options); } catch {}
    if (data.weight !== undefined) data.weight = Number(data.weight);
    if (data.orderIndex !== undefined) data.orderIndex = Number(data.orderIndex);
    const result = await prisma.doshaQuestion.update({ where: { id }, data });
    await this.refreshCache();
    return result;
  }

  // ─── Admin: Delete methods ────────────────────────────
  async deletePhaseGuidance(id: string) {
    const result = await prisma.doshaPhaseGuidance.delete({ where: { id } });
    await this.refreshCache();
    return result;
  }

  async deleteChatResponse(id: string) {
    const result = await prisma.aIChatResponse.delete({ where: { id } });
    await this.refreshCache();
    return result;
  }

  async deleteRemedy(id: string) {
    const result = await prisma.ayurvedicRemedy.delete({ where: { id } });
    await this.refreshCache();
    return result;
  }

  async deleteDoshaQuestion(id: string) {
    const result = await prisma.doshaQuestion.delete({ where: { id } });
    await this.refreshCache();
    return result;
  }

  // ─── Admin: Toggle active status ──────────────────────
  async togglePhaseGuidance(id: string) {
    const item = await prisma.doshaPhaseGuidance.findUnique({ where: { id } });
    if (!item) throw new Error('Not found');
    const result = await prisma.doshaPhaseGuidance.update({ where: { id }, data: { isActive: !item.isActive } });
    await this.refreshCache();
    return result;
  }

  async toggleChatResponse(id: string) {
    const item = await prisma.aIChatResponse.findUnique({ where: { id } });
    if (!item) throw new Error('Not found');
    const result = await prisma.aIChatResponse.update({ where: { id }, data: { isActive: !item.isActive } });
    await this.refreshCache();
    return result;
  }

  async toggleRemedy(id: string) {
    const item = await prisma.ayurvedicRemedy.findUnique({ where: { id } });
    if (!item) throw new Error('Not found');
    const result = await prisma.ayurvedicRemedy.update({ where: { id }, data: { isActive: !item.isActive } });
    await this.refreshCache();
    return result;
  }

  async toggleDoshaQuestion(id: string) {
    const item = await prisma.doshaQuestion.findUnique({ where: { id } });
    if (!item) throw new Error('Not found');
    const result = await prisma.doshaQuestion.update({ where: { id }, data: { isActive: !item.isActive } });
    await this.refreshCache();
    return result;
  }

  // ─── Cache refresh (call after admin edits) ───────────
  async refreshCache(): Promise<void> {
    const keys = [
      'content:chat_responses',
      'content:dosha_questions',
    ];
    // Clear specific known keys
    for (const k of keys) {
      try { await cacheDel(k); } catch {}
    }
    // Clear pattern-matched keys for guidance and remedies
    // Since we can't glob-delete in all Redis setups, clear known combos
    const doshas = ['Vata', 'Pitta', 'Kapha'];
    const phases = ['menstrual', 'follicular', 'ovulation', 'luteal'];
    const conditions = ['general', 'delayed_period', 'pcos', 'heavy_flow', 'cramps', 'irregular'];
    for (const d of doshas) {
      for (const p of phases) {
        try { await cacheDel(`content:phase_guidance:${d}:${p}`); } catch {}
      }
      for (const c of conditions) {
        try { await cacheDel(`content:remedies:${c}:${d}`); } catch {}
      }
      try { await cacheDel(`content:remedies:general:all`); } catch {}
    }
  }
}

export const contentService = new ContentService();
export default contentService;
