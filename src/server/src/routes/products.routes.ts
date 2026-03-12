// ══════════════════════════════════════════════════════
// Product Routes — Ayurveda E-Commerce (Zepto/Flipkart/Forest Essentials grade)
// Search, filters, reviews, wishlist, dosha recommendations, related products
// ══════════════════════════════════════════════════════

import { Router, Response, NextFunction, Request } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/roles.middleware';
import { successResponse, errorResponse } from '../utils/response.utils';

const r = Router();

// ═══════════════════════════════════════════════════════
// PUBLIC ENDPOINTS (no auth)
// ═══════════════════════════════════════════════════════

// GET /products — Advanced search, filter, sort (like Zepto/Flipkart)
r.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, featured, search, minPrice, maxPrice, inStock, dosha,
            sort, limit, offset, skinType, certification } = req.query;

    const where: any = { isPublished: true };

    // Category filter
    if (category) where.category = category;
    if (featured === 'true') where.isFeatured = true;

    // Search (name + description + ingredients + benefits + tags)
    if (search) {
      const term = String(search).trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { tags: { has: term.toLowerCase() } },
        { ingredients: { has: term } },
        { bestFor: { has: term.toLowerCase() } },
      ];
    }

    // Price range filter
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = Number(minPrice);
      if (maxPrice) where.price.lte = Number(maxPrice);
    }

    // In-stock filter
    if (inStock === 'true') { where.inStock = true; where.stock = { gt: 0 }; }

    // Dosha filter (like Forest Essentials "Shop by Dosha")
    if (dosha) where.doshaTypes = { has: String(dosha).toUpperCase() };

    // Skin type filter
    if (skinType) where.skinType = skinType;

    // Certification filter
    if (certification) where.certifications = { has: String(certification) };

    // Sort options
    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'price_asc') orderBy = { price: 'asc' };
    else if (sort === 'price_desc') orderBy = { price: 'desc' };
    else if (sort === 'rating') orderBy = { rating: 'desc' };
    else if (sort === 'newest') orderBy = { createdAt: 'desc' };
    else if (sort === 'popular') orderBy = { reviews: 'desc' };
    else if (sort === 'name') orderBy = { name: 'asc' };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where, orderBy,
        take: Math.min(Math.max(Number(limit) || 50, 1), 100),
        skip: Math.max(Number(offset) || 0, 0),
      }),
      prisma.product.count({ where }),
    ]);

    successResponse(res, { products, total });
  } catch (e) { next(e); }
});

// GET /products/search/suggestions — Quick search autocomplete
r.get('/search/suggestions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q || q.length < 2) { successResponse(res, []); return; }

    const products = await prisma.product.findMany({
      where: {
        isPublished: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { tags: { has: q.toLowerCase() } },
        ],
      },
      select: { id: true, name: true, category: true, price: true, discountPrice: true, imageUrl: true, emoji: true },
      take: 8,
      orderBy: { rating: 'desc' },
    });
    successResponse(res, products);
  } catch (e) { next(e); }
});

// GET /products/by-dosha/:dosha — Dosha-based recommendations (like Forest Essentials)
r.get('/by-dosha/:dosha', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doshaType = req.params.dosha.toUpperCase();
    const validDoshas = ['VATA', 'PITTA', 'KAPHA', 'VATA_PITTA', 'PITTA_KAPHA', 'VATA_KAPHA', 'TRIDOSHIC'];
    if (!validDoshas.includes(doshaType)) { errorResponse(res, 'Invalid dosha type', 400); return; }

    // Find products tagged for this dosha
    const products = await prisma.product.findMany({
      where: {
        isPublished: true,
        doshaTypes: { has: doshaType },
      },
      orderBy: { rating: 'desc' },
      take: 20,
    });

    // Also find products for dual doshas (e.g., VATA also matches VATA_PITTA)
    const primaryDosha = doshaType.split('_')[0];
    const dualMatches = doshaType.includes('_') ? [] : await prisma.product.findMany({
      where: {
        isPublished: true,
        doshaTypes: { has: primaryDosha },
        id: { notIn: products.map(p => p.id) },
      },
      orderBy: { rating: 'desc' },
      take: 10,
    });

    successResponse(res, { exact: products, related: dualMatches, dosha: doshaType });
  } catch (e) { next(e); }
});

