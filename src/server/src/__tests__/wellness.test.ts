// ══════════════════════════════════════════════════════
// Wellness API Tests
// ══════════════════════════════════════════════════════

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app, prisma, createTestUser, generateToken } from './setup';

// ─── Shared state ────────────────────────────────────

let token: string;
let userId: string;

beforeAll(async () => {
  const t = await createTestUser();
  token = t.token;
  userId = t.user.id;
});

// ═════════════════════════════════════════════════════
// GET /api/v1/wellness
// ═════════════════════════════════════════════════════

describe('GET /api/v1/wellness', () => {
  it('returns 200 with an array (public endpoint)', async () => {
    const res = await request(app).get('/api/v1/wellness');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('returns 200 with category filter', async () => {
    const res = await request(app)
      .get('/api/v1/wellness')
      .query({ category: 'yoga' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ═════════════════════════════════════════════════════
// GET /api/v1/wellness/daily-score
// ═════════════════════════════════════════════════════

describe('GET /api/v1/wellness/daily-score', () => {
  it('returns 200 with score object and components when authenticated', async () => {
    const res = await request(app)
      .get('/api/v1/wellness/daily-score')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('score');
    expect(res.body.data).toHaveProperty('components');
    expect(res.body.data.components).toHaveProperty('mood');
    expect(res.body.data.components).toHaveProperty('water');
    expect(res.body.data.components).toHaveProperty('sleep');
    expect(res.body.data.components).toHaveProperty('exercise');
    expect(res.body.data.components).toHaveProperty('symptoms');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/v1/wellness/daily-score');

    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════
// POST /api/v1/wellness/log
// ═════════════════════════════════════════════════════

describe('POST /api/v1/wellness/log', () => {
  it('returns 200 for a valid water log', async () => {
    const res = await request(app)
      .post('/api/v1/wellness/log')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'water', value: 5 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('returns 200 for a valid sleep log', async () => {
    const res = await request(app)
      .post('/api/v1/wellness/log')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'sleep', value: 7 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('returns 400 when type is missing', async () => {
    const res = await request(app)
      .post('/api/v1/wellness/log')
      .set('Authorization', `Bearer ${token}`)
      .send({ value: 5 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for an invalid type', async () => {
    const res = await request(app)
      .post('/api/v1/wellness/log')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'meditation', value: 5 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for a value out of range', async () => {
    const res = await request(app)
      .post('/api/v1/wellness/log')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'water', value: -1 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/v1/wellness/log')
      .send({ type: 'water', value: 5 });

    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════
// GET /api/v1/wellness/history
// ═════════════════════════════════════════════════════

describe('GET /api/v1/wellness/history', () => {
  it('returns 200 with an array when authenticated', async () => {
    const res = await request(app)
      .get('/api/v1/wellness/history')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/v1/wellness/history');

    expect(res.status).toBe(401);
  });
});
