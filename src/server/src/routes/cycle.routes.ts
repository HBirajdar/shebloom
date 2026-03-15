// ══════════════════════════════════════════════════════
// Cycle & Fertility Routes
// ══════════════════════════════════════════════════════

import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireSubscription } from '../middleware/subscription.middleware';
import { CycleService } from '../services/cycle.service';
import { successResponse, errorResponse } from '../utils/response.utils';

const r = Router();
const svc = new CycleService();
r.use(authenticate);

// ─── Core cycle endpoints (FREE) ─────────────────────
r.get('/', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try { successResponse(s, await svc.getCycles(q.user!.id)); } catch (e) { n(e); }
});

r.post('/log', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { startDate, endDate, flow, painLevel } = q.body;
    if (!startDate) { errorResponse(s, 'startDate is required', 400); return; }
    if (isNaN(new Date(startDate).getTime())) { errorResponse(s, 'Invalid startDate', 400); return; }
    if (endDate && isNaN(new Date(endDate).getTime())) { errorResponse(s, 'Invalid endDate', 400); return; }
    if (flow && !['heavy', 'medium', 'light', 'spotting'].includes(flow)) { errorResponse(s, 'Invalid flow value', 400); return; }
    if (painLevel != null && (Number(painLevel) < 0 || Number(painLevel) > 10)) { errorResponse(s, 'painLevel must be 0-10', 400); return; }
    successResponse(s, await svc.logPeriod(q.user!.id, q.body), 'Period logged', 201);
  } catch (e) { n(e); }
});

r.get('/predict', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try { successResponse(s, await svc.getPredictions(q.user!.id)); } catch (e) { n(e); }
});

r.put('/:id', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try { successResponse(s, await svc.updatePeriod(q.user!.id, q.params.id, q.body), 'Period updated'); } catch (e) { n(e); }
});

r.delete('/:id', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try { successResponse(s, await svc.deletePeriod(q.user!.id, q.params.id), 'Period deleted'); } catch (e) { n(e); }
});

r.post('/symptoms', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try { successResponse(s, await svc.logSymptoms(q.user!.id, q.body), 'Symptoms logged', 201); } catch (e) { n(e); }
});

// ─── BBT (Basal Body Temperature) [PREMIUM] ─────────
r.post('/bbt', requireSubscription('cycle:bbt'), async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { temperature, time, method, logDate, notes } = q.body;
    if (!temperature || !logDate) { errorResponse(s, 'Temperature and logDate are required', 400); return; }
    if (temperature < 35 || temperature > 39) { errorResponse(s, 'Temperature must be between 35°C and 39°C', 400); return; }
    successResponse(s, await svc.logBBT(q.user!.id, { temperature: parseFloat(temperature), time, method, logDate, notes }), 'BBT logged', 201);
  } catch (e) { n(e); }
});

r.get('/bbt', requireSubscription('cycle:bbt'), async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const days = parseInt(q.query.days as string) || 90;
    successResponse(s, await svc.getBBTHistory(q.user!.id, days));
  } catch (e) { n(e); }
});

// ─── Cervical Mucus [PREMIUM] ────────────────────────
r.post('/cervical-mucus', requireSubscription('cycle:cervical-mucus'), async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { type, amount, logDate, notes } = q.body;
    if (!type || !logDate) { errorResponse(s, 'Type and logDate are required', 400); return; }
    successResponse(s, await svc.logCervicalMucus(q.user!.id, { type, amount, logDate, notes }), 'Cervical mucus logged', 201);
  } catch (e) { n(e); }
});

r.get('/cervical-mucus', requireSubscription('cycle:cervical-mucus'), async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const days = parseInt(q.query.days as string) || 90;
    successResponse(s, await svc.getCervicalMucusHistory(q.user!.id, days));
  } catch (e) { n(e); }
});

// ─── Daily Fertility Log [PREMIUM] ───────────────────
r.post('/fertility-daily', requireSubscription('cycle:fertility-daily'), async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    if (!q.body.logDate) { errorResponse(s, 'logDate is required', 400); return; }
    successResponse(s, await svc.logFertilityDaily(q.user!.id, q.body), 'Fertility data logged', 201);
  } catch (e) { n(e); }
});

r.get('/fertility-daily', requireSubscription('cycle:fertility-daily'), async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const days = parseInt(q.query.days as string) || 90;
    successResponse(s, await svc.getFertilityDailyHistory(q.user!.id, days));
  } catch (e) { n(e); }
});

// ─── Fertility Insights [PREMIUM] ────────────────────
r.get('/fertility-insights', requireSubscription('cycle:fertility-insights'), async (q: AuthRequest, s: Response, n: NextFunction) => {
  try { successResponse(s, await svc.getFertilityInsights(q.user!.id)); } catch (e) { n(e); }
});

// ─── Ayurvedic + Modern Science Insights [PREMIUM] ───
r.get('/ayurvedic-insights', requireSubscription('cycle:ayurvedic-insights'), async (q: AuthRequest, s: Response, n: NextFunction) => {
  try { successResponse(s, await svc.getAyurvedicInsights(q.user!.id)); } catch (e) { n(e); }
});

export default r;
