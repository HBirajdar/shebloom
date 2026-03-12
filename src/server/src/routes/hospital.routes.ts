import { Router, Response, NextFunction, Request } from 'express';
import { HospitalService } from '../services/hospital.service';
import { successResponse, errorResponse } from '../utils/response.utils';

const r = Router(); const s = new HospitalService();
r.get('/', async (q: Request, r: Response, n: NextFunction) => { try { successResponse(r, await s.search(q.query)); } catch(e) { n(e); } });
r.get('/compare/prices', async (q: Request, r: Response, n: NextFunction) => { try { successResponse(r, await s.comparePrices(q.query.service as string, q.query.city as string)); } catch(e) { n(e); } });
r.get('/:id', async (q: Request, r: Response, n: NextFunction) => { try { const h = await s.getById(q.params.id); if(!h) { errorResponse(r, 'Not found', 404); } else { successResponse(r, h); } } catch(e) { n(e); } });
export default r;
