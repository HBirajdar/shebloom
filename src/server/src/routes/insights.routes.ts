import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getPersonalizedInsights } from '../services/insights.service';
import { successResponse } from '../utils/response.utils';

const router = Router();

// GET /insights — Full personalized insights
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const data = await getPersonalizedInsights(req.user!.id);
    successResponse(res, data, 'Personalized insights');
  } catch (e) { next(e); }
});

// GET /insights/patterns — Cross-cycle patterns only
router.get('/patterns', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const data = await getPersonalizedInsights(req.user!.id);
    successResponse(res, { patterns: data.patterns }, 'Cycle patterns');
  } catch (e) { next(e); }
});

// GET /insights/mood-trends — Mood trend analysis
router.get('/mood-trends', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const data = await getPersonalizedInsights(req.user!.id);
    successResponse(res, { moodTrends: data.moodTrends }, 'Mood trends');
  } catch (e) { next(e); }
});

export default router;
