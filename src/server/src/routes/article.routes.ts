import { Router, Response, NextFunction, Request } from 'express';
import prisma from '../config/database';
const r = Router();
r.get('/', async (q: Request, s: Response, n: NextFunction) => {
  try { const w: any = { status: 'PUBLISHED' }; if(q.query.category) w.category=q.query.category; s.json({ success: true, data: await prisma.article.findMany({ where: w, take: 20, orderBy: { publishedAt: 'desc' } }) }); } catch(e) { n(e); }
});
r.get('/:slug', async (q: Request, s: Response, n: NextFunction) => {
  try { s.json({ success: true, data: await prisma.article.findUnique({ where: { slug: q.params.slug } }) }); } catch(e) { n(e); }
});
export default r;
