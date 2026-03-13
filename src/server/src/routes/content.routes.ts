import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/roles.middleware';
import { successResponse, errorResponse } from '../utils/response.utils';
import contentService from '../services/content.service';

const r = Router();

// ═══════════════════════════════════════════════════════
// PUBLIC ROUTES (no auth needed for content delivery)
// ═══════════════════════════════════════════════════════

// GET /content/dosha-questions
r.get('/dosha-questions', async (_q: any, s: Response, n: NextFunction) => {
  try {
    const questions = await contentService.getDoshaQuestions();
    successResponse(s, questions, 'Dosha questions fetched');
  } catch (e) { n(e); }
});

// GET /content/remedies?condition=delayed_period&dosha=Vata
r.get('/remedies', async (q: any, s: Response, n: NextFunction) => {
  try {
    const { condition, dosha } = q.query;
    const remedies = await contentService.getRemedies(condition || 'general', dosha);
    successResponse(s, remedies, 'Remedies fetched');
  } catch (e) { n(e); }
});

// GET /content/phase-guidance?dosha=Vata&phase=menstrual
r.get('/phase-guidance', async (q: any, s: Response, n: NextFunction) => {
  try {
    const { dosha, phase } = q.query;
    if (!dosha || !phase) { errorResponse(s, 'dosha and phase are required', 400); return; }
    const guidance = await contentService.getDoshaPhaseGuidance(dosha as string, phase as string);
    successResponse(s, guidance, 'Phase guidance fetched');
  } catch (e) { n(e); }
});

// ═══════════════════════════════════════════════════════
// ADMIN ROUTES (auth + admin role required)
// ═══════════════════════════════════════════════════════

// ─── List all (admin) ────────────────────────────────
r.get('/admin/phase-guidance', authenticate, requireAdmin, async (_q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    successResponse(s, await contentService.getAllPhaseGuidance(), 'All phase guidance');
  } catch (e) { n(e); }
});

r.get('/admin/chat-responses', authenticate, requireAdmin, async (_q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    successResponse(s, await contentService.getAllChatResponses(), 'All chat responses');
  } catch (e) { n(e); }
});

r.get('/admin/remedies', authenticate, requireAdmin, async (_q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    successResponse(s, await contentService.getAllRemedies(), 'All remedies');
  } catch (e) { n(e); }
});

r.get('/admin/dosha-questions', authenticate, requireAdmin, async (_q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    successResponse(s, await contentService.getDoshaQuestions(), 'All dosha questions');
  } catch (e) { n(e); }
});

// ─── Create (admin) ─────────────────────────────────
r.post('/admin/phase-guidance', authenticate, requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const result = await contentService.createPhaseGuidance(q.body);
    successResponse(s, result, 'Phase guidance created');
  } catch (e) { n(e); }
});

r.post('/admin/chat-responses', authenticate, requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const result = await contentService.createChatResponse(q.body);
    successResponse(s, result, 'Chat response created');
  } catch (e) { n(e); }
});

r.post('/admin/remedies', authenticate, requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const result = await contentService.createRemedy(q.body);
    successResponse(s, result, 'Remedy created');
  } catch (e) { n(e); }
});

r.post('/admin/dosha-questions', authenticate, requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const result = await contentService.createDoshaQuestion(q.body);
    successResponse(s, result, 'Dosha question created');
  } catch (e) { n(e); }
});

// ─── Update (admin) ─────────────────────────────────
r.put('/admin/phase-guidance/:id', authenticate, requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const result = await contentService.updatePhaseGuidance(q.params.id, q.body);
    successResponse(s, result, 'Phase guidance updated');
  } catch (e) { n(e); }
});

r.put('/admin/chat-responses/:id', authenticate, requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const result = await contentService.updateChatResponse(q.params.id, q.body);
    successResponse(s, result, 'Chat response updated');
  } catch (e) { n(e); }
});

r.put('/admin/remedies/:id', authenticate, requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const result = await contentService.updateRemedy(q.params.id, q.body);
    successResponse(s, result, 'Remedy updated');
  } catch (e) { n(e); }
});

r.put('/admin/dosha-questions/:id', authenticate, requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const result = await contentService.updateDoshaQuestion(q.params.id, q.body);
    successResponse(s, result, 'Dosha question updated');
  } catch (e) { n(e); }
});

// ─── Delete (admin) ─────────────────────────────────
r.delete('/admin/phase-guidance/:id', authenticate, requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    await contentService.deletePhaseGuidance(q.params.id);
    successResponse(s, { deleted: true }, 'Phase guidance deleted');
  } catch (e) { n(e); }
});

r.delete('/admin/chat-responses/:id', authenticate, requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    await contentService.deleteChatResponse(q.params.id);
    successResponse(s, { deleted: true }, 'Chat response deleted');
  } catch (e) { n(e); }
});

r.delete('/admin/remedies/:id', authenticate, requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    await contentService.deleteRemedy(q.params.id);
    successResponse(s, { deleted: true }, 'Remedy deleted');
  } catch (e) { n(e); }
});

r.delete('/admin/dosha-questions/:id', authenticate, requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    await contentService.deleteDoshaQuestion(q.params.id);
    successResponse(s, { deleted: true }, 'Dosha question deleted');
  } catch (e) { n(e); }
});

// ─── Toggle active (admin) ──────────────────────────
r.patch('/admin/phase-guidance/:id/toggle', authenticate, requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const result = await contentService.togglePhaseGuidance(q.params.id);
    successResponse(s, result, 'Phase guidance toggled');
  } catch (e) { n(e); }
});

r.patch('/admin/chat-responses/:id/toggle', authenticate, requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const result = await contentService.toggleChatResponse(q.params.id);
    successResponse(s, result, 'Chat response toggled');
  } catch (e) { n(e); }
});

r.patch('/admin/remedies/:id/toggle', authenticate, requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const result = await contentService.toggleRemedy(q.params.id);
    successResponse(s, result, 'Remedy toggled');
  } catch (e) { n(e); }
});

r.patch('/admin/dosha-questions/:id/toggle', authenticate, requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const result = await contentService.toggleDoshaQuestion(q.params.id);
    successResponse(s, result, 'Dosha question toggled');
  } catch (e) { n(e); }
});

// ─── Cache refresh (admin) ──────────────────────────
r.post('/admin/cache/refresh', authenticate, requireAdmin, async (_q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    await contentService.refreshCache();
    successResponse(s, { refreshed: true }, 'Content cache refreshed');
  } catch (e) { n(e); }
});

export default r;
