import { Router, Response, NextFunction, Request } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/roles.middleware';
import { successResponse, errorResponse } from '../utils/response.utils';

const r = Router();

// GET /products — public, only published
r.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const where: any = { isPublished: true };
    if (req.query.category) where.category = req.query.category;
    if (req.query.featured === 'true') where.isFeatured = true;
    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(req.query.limit) || 50,
      skip: Number(req.query.offset) || 0,
    });
    successResponse(res, products);
  } catch (e) { next(e); }
});

// GET /products/all — admin only, all products
r.get('/all', authenticate, requireAdmin, async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const products = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } });
    successResponse(res, products);
  } catch (e) { next(e); }
});

// GET /products/:id — public, single product
r.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) { errorResponse(res, 'Product not found', 404); return; }
    successResponse(res, product);
  } catch (e) { next(e); }
});

// POST /products — admin create
r.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      name, category, price, discountPrice, description, ingredients, benefits,
      howToUse, size, emoji, targetAudience, tags, imageUrl, galleryImages, videoUrl,
      ownerEmail, ownerPhone,
    } = req.body;
    const product = await prisma.product.create({
      data: {
        name,
        category,
        price: Number(price) || 0,
        discountPrice: discountPrice ? Number(discountPrice) : null,
        description: description || '',
        ingredients: Array.isArray(ingredients) ? ingredients : (ingredients || '').split(',').map((s: string) => s.trim()).filter(Boolean),
        benefits: Array.isArray(benefits) ? benefits : (benefits || '').split(',').map((s: string) => s.trim()).filter(Boolean),
        howToUse: howToUse || '',
        size: size || '',
        emoji: emoji || '🌿',
        targetAudience: Array.isArray(targetAudience) ? targetAudience : ['all'],
        tags: Array.isArray(tags) ? tags : (tags || '').split(',').map((s: string) => s.trim()).filter(Boolean),
        imageUrl: imageUrl || null,
        galleryImages: Array.isArray(galleryImages) ? galleryImages : [],
        videoUrl: videoUrl || null,
        ownerEmail: ownerEmail || null,
        ownerPhone: ownerPhone || null,
      },
    });
    successResponse(res, product, 'Product created', 201);
  } catch (e) { next(e); }
});

// PUT /products/:id — admin update
r.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data: any = {};
    const fields = ['name', 'category', 'description', 'howToUse', 'size', 'emoji', 'imageUrl', 'videoUrl'];
    for (const f of fields) {
      if (req.body[f] !== undefined) data[f] = req.body[f];
    }
    if (req.body.price !== undefined) data.price = Number(req.body.price);
    if (req.body.discountPrice !== undefined) data.discountPrice = req.body.discountPrice ? Number(req.body.discountPrice) : null;
    if (req.body.inStock !== undefined) data.inStock = req.body.inStock;
    if (req.body.isPublished !== undefined) data.isPublished = req.body.isPublished;
    if (req.body.isFeatured !== undefined) data.isFeatured = req.body.isFeatured;
    if (req.body.ingredients !== undefined) {
      data.ingredients = Array.isArray(req.body.ingredients) ? req.body.ingredients : (req.body.ingredients || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    if (req.body.benefits !== undefined) {
      data.benefits = Array.isArray(req.body.benefits) ? req.body.benefits : (req.body.benefits || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    if (req.body.targetAudience !== undefined) data.targetAudience = req.body.targetAudience;
    if (req.body.tags !== undefined) {
      data.tags = Array.isArray(req.body.tags) ? req.body.tags : (req.body.tags || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    if (req.body.galleryImages !== undefined) data.galleryImages = req.body.galleryImages;
    if (req.body.ownerEmail !== undefined) data.ownerEmail = req.body.ownerEmail || null;
    if (req.body.ownerPhone !== undefined) data.ownerPhone = req.body.ownerPhone || null;

    const product = await prisma.product.update({ where: { id }, data });
    successResponse(res, product);
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'Product not found', 404); return; }
    next(e);
  }
});

// DELETE /products/:id — admin delete
r.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    successResponse(res, null, 'Product deleted');
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'Product not found', 404); return; }
    next(e);
  }
});

// POST /products/:id/toggle-publish — admin toggle
r.post('/:id/toggle-publish', authenticate, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) { errorResponse(res, 'Product not found', 404); return; }
    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: { isPublished: !product.isPublished },
    });
    successResponse(res, updated);
  } catch (e) { next(e); }
});

export default r;
