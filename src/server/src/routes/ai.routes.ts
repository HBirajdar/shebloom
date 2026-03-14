// ══════════════════════════════════════════════════════
// src/server/src/routes/ai.routes.ts
// POST /ai/chat  – AI wellness coach response
// ══════════════════════════════════════════════════════

import { Router, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response.utils';
import contentService from '../services/content.service';
import { getPersonalizedInsights } from '../services/insights.service';

const aiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, keyGenerator: (req) => (req as any).user?.id || req.ip, message: { success: false, error: 'Too many AI requests. Please try again later.' } });

const r = Router();
r.use(authenticate);
r.use(aiLimiter);

// ─── Rule-based wellness AI (no external API key needed) ─
const PHASE_ADVICE: Record<string, string[]> = {
  MENSTRUAL: [
    'During your period, focus on rest and gentle movement. Iron-rich foods like spinach and lentils help replenish lost minerals.',
    'Warmth is your best friend right now — a heating pad and ginger tea can ease cramps naturally.',
    'Your energy is naturally lower during menstruation. Honor that by slowing down and prioritising sleep.',
    'Magnesium-rich foods like dark chocolate, nuts, and seeds can reduce period cramps and mood swings.',
  ],
  FOLLICULAR: [
    'Your estrogen is rising — energy is building! Great time to start new projects or try a new workout.',
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

const KEYWORD_RESPONSES: Array<{ keywords: RegExp; response: string }> = [
  {
    keywords: /cramp|pain|period pain|dysmenorrhea/i,
    response: 'For period cramps, try: 1) Apply heat to your lower abdomen for 20 minutes 2) Ginger tea with honey reduces prostaglandins 3) Gentle child\'s pose yoga 4) Magnesium glycinate supplements (consult your doctor first). If pain is severe, please see a healthcare provider.',
  },
  {
    keywords: /pcod|pcos|polycystic/i,
    response: 'For PCOS management: focus on a low-glycaemic diet (whole grains, legumes, vegetables), regular moderate exercise, stress reduction (yoga works brilliantly), and adequate sleep. Always work with your gynaecologist to tailor a plan for your specific hormone profile.',
  },
  {
    keywords: /pregnant|pregnancy|conceive|fertility|trying to conceive|ttc/i,
    response: 'When trying to conceive, track your fertile window (5 days before + day of ovulation). Folic acid (400mcg daily), maintaining a healthy weight, and reducing stress all improve fertility. I recommend consulting a fertility specialist if you\'ve been trying for 12+ months (or 6 months if over 35).',
  },
  {
    keywords: /stress|anxiety|mood|mental health|depressed|sad/i,
    response: 'Hormonal fluctuations throughout your cycle directly affect mood. Some strategies: 1) Track your mood daily to spot patterns 2) Try 4-7-8 breathing during anxiety spikes 3) Omega-3s and B vitamins support brain chemistry 4) Adequate sleep (7-9 hours) is crucial. Reach out to a mental health professional if you feel persistently low.',
  },
  {
    keywords: /sleep|insomnia|tired|fatigue|exhausted/i,
    response: 'Hormones affect sleep quality throughout your cycle — progesterone in the luteal phase can cause fatigue while pre-period estrogen drops disturb sleep. Tips: maintain a consistent sleep schedule, avoid screens 1 hour before bed, try magnesium glycinate, and keep your bedroom cool (18-20°C is ideal).',
  },
  {
    keywords: /diet|food|eat|nutrition|weight/i,
    response: 'Eating in sync with your cycle is powerful: Menstrual — iron-rich foods; Follicular — fermented foods, sprouts; Ovulation — antioxidant-rich foods (berries, leafy greens); Luteal — complex carbs, magnesium. Avoid ultra-processed foods and excess sugar throughout, as they worsen hormonal imbalance.',
  },
  {
    keywords: /exercise|workout|yoga|gym|fitness/i,
    response: 'Cycle-syncing your workouts: Menstrual — gentle stretching, walking, yin yoga; Follicular — increasing cardio, pilates, dance; Ovulation — HIIT, strength training, running; Luteal — moderate yoga, swimming, light weights. Listen to your body — it knows what it needs!',
  },
  {
    keywords: /ayurveda|herb|natural|home remedy|dosha/i,
    response: 'Ayurvedic support for cycles: Shatavari (hormone balance), Ashwagandha (stress adaptogen), Triphala (digestion), and Turmeric (anti-inflammatory). Please consult an Ayurvedic practitioner before starting supplements — dosage and combinations matter for your specific constitution (dosha).',
  },
  {
    keywords: /late period|missed period|irregular|spotting|delayed period|period delay|period late|not getting period/i,
    response: 'Late or irregular periods can be caused by stress, sleep disruption, significant weight changes, thyroid issues, PCOS, or early pregnancy. A single late period is often stress-related.\n\n\u{1F33F} Ayurvedic remedies: Shatavari (hormone balance), Ashoka bark (uterine health), Ashwagandha (stress relief). Try warm ginger-jaggery water twice daily, sesame seeds with honey, and warm oil self-massage (Abhyanga). Yoga poses like Baddha Konasana and Supta Virasana help stimulate pelvic blood flow.\n\n\u26A0\uFE0F See a doctor if: period is 2+ weeks late, you have severe pain or unusual discharge, there\'s a possibility of pregnancy, or you have a history of PCOS/thyroid issues.\n\nCheck your Dashboard and Tracker for personalized dosha-specific guidance!',
  },
];

interface HealthContext {
  patterns?: { name: string; phase: string; rate: number; type: string }[];
  dosha?: string | null;
  moodTrends?: { bestPhase: string; worstPhase: string; insight: string };
  predictions?: { prediction: string }[];
  tips?: { tip: string; category: string }[];
}

function generateAIResponse(
  message: string, cycleDay: number, phase: string, goal: string,
  dbResponses?: { regex: RegExp; responseText: string }[],
  dbPhaseAdvice?: Record<string, string[]>,
  healthCtx?: HealthContext,
): string {
  const msgLower = message.toLowerCase();

  // Check DB-loaded responses first (if available), then fall back to hardcoded
  if (dbResponses && dbResponses.length > 0) {
    for (const { regex, responseText } of dbResponses) {
      if (regex.test(msgLower)) return responseText;
    }
  } else {
    for (const { keywords, response } of KEYWORD_RESPONSES) {
      if (keywords.test(msgLower)) return response;
    }
  }

  // Greetings
  if (/^(hi|hello|hey|hiya|namaste)/i.test(msgLower)) {
    return `Hello! I'm your Vedaclue wellness guide. I can see you're on cycle day ${cycleDay} in your ${phase.toLowerCase()} phase. How can I support your wellness journey today?`;
  }

  // Phase-specific tip request — prefer personalized tips from insights engine
  if (/tip|advice|suggest|recommend|what (should|can) i/i.test(msgLower)) {
    if (healthCtx?.tips?.length) {
      const personalTip = healthCtx.tips[0];
      let response = `Based on your health history: ${personalTip.tip}`;
      if (healthCtx.patterns?.length) {
        const topPattern = healthCtx.patterns[0];
        response += `\n\nI've also noticed you tend to get ${topPattern.name} during your ${topPattern.phase} phase (${Math.round(topPattern.rate * 100)}% of your cycles). Keep that in mind as you plan your self-care.`;
      }
      return response;
    }
    const adviceSource = dbPhaseAdvice || PHASE_ADVICE;
    const tips = adviceSource[phase.toUpperCase()] || adviceSource.FOLLICULAR;
    return tips[Math.floor(Math.random() * tips.length)];
  }

  // Phase explanation
  if (/phase|what is|explain|tell me about/i.test(msgLower)) {
    const phaseInfo: Record<string, string> = {
      MENSTRUAL: `You're in your menstrual phase (day ${cycleDay}). This is a time of release and renewal — both physically and emotionally. Your hormone levels are at their lowest, which is why rest and gentle self-care feel so right.`,
      FOLLICULAR: `You're in your follicular phase (day ${cycleDay}). Estrogen is rising, bringing increased energy, mental clarity, and optimism. This is the perfect time to start fresh and try new things!`,
      OVULATION: `You're ovulating around day ${cycleDay}! Estrogen peaks before ovulation, making you feel confident, energetic, and social. Your body is primed for peak performance.`,
      LUTEAL: `You're in your luteal phase (day ${cycleDay}). Progesterone rises to prepare for the next cycle, which can bring cravings, mood changes, and a need for more introspection. Be gentle with yourself.`,
    };
    return phaseInfo[phase.toUpperCase()] || `You're on cycle day ${cycleDay} in your ${phase} phase. Each phase brings unique strengths — embrace where you are right now!`;
  }

  // Default phase-aware response — enriched with health context
  const adviceSource2 = dbPhaseAdvice || PHASE_ADVICE;
  const phaseTips = adviceSource2[phase.toUpperCase()] || adviceSource2.FOLLICULAR;
  let defaultReply = `Great question! On cycle day ${cycleDay}, here's what I'd focus on: ${phaseTips[Math.floor(Math.random() * phaseTips.length)]}`;

  // Append personalized context if available
  if (healthCtx?.dosha) {
    defaultReply += `\n\nAs a ${healthCtx.dosha} constitution, ${healthCtx.dosha === 'Vata' ? 'warmth and routine are your best friends this phase.' : healthCtx.dosha === 'Pitta' ? 'cooling foods and gentle activities suit you best right now.' : 'light, warm meals and stimulating movement will keep you balanced.'}`;
  }
  if (healthCtx?.predictions?.length) {
    defaultReply += `\n\n🔮 Heads up: ${healthCtx.predictions[0].prediction}`;
  }

  defaultReply += ` Is there anything specific about your ${phase.toLowerCase()} phase you'd like to explore?`;
  return defaultReply;
}

// ─── POST /ai/chat ───────────────────────────────────
r.post('/chat', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { message, context } = q.body as {
      message: string;
      context: { cycleDay: number; phase: string; goal: string; lastSymptoms?: string[] };
    };

    if (!message?.trim()) {
      errorResponse(s, 'message is required', 400);
      return;
    }
    if (message.length > 2000) {
      errorResponse(s, 'Message must be under 2000 characters', 400);
      return;
    }

    const { cycleDay = 1, phase = 'FOLLICULAR', goal = 'wellness' } = context || {};

    // Load DB content + user health context in parallel
    let dbResponses: any[] | undefined;
    let dbPhaseAdvice: Record<string, string[]> | undefined;
    let healthCtx: HealthContext | undefined;
    try {
      const [dbRes, dbPhase, insights] = await Promise.all([
        contentService.getChatResponses().catch(() => undefined),
        contentService.getPhaseAdvice().catch(() => undefined),
        q.user?.id ? getPersonalizedInsights(q.user.id).catch(() => null) : Promise.resolve(null),
      ]);
      dbResponses = dbRes;
      dbPhaseAdvice = dbPhase;
      if (insights) {
        healthCtx = {
          patterns: insights.patterns,
          dosha: (insights as any).dosha || null,
          moodTrends: insights.moodTrends,
          predictions: insights.predictions,
          tips: insights.tips,
        };
      }
    } catch { /* fallback to hardcoded */ }

    const reply = generateAIResponse(message, cycleDay, phase, goal, dbResponses, dbPhaseAdvice, healthCtx);

    successResponse(s, {
      reply,
      phase,
      cycleDay,
      timestamp: new Date().toISOString(),
    });
  } catch (e) { n(e); }
});

export default r;