// GET /products/:id/related — Related products (same category + similar tags)
r.get('/:id/related', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) { errorResponse(res, 'Product not found', 404); return; }

    // Same category (excluding self)
    const related = await prisma.product.findMany({
      where: {
        isPublished: true,
        id: { not: product.id },
        OR: [
          { category: product.category },
          { doshaTypes: { hasSome: product.doshaTypes } },
          { tags: { hasSome: product.tags } },
        ],
      },
      orderBy: { rating: 'desc' },
      take: 6,
    });

    successResponse(res, related);
  } catch (e) { next(e); }
});

// GET /products/:id/reviews — Public: list reviews for a product
r.get('/:id/reviews', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sort: sortBy, rating: filterRating } = req.query;
    const where: any = { productId: req.params.id, isApproved: true };
    if (filterRating) where.rating = Number(filterRating);

    let orderBy: any = { createdAt: 'desc' };
    if (sortBy === 'helpful') orderBy = { helpfulCount: 'desc' };
    else if (sortBy === 'rating_high') orderBy = { rating: 'desc' };
    else if (sortBy === 'rating_low') orderBy = { rating: 'asc' };

    const [reviews, stats] = await Promise.all([
      prisma.productReview.findMany({
        where, orderBy,
        take: Math.min(Math.max(Number(req.query.limit) || 20, 1), 50),
        skip: Math.max(Number(req.query.offset) || 0, 0),
        include: { user: { select: { fullName: true, avatarUrl: true } } },
      }),
      prisma.productReview.groupBy({
        by: ['rating'],
        where: { productId: req.params.id, isApproved: true },
        _count: true,
      }),
    ]);

    // Build rating breakdown (5→1)
    const breakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const s of stats) breakdown[Math.round(s.rating)] = (breakdown[Math.round(s.rating)] || 0) + s._count;
    const totalReviews = Object.values(breakdown).reduce((a, b) => a + b, 0);
    const avgRating = totalReviews > 0 ? stats.reduce((s, r) => s + r.rating * r._count, 0) / totalReviews : 0;

    successResponse(res, { reviews, breakdown, totalReviews, avgRating: Math.round(avgRating * 10) / 10 });
  } catch (e) { next(e); }
});

// GET /products/all — admin only, all products
r.get('/all', authenticate, requireAdmin, async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const products = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } });
    successResponse(res, products);
  } catch (e) { next(e); }
});

// ─── Wishlist (needs auth but specific path so must be before /:id) ──

// GET /products/wishlist/mine — Get user's wishlist
r.get('/wishlist/mine', authenticate, async (q: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.wishlistItem.findMany({
      where: { userId: q.user!.id },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
    successResponse(res, items);
  } catch (e) { next(e); }
});

// GET /products/wishlist/ids — Get just the product IDs in wishlist
r.get('/wishlist/ids', authenticate, async (q: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.wishlistItem.findMany({
      where: { userId: q.user!.id },
      select: { productId: true },
    });
    successResponse(res, items.map(i => i.productId));
  } catch (e) { next(e); }
});

// POST /products/wishlist/toggle — Add/remove from wishlist
r.post('/wishlist/toggle', authenticate, async (q: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { productId } = q.body;
    const uid = q.user!.id;
    if (!productId) { errorResponse(res, 'Product ID required', 400); return; }

    const existing = await prisma.wishlistItem.findUnique({ where: { userId_productId: { userId: uid, productId } } });
    if (existing) {
      await prisma.wishlistItem.delete({ where: { id: existing.id } });
      successResponse(res, { wishlisted: false }, 'Removed from wishlist');
    } else {
      await prisma.wishlistItem.create({ data: { userId: uid, productId } });
      successResponse(res, { wishlisted: true }, 'Added to wishlist');
    }
  } catch (e) { next(e); }
});

// GET /products/recommendations/for-me — Personalized recommendations
r.get('/recommendations/for-me', authenticate, async (q: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const uid = q.user!.id;
    const profile = await prisma.userProfile.findUnique({ where: { userId: uid } });
    const doshaType = profile?.doshaType || null;

    const pastOrders = await prisma.orderItem.findMany({
      where: { order: { userId: uid, paymentStatus: { in: ['PAID', 'PENDING_COD'] } } },
      select: { productId: true },
    });
    const purchasedIds = [...new Set(pastOrders.map(o => o.productId))];

    const results: any = {};

    if (doshaType) {
      const primaryDosha = doshaType.split('_')[0];
      results.forYourDosha = await prisma.product.findMany({
        where: { isPublished: true, inStock: true, doshaTypes: { hasSome: [doshaType, primaryDosha] }, id: { notIn: purchasedIds } },
        orderBy: { rating: 'desc' }, take: 8,
      });
    }
    if (purchasedIds.length > 0) {
      results.buyAgain = await prisma.product.findMany({
        where: { id: { in: purchasedIds }, isPublished: true, inStock: true }, take: 6,
      });
    }
    results.trending = await prisma.product.findMany({
      where: { isPublished: true, inStock: true, id: { notIn: purchasedIds } },
      orderBy: { reviews: 'desc' }, take: 8,
    });
    results.newArrivals = await prisma.product.findMany({
      where: { isPublished: true, inStock: true }, orderBy: { createdAt: 'desc' }, take: 6,
    });

    successResponse(res, { ...results, doshaType });
  } catch (e) { next(e); }
});

