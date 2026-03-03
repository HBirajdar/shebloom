import { Router, Response, NextFunction, Request } from 'express';
import { DoctorService } from '../services/doctor.service';
const r = Router(); const s = new DoctorService();
r.get('/', async (q: Request, r: Response, n: NextFunction) => { try { r.json({ success: true, ...await s.search(q.query) }); } catch(e) { n(e); } });
r.get('/:id', async (q: Request, r: Response, n: NextFunction) => { try { const d = await s.getById(q.params.id); if(!d) r.status(404).json({error:'Not found'}); else r.json({ success: true, data: d }); } catch(e) { n(e); } });
export default r;
