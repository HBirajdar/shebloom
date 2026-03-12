// ══════════════════════════════════════════════════════════════════
// Dosha Assessment Routes — Expanded Prakriti System
// ══════════════════════════════════════════════════════════════════

import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response.utils';
import doshaService from '../services/dosha.service';

const r = Router();
r.use(authenticate);

// ─── GET /dosha/questions — Get quiz questions ───────────────────
r.get('/questions', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const questions = await doshaService.getQuestions();
    successResponse(s, questions, 'Dosha questions fetched');
  } catch (e: any) {
    errorResponse(s, e.message, 500);
  }
});

// ─── POST /dosha/assess — Submit self-assessment ─────────────────
r.post('/assess', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { answers, assessmentType } = q.body;
    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      errorResponse(s, 'Answers are required', 400); return;
    }
    const result = await doshaService.submitAssessment(
      q.user!.id,
      answers,
      assessmentType || 'SELF_FULL',
    );
    successResponse(s, result, 'Dosha assessment completed');
  } catch (e: any) {
    errorResponse(s, e.message, 500);
  }
});

// ─── POST /dosha/migrate — Migrate localStorage dosha to DB ──────
r.post('/migrate', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { dosha } = q.body;
    if (!dosha) { errorResponse(s, 'Dosha string required', 400); return; }
    const result = await doshaService.migrateLocalDosha(q.user!.id, dosha);
    successResponse(s, result, result ? 'Dosha migrated to database' : 'Already has assessment');
  } catch (e: any) {
    errorResponse(s, e.message, 500);
  }
});

// ─── GET /dosha/profile — Get my dosha profile ───────────────────
r.get('/profile', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const profile = await doshaService.getDoshaProfile(q.user!.id);
    successResponse(s, profile, 'Dosha profile fetched');
  } catch (e: any) {
    errorResponse(s, e.message, 500);
  }
});

// ─── GET /dosha/history — Assessment history ─────────────────────
r.get('/history', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const history = await doshaService.getAssessmentHistory(q.user!.id);
    successResponse(s, history, 'Assessment history fetched');
  } catch (e: any) {
    errorResponse(s, e.message, 500);
  }
});

export default r;
