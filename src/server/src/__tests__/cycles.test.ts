// ══════════════════════════════════════════════════════
// Cycle API Tests
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
// POST /api/v1/cycles/log
// ═════════════════════════════════════════════════════

describe('POST /api/v1/cycles/log', () => {
  it('returns 201 with valid startDate', async () => {
    const res = await request(app)
      .post('/api/v1/cycles/log')
      .set('Authorization', `Bearer ${token}`)
      .send({ startDate: '2026-03-01' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('returns 400 when startDate is missing', async () => {
    const res = await request(app)
      .post('/api/v1/cycles/log')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for invalid startDate format', async () => {
    const res = await request(app)
      .post('/api/v1/cycles/log')
      .set('Authorization', `Bearer ${token}`)
      .send({ startDate: 'not-a-date' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for invalid endDate', async () => {
    const res = await request(app)
      .post('/api/v1/cycles/log')
      .set('Authorization', `Bearer ${token}`)
      .send({ startDate: '2026-03-01', endDate: 'bad-date' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for invalid flow value', async () => {
    const res = await request(app)
      .post('/api/v1/cycles/log')
      .set('Authorization', `Bearer ${token}`)
      .send({ startDate: '2026-03-01', flow: 'extreme' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for painLevel out of range', async () => {
    const res = await request(app)
      .post('/api/v1/cycles/log')
      .set('Authorization', `Bearer ${token}`)
      .send({ startDate: '2026-03-01', painLevel: 15 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/v1/cycles/log')
      .send({ startDate: '2026-03-01' });

    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════
// GET /api/v1/cycles
// ═════════════════════════════════════════════════════

describe('GET /api/v1/cycles', () => {
  it('returns 200 with an array', async () => {
    const res = await request(app)
      .get('/api/v1/cycles')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/v1/cycles');

    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════
// GET /api/v1/cycles/predict
// ═════════════════════════════════════════════════════

describe('GET /api/v1/cycles/predict', () => {
  it('returns 200 with no cycle history (fallback/empty predictions)', async () => {
    // Use a fresh user with no cycles
    const fresh = await createTestUser();
    const res = await request(app)
      .get('/api/v1/cycles/predict')
      .set('Authorization', `Bearer ${fresh.token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/v1/cycles/predict');

    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════
// POST /api/v1/cycles/symptoms
// ═════════════════════════════════════════════════════

describe('POST /api/v1/cycles/symptoms', () => {
  it('returns 201 with valid symptoms array and logDate', async () => {
    const res = await request(app)
      .post('/api/v1/cycles/symptoms')
      .set('Authorization', `Bearer ${token}`)
      .send({ symptoms: ['cramps', 'fatigue'], logDate: '2026-03-10T00:00:00.000Z' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('returns 400 when symptoms is missing', async () => {
    const res = await request(app)
      .post('/api/v1/cycles/symptoms')
      .set('Authorization', `Bearer ${token}`)
      .send({ logDate: '2026-03-10' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when symptoms is not an array', async () => {
    const res = await request(app)
      .post('/api/v1/cycles/symptoms')
      .set('Authorization', `Bearer ${token}`)
      .send({ symptoms: 'cramps', logDate: '2026-03-10' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when logDate is missing', async () => {
    const res = await request(app)
      .post('/api/v1/cycles/symptoms')
      .set('Authorization', `Bearer ${token}`)
      .send({ symptoms: ['cramps'] });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/v1/cycles/symptoms')
      .send({ symptoms: ['cramps'], logDate: '2026-03-10' });

    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════
// DELETE /api/v1/cycles/:id
// ═════════════════════════════════════════════════════

describe('DELETE /api/v1/cycles/:id', () => {
  it('returns an error for a non-existent id', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await request(app)
      .delete(`/api/v1/cycles/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);

    // Expect a non-success response (404, 400, or 500 depending on implementation)
    expect([400, 404, 500]).toContain(res.status);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).delete('/api/v1/cycles/some-id');

    expect(res.status).toBe(401);
  });
});
