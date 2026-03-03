import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { CycleService } from '../services/cycle.service';
const r = Router(); const s = new CycleService(); r.use(authenticate);
r.post('/', async (q: AuthRequest, r: Response, n: NextFunction) => { try { r.status(201).json({ success: true, data: await s.logMood(q.user!.id, q.body) }); } catch(e) { n(e); } });
r.get('/history', async (q: AuthRequest, r: Response, n: NextFunction) => { try { r.json({ success: true, data: await s.getMoodHistory(q.user!.id, Number(q.query.days)||30) }); } catch(e) { n(e); } });
export default r;
