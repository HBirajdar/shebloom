import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { CycleService } from '../services/cycle.service';
import { successResponse } from '../utils/response.utils';

const r = Router(); const s = new CycleService(); r.use(authenticate);
r.get('/', async (q: AuthRequest, r: Response, n: NextFunction) => { try { successResponse(r, await s.getCycles(q.user!.id)); } catch(e) { n(e); } });
r.post('/log', async (q: AuthRequest, r: Response, n: NextFunction) => { try { successResponse(r, await s.logPeriod(q.user!.id, q.body), 'Period logged', 201); } catch(e) { n(e); } });
r.get('/predict', async (q: AuthRequest, r: Response, n: NextFunction) => { try { successResponse(r, await s.getPredictions(q.user!.id)); } catch(e) { n(e); } });
r.post('/symptoms', async (q: AuthRequest, r: Response, n: NextFunction) => { try { successResponse(r, await s.logSymptoms(q.user!.id, q.body), 'Symptoms logged', 201); } catch(e) { n(e); } });
export default r;
