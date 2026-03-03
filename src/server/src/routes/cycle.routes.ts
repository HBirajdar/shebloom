import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { CycleService } from '../services/cycle.service';
const r = Router(); const s = new CycleService(); r.use(authenticate);
r.get('/', async (q: AuthRequest, r: Response, n: NextFunction) => { try { r.json({ success: true, data: await s.getCycles(q.user!.id) }); } catch(e) { n(e); } });
r.post('/log', async (q: AuthRequest, r: Response, n: NextFunction) => { try { r.status(201).json({ success: true, data: await s.logPeriod(q.user!.id, q.body) }); } catch(e) { n(e); } });
r.get('/predict', async (q: AuthRequest, r: Response, n: NextFunction) => { try { r.json({ success: true, data: await s.getPredictions(q.user!.id) }); } catch(e) { n(e); } });
r.post('/symptoms', async (q: AuthRequest, r: Response, n: NextFunction) => { try { r.status(201).json({ success: true, data: await s.logSymptoms(q.user!.id, q.body) }); } catch(e) { n(e); } });
export default r;
