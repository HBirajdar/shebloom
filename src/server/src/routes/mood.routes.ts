import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { CycleService } from '../services/cycle.service';
import { successResponse } from '../utils/response.utils';

const r = Router(); const s = new CycleService(); r.use(authenticate);
r.post('/', async (q: AuthRequest, r: Response, n: NextFunction) => { try { successResponse(r, await s.logMood(q.user!.id, q.body), 'Mood logged', 201); } catch(e) { n(e); } });
r.get('/history', async (q: AuthRequest, r: Response, n: NextFunction) => { try { successResponse(r, await s.getMoodHistory(q.user!.id, Number(q.query.days)||30)); } catch(e) { n(e); } });
export default r;