// GET /products/:id — public, single product (with review summary)
// MUST be after all specific paths to avoid catching /all, /wishlist, etc.
r.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { productReviews: true } } },
    });
    if (!product) { errorResponse(res, 'Product not found', 404); return; }
    successResponse(res, product);
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════
// AUTHENTICATED ENDPOINTS (remaining)
// ═══════════════════════════════════════════════════════

r.use(authenticate);

// ─── Reviews (authenticated) ──

// POST /products/:id/reviews — Submit a review
r.post('/:id/reviews', async (q: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const uid = q.user!.id;
    const productId = q.params.id;
    const { rating, title, comment, images } = q.body;

    if (!rating || rating < 1 || rating > 5) { errorResponse(res, 'Rating must be 1-5', 400); return; }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) { errorResponse(res, 'Product not found', 404); return; }

    // Check if already reviewed
    const existing = await prisma.productReview.findUnique({ where: { productId_userId: { productId, userId: uid } } });
    if (existing) { errorResponse(res, 'You have already reviewed this product', 400); return; }

    // Check if user actually purchased this product (verified purchase)
    const hasPurchased = await prisma.orderItem.findFirst({
      where: {
        productId,
        order: { userId: uid, paymentStatus: { in: ['PAID', 'PENDING_COD'] } },
      },
    });

    const review = await prisma.productReview.create({
      data: {
        productId, userId: uid, rating: Number(rating),
        title: title || null, comment: comment || null,
        isVerifiedPurchase: !!hasPurchased,
        images: Array.isArray(images) ? images : [],
      },
      include: { user: { select: { fullName: true, avatarUrl: true } } },
    });

    // Update product aggregate rating
    const agg = await prisma.productReview.aggregate({
      where: { productId, isApproved: true },
      _avg: { rating: true }, _count: true,
    });
    await prisma.product.update({
      where: { id: productId },
      data: { rating: Math.round((agg._avg.rating || 5) * 10) / 10, reviews: agg._count },
    });

    successResponse(res, review, 'Review submitted', 201);
  } catch (e) { next(e); }
});

// PUT /products/:id/reviews — Update own review
r.put('/:id/reviews', async (q: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const uid = q.user!.id;
    const productId = q.params.id;
    const { rating, title, comment, images } = q.body;

    const review = await prisma.productReview.findUnique({ where: { productId_userId: { productId, userId: uid } } });
    if (!review) { errorResponse(res, 'Review not found', 404); return; }

    const data: any = {};
    if (rating !== undefined) { if (rating < 1 || rating > 5) { errorResponse(res, 'Rating must be 1-5', 400); return; } data.rating = Number(rating); }
    if (title !== undefined) data.title = title;
    if (comment !== undefined) data.comment = comment;
    if (images !== undefined) data.images = images;

    const updated = await prisma.productReview.update({
      where: { id: review.id }, data,
      include: { user: { select: { fullName: true, avatarUrl: true } } },
    });

    // Re-aggregate
    const agg = await prisma.productReview.aggregate({
      where: { productId, isApproved: true },
      _avg: { rating: true }, _count: true,
    });
    await prisma.product.update({
      where: { id: productId },
      data: { rating: Math.round((agg._avg.rating || 5) * 10) / 10, reviews: agg._count },
    });

    successResponse(res, updated, 'Review updated');
  } catch (e) { next(e); }
});

