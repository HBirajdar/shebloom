import { Router, Response, NextFunction, Request } from 'express';
import { HospitalService } from '../services/hospital.service';
const r = Router(); const s = new HospitalService();
r.get('/', async (q: Request, r: Response, n: NextFunction) => { try { r.json({ success: true, ...await s.search(q.query) }); } catch(e) { n(e); } });
r.get('/compare/prices', async (q: Request, r: Response, n: NextFunction) => { try { r.json({ success: true, data: await s.comparePrices(q.query.service as string, q.query.city as string) }); } catch(e) { n(e); } });
r.get('/:id', async (q: Request, r: Response, n: NextFunction) => { try { const h = await s.getById(q.params.id); if(!h) r.status(404).json({error:'Not found'}); else r.json({ success: true, data: h }); } catch(e) { n(e); } });
export default r;
