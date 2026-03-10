// Admin CMS routes — Bug B fix
// In-memory store (TODO: migrate to Prisma Product/AdminArticle models)
import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';

const r = Router();

// ─── In-memory store ───────────────────────────────
interface AdminProduct {
  id: string; name: string; category: string; price: number; discountPrice?: number;
  description: string; ingredients: string[]; benefits: string[]; howToUse: string;
  size: string; emoji: string; rating: number; reviews: number; inStock: boolean;
  isPublished: boolean; isFeatured: boolean; targetAudience: string[]; tags: string[];
  preparationMethod?: string; doctorNote?: string; createdAt: string;
}
interface AdminArticle {
  id: string; title: string; content: string; category: string; readTime: string;
  emoji: string; isPublished: boolean; isFeatured: boolean; targetAudience: string[]; createdAt: string;
}
interface AdminDoctor {
  id: string; name: string; specialization: string; experience: number; rating: number;
  reviews: number; fee: number; feeFreeForPoor: boolean; qualification: string;
  tags: string[]; languages: string[]; about: string; isChief: boolean; isPublished: boolean;
}

const store: { products: AdminProduct[]; articles: AdminArticle[]; doctors: AdminDoctor[] } = {
  products: [],
  articles: [],
  doctors: [],
};

// Require JWT authentication for all admin routes
r.use(authenticate);

// ─── Dashboard ─────────────────────────────────────
r.get('/dashboard', (_req: Request, res: Response) => {
  res.json({ success: true, data: store });
});

// ─── Products ──────────────────────────────────────
r.post('/products', (req: Request, res: Response) => {
  const product: AdminProduct = {
    ...req.body,
    id: 'p_' + Date.now(),
    isPublished: false,
    isFeatured: false,
    rating: 5.0,
    reviews: 0,
    inStock: true,
    createdAt: new Date().toISOString().split('T')[0],
  };
  store.products.unshift(product);
  res.json({ success: true, data: product });
});

r.post('/products/:id/toggle-publish', (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = store.products.find(x => x.id === req.params.id);
    if (!p) { res.status(404).json({ success: false, error: 'Product not found' }); return; }
    p.isPublished = !p.isPublished;
    res.json({ success: true, data: p });
  } catch (e) { next(e); }
});

r.delete('/products/:id', (req: Request, res: Response) => {
  store.products = store.products.filter(x => x.id !== req.params.id);
  res.json({ success: true });
});

// ─── Articles ──────────────────────────────────────
r.post('/articles', (req: Request, res: Response) => {
  const article: AdminArticle = {
    ...req.body,
    id: 'a_' + Date.now(),
    isPublished: false,
    isFeatured: false,
    createdAt: new Date().toISOString().split('T')[0],
  };
  store.articles.unshift(article);
  res.json({ success: true, data: article });
});

r.post('/articles/:id/toggle-publish', (req: Request, res: Response, next: NextFunction) => {
  try {
    const a = store.articles.find(x => x.id === req.params.id);
    if (!a) { res.status(404).json({ success: false, error: 'Article not found' }); return; }
    a.isPublished = !a.isPublished;
    res.json({ success: true, data: a });
  } catch (e) { next(e); }
});

r.delete('/articles/:id', (req: Request, res: Response) => {
  store.articles = store.articles.filter(x => x.id !== req.params.id);
  res.json({ success: true });
});

// ─── Doctors ───────────────────────────────────────
r.post('/doctors', (req: Request, res: Response) => {
  const doctor: AdminDoctor = {
    ...req.body,
    id: 'd_' + Date.now(),
    isPublished: false,
    isChief: false,
    rating: 5.0,
    reviews: 0,
    feeFreeForPoor: false,
  };
  store.doctors.unshift(doctor);
  res.json({ success: true, data: doctor });
});

r.post('/doctors/:id/toggle-publish', (req: Request, res: Response, next: NextFunction) => {
  try {
    const d = store.doctors.find(x => x.id === req.params.id);
    if (!d) { res.status(404).json({ success: false, error: 'Doctor not found' }); return; }
    d.isPublished = !d.isPublished;
    res.json({ success: true, data: d });
  } catch (e) { next(e); }
});

r.delete('/doctors/:id', (req: Request, res: Response) => {
  store.doctors = store.doctors.filter(x => x.id !== req.params.id);
  res.json({ success: true });
});

export default r;
