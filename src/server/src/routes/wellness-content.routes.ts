import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/roles.middleware';
import { successResponse, errorResponse } from '../utils/response.utils';
import wcService from '../services/wellness-content.service';

const r = Router();

// Safe parseInt with NaN guard
function safeInt(val: any): number | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  const n = parseInt(String(val), 10);
  return Number.isNaN(n) ? undefined : n;
}

// ═══════════════════════════════════════════════════════
// PUBLIC ROUTES (authenticated — content delivery)
// ═══════════════════════════════════════════════════════

// GET /wellness-content?type=phase_tip&phase=menstrual&goal=fertility
r.get('/', authenticate, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { type, phase, goal, dosha, week, category } = q.query as any;
    if (!type) { errorResponse(s, 'type parameter is required', 400); return; }
    const data = await wcService.getByType(type, {
      phase, goal, dosha,
      week: safeInt(week),
      category,
    });
    successResponse(s, data, 'Wellness content fetched');
  } catch (e) { n(e); }
});

// GET /wellness-content/bulk?types=phase_tip,wellness_tip&phase=menstrual&goal=fertility
r.get('/bulk', authenticate, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { types, phase, goal, dosha, week } = q.query as any;
    if (!types) { errorResponse(s, 'types parameter is required', 400); return; }
    const typeList = (types as string).split(',').map((t: string) => t.trim()).filter(Boolean);
    if (typeList.length === 0) { errorResponse(s, 'At least one type is required', 400); return; }
    if (typeList.length > 20) { errorResponse(s, 'Maximum 20 types per bulk request', 400); return; }
    const data = await wcService.getBulk(typeList, {
      phase, goal, dosha,
      week: safeInt(week),
    });
    successResponse(s, data, 'Bulk wellness content fetched');
  } catch (e) { n(e); }
});

// ═══════════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════════

// GET /wellness-content/admin — list all (paginated, filterable)
r.get('/admin', authenticate, requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { type, phase, goal, dosha, week, isActive, page, limit } = q.query as any;
    const data = await wcService.adminList({
      type, phase, goal, dosha,
      week: safeInt(week),
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      page: safeInt(page) || 1,
      limit: safeInt(limit) || 50,
    });
    successResponse(s, data, 'Admin wellness content list');
  } catch (e) { n(e); }
});

// POST /wellness-content/admin — create
r.post('/admin', authenticate, requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { type, key, body } = q.body;
    if (!type || !key || !body?.trim()) { errorResponse(s, 'type, key, and body are required', 400); return; }
    const data = await wcService.create(q.body);
    successResponse(s, data, 'Wellness content created');
  } catch (e: any) {
    if (e.code === 'P2002') { errorResponse(s, 'A content item with this type+key already exists', 409); return; }
    n(e);
  }
});

// PUT /wellness-content/admin/:id — update
r.put('/admin/:id', authenticate, requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const data = await wcService.update(q.params.id, q.body);
    successResponse(s, data, 'Wellness content updated');
  } catch (e: any) {
    if (e.message === 'Not found') { errorResponse(s, 'Content not found', 404); return; }
    if (e.code === 'P2002') { errorResponse(s, 'Duplicate type+key', 409); return; }
    n(e);
  }
});

// DELETE /wellness-content/admin/:id — delete
r.delete('/admin/:id', authenticate, requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    await wcService.delete(q.params.id);
    successResponse(s, { deleted: true }, 'Wellness content deleted');
  } catch (e: any) {
    if (e.message === 'Not found') { errorResponse(s, 'Content not found', 404); return; }
    n(e);
  }
});

// PATCH /wellness-content/admin/:id/toggle — toggle active
r.patch('/admin/:id/toggle', authenticate, requireAdmin, async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const data = await wcService.toggle(q.params.id);
    successResponse(s, data, 'Wellness content toggled');
  } catch (e: any) {
    if (e.message === 'Not found') { errorResponse(s, 'Content not found', 404); return; }
    n(e);
  }
});

export default r;
