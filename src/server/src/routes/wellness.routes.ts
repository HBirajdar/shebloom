import { Router, Response, NextFunction, Request } from 'express';
import prisma from '../config/database';
const r = Router();
r.get('/', async (q: Request, s: Response, n: NextFunction) => {
  try { const w: any = { isActive: true }; if(q.query.category) w.category=q.query.category; s.json({ success: true, data: await prisma.wellnessActivity.findMany({ where: w }) }); } catch(e) { n(e); }
});
export default r;