// POST /products/:id/reviews/helpful — Mark review as helpful
r.post('/:id/reviews/helpful', async (q: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { reviewId } = q.body;
    if (!reviewId) { errorResponse(res, 'Review ID required', 400); return; }
    await prisma.productReview.update({ where: { id: reviewId }, data: { helpfulCount: { increment: 1 } } });
    successResponse(res, null, 'Marked as helpful');
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════
// ADMIN ENDPOINTS
// ═══════════════════════════════════════════════════════

// POST /products — admin create
r.post('/', requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      name, category, price, discountPrice, description, ingredients, benefits,
      howToUse, size, emoji, targetAudience, tags, imageUrl, galleryImages, videoUrl,
      ownerEmail, ownerPhone, doshaTypes, bestFor, skinType, preparationMethod,
      shelfLife, certifications, weight, stock,
    } = req.body;

    const parseArr = (v: any) => Array.isArray(v) ? v : (v || '').split(',').map((s: string) => s.trim()).filter(Boolean);

    const product = await prisma.product.create({
      data: {
        name, category,
        price: Number(price) || 0,
        discountPrice: discountPrice ? Number(discountPrice) : null,
        description: description || '',
        ingredients: parseArr(ingredients),
        benefits: parseArr(benefits),
        howToUse: howToUse || '', size: size || '',
        emoji: emoji || '🌿',
        targetAudience: Array.isArray(targetAudience) ? targetAudience : ['all'],
        tags: parseArr(tags),
        imageUrl: imageUrl || null,
        galleryImages: Array.isArray(galleryImages) ? galleryImages : [],
        videoUrl: videoUrl || null,
        ownerEmail: ownerEmail || null, ownerPhone: ownerPhone || null,
        doshaTypes: parseArr(doshaTypes),
        bestFor: parseArr(bestFor),
        skinType: skinType || null,
        preparationMethod: preparationMethod || null,
        shelfLife: shelfLife || null,
        certifications: parseArr(certifications),
        weight: weight || null,
        stock: Number(stock) || 0,
      },
    });
    successResponse(res, product, 'Product created', 201);
  } catch (e) { next(e); }
});

// PUT /products/:id — admin update
r.put('/:id', requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data: any = {};

    const stringFields = ['name', 'category', 'description', 'howToUse', 'size', 'emoji', 'imageUrl', 'videoUrl',
                           'skinType', 'preparationMethod', 'shelfLife', 'weight'];
    for (const f of stringFields) {
      if (req.body[f] !== undefined) data[f] = req.body[f] || null;
    }

    if (req.body.price !== undefined) data.price = Number(req.body.price);
    if (req.body.discountPrice !== undefined) data.discountPrice = req.body.discountPrice ? Number(req.body.discountPrice) : null;
    if (req.body.stock !== undefined) data.stock = Number(req.body.stock);
    if (req.body.inStock !== undefined) data.inStock = req.body.inStock;
    if (req.body.isPublished !== undefined) data.isPublished = req.body.isPublished;
    if (req.body.isFeatured !== undefined) data.isFeatured = req.body.isFeatured;

    const parseArr = (v: any) => Array.isArray(v) ? v : (v || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    const arrFields = ['ingredients', 'benefits', 'tags', 'doshaTypes', 'bestFor', 'certifications'];
    for (const f of arrFields) {
      if (req.body[f] !== undefined) data[f] = parseArr(req.body[f]);
    }
    if (req.body.targetAudience !== undefined) data.targetAudience = req.body.targetAudience;
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
r.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    successResponse(res, null, 'Product deleted');
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'Product not found', 404); return; }
    next(e);
  }
});

// POST /products/:id/toggle-publish — admin toggle
r.post('/:id/toggle-publish', requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) { errorResponse(res, 'Product not found', 404); return; }
    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: { isPublished: !product.isPublished, publishedAt: !product.isPublished ? new Date() : null },
    });
    successResponse(res, updated);
  } catch (e) { next(e); }
});

// DELETE /products/reviews/:reviewId — admin delete review
r.delete('/reviews/:reviewId', requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const review = await prisma.productReview.findUnique({ where: { id: req.params.reviewId } });
    if (!review) { errorResponse(res, 'Review not found', 404); return; }
    await prisma.productReview.delete({ where: { id: req.params.reviewId } });

    // Re-aggregate product rating
    const agg = await prisma.productReview.aggregate({
      where: { productId: review.productId, isApproved: true },
      _avg: { rating: true }, _count: true,
    });
    await prisma.product.update({
      where: { id: review.productId },
      data: { rating: Math.round((agg._avg.rating || 5) * 10) / 10, reviews: agg._count },
    });

    successResponse(res, null, 'Review deleted');
  } catch (e) { next(e); }
});

// PUT /products/reviews/:reviewId/reply — admin reply to review
r.put('/reviews/:reviewId/reply', requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { reply } = req.body;
    const review = await prisma.productReview.update({
      where: { id: req.params.reviewId },
      data: { adminReply: reply || null },
    });
    successResponse(res, review, 'Reply added');
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'Review not found', 404); return; }
    next(e);
  }
});

export default r;
