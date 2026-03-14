import prisma from '../config/database';
import { cacheGet, cacheSet, cacheDelPattern } from '../config/redis';

const CACHE_TTL = 3600; // 1 hour
const CACHE_EMPTY_TTL = 300; // 5 min for empty results (prevents cache stampede)
const CACHE_PREFIX = 'wc:';

const VALID_TYPES = new Set([
  'phase_tip', 'wellness_tip', 'phase_routine', 'phase_yoga', 'phase_tip_wisdom',
  'challenge', 'affirmation', 'self_care_breath', 'journal_prompt', 'self_care',
  'dosha_remedy', 'pregnancy_week',
]);

const MAX_BULK_TYPES = 20;

function safeInt(val: any, fallback?: number): number | undefined {
  if (val === undefined || val === null || val === '') return fallback;
  const n = parseInt(String(val), 10);
  return Number.isNaN(n) ? fallback : n;
}

function cacheKey(type: string, filters: Record<string, string | number | undefined>): string {
  const parts = [CACHE_PREFIX, type];
  if (filters.phase) parts.push(String(filters.phase));
  if (filters.goal) parts.push(String(filters.goal));
  if (filters.dosha) parts.push(String(filters.dosha));
  if (filters.week !== undefined) parts.push(String(filters.week));
  if (filters.category) parts.push(String(filters.category));
  return parts.join(':');
}

class WellnessContentService {
  // ─── Public: fetch content by type + filters ─────────────
  async getByType(type: string, filters: {
    phase?: string;
    goal?: string;
    dosha?: string;
    week?: number;
    category?: string;
  } = {}): Promise<any[]> {
    const key = cacheKey(type, filters);

    try {
      // Layer 1: Redis cache (including cached empty results)
      const cached = await cacheGet<any[]>(key);
      if (cached !== null && cached !== undefined) return cached;

      // Layer 2: Database
      const where: any = { type, isActive: true };
      if (filters.phase) where.phase = filters.phase;
      if (filters.goal) where.goal = filters.goal;
      if (filters.dosha) where.dosha = filters.dosha;
      if (filters.week !== undefined) where.week = filters.week;
      if (filters.category) where.category = filters.category;

      const rows = await prisma.wellnessContent.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true, type: true, key: true, phase: true, goal: true, dosha: true,
          week: true, category: true, emoji: true, title: true, body: true,
          metadata: true, sortOrder: true, sourceReference: true,
        },
      });

      // Cache both non-empty and empty results (empty with shorter TTL)
      await cacheSet(key, rows, rows.length > 0 ? CACHE_TTL : CACHE_EMPTY_TTL);
      return rows;
    } catch (e) {
      console.warn('[WellnessContent] DB/cache failed, frontend will use hardcoded fallback:', (e as any)?.message);
    }

    // Layer 3: Return empty — frontend has hardcoded fallback
    return [];
  }

  // ─── Public: fetch all content for a page in one call ─────
  async getBulk(types: string[], filters: {
    phase?: string;
    goal?: string;
    dosha?: string;
    week?: number;
  } = {}): Promise<Record<string, any[]>> {
    // Limit types to prevent DoS
    const safeTypes = types.slice(0, MAX_BULK_TYPES);
    const result: Record<string, any[]> = {};
    await Promise.all(safeTypes.map(async (type) => {
      result[type] = await this.getByType(type, filters);
    }));
    return result;
  }

  // ─── Admin: list all (paginated, filterable) ──────────────
  async adminList(params: {
    type?: string;
    phase?: string;
    goal?: string;
    dosha?: string;
    week?: number;
    isActive?: boolean;
    page?: number;
    limit?: number;
  } = {}): Promise<{ items: any[]; total: number }> {
    const where: any = {};
    if (params.type) where.type = params.type;
    if (params.phase) where.phase = params.phase;
    if (params.goal) where.goal = params.goal;
    if (params.dosha) where.dosha = params.dosha;
    if (params.week !== undefined) where.week = params.week;
    if (params.isActive !== undefined) where.isActive = params.isActive;

    const page = Math.max(params.page || 1, 1);
    const limit = Math.min(Math.max(params.limit || 50, 1), 200);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.wellnessContent.findMany({
        where,
        orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.wellnessContent.count({ where }),
    ]);

    return { items, total };
  }

  // ─── Admin: create ────────────────────────────────────────
  async create(data: any): Promise<any> {
    const row = await prisma.wellnessContent.create({
      data: {
        type: data.type,
        key: data.key,
        phase: data.phase || null,
        goal: data.goal || null,
        dosha: data.dosha || null,
        week: safeInt(data.week, undefined) ?? null,
        category: data.category || null,
        emoji: data.emoji || null,
        title: data.title || null,
        body: data.body,
        metadata: data.metadata || null,
        sortOrder: safeInt(data.sortOrder, 0) ?? 0,
        isActive: data.isActive === true || data.isActive === 'true',
        sourceReference: data.sourceReference || 'Admin-created',
      },
    });
    await this.invalidateCache(data.type);
    return row;
  }

  // ─── Admin: update ────────────────────────────────────────
  async update(id: string, data: any): Promise<any> {
    const existing = await prisma.wellnessContent.findUnique({ where: { id } });
    if (!existing) throw new Error('Not found');

    const update: any = {};
    if (data.type !== undefined) update.type = data.type;
    if (data.key !== undefined) update.key = data.key;
    if (data.phase !== undefined) update.phase = data.phase || null;
    if (data.goal !== undefined) update.goal = data.goal || null;
    if (data.dosha !== undefined) update.dosha = data.dosha || null;
    if (data.week !== undefined) update.week = data.week !== null ? (safeInt(data.week, undefined) ?? null) : null;
    if (data.category !== undefined) update.category = data.category || null;
    if (data.emoji !== undefined) update.emoji = data.emoji || null;
    if (data.title !== undefined) update.title = data.title || null;
    if (data.body !== undefined) update.body = data.body;
    if (data.metadata !== undefined) update.metadata = data.metadata;
    if (data.sortOrder !== undefined) update.sortOrder = safeInt(data.sortOrder, 0) ?? 0;
    if (data.isActive !== undefined) update.isActive = data.isActive === true || data.isActive === 'true';

    const row = await prisma.wellnessContent.update({ where: { id }, data: update });
    await this.invalidateCache(existing.type);
    if (data.type && data.type !== existing.type) await this.invalidateCache(data.type);
    return row;
  }

  // ─── Admin: delete ────────────────────────────────────────
  async delete(id: string): Promise<void> {
    const existing = await prisma.wellnessContent.findUnique({ where: { id } });
    if (!existing) throw new Error('Not found');
    await prisma.wellnessContent.delete({ where: { id } });
    await this.invalidateCache(existing.type);
  }

  // ─── Admin: toggle active ─────────────────────────────────
  async toggle(id: string): Promise<any> {
    const existing = await prisma.wellnessContent.findUnique({ where: { id } });
    if (!existing) throw new Error('Not found');
    const row = await prisma.wellnessContent.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });
    await this.invalidateCache(existing.type);
    return row;
  }

  // ─── Cache invalidation ───────────────────────────────────
  private async invalidateCache(type: string): Promise<void> {
    try {
      await cacheDelPattern(`${CACHE_PREFIX}${type}*`);
    } catch {
      // Redis unavailable — cache will expire naturally
    }
  }

  // ─── Validate type (used by routes) ─────────────────────
  isValidType(type: string): boolean {
    return VALID_TYPES.has(type);
  }
}

export default new WellnessContentService();
