// ══════════════════════════════════════════════════════
// src/server/src/__tests__/admin.test.ts
// Tests for /api/v1/wellness-content admin & public endpoints
// ══════════════════════════════════════════════════════

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { app, prisma, createTestUser, createAdminUser, generateToken } from './setup';

const BASE = '/api/v1/wellness-content';

// ─── GET /wellness-content/admin ────────────────────

describe('GET /api/v1/wellness-content/admin', () => {
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    const admin = await createAdminUser();
    adminToken = admin.token;
    const user = await createTestUser();
    userToken = user.token;
  });

  it('returns 200 with paginated data for admin user', async () => {
    const res = await request(app)
      .get(`${BASE}/admin`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('returns 403 for regular user', async () => {
    const res = await request(app)
      .get(`${BASE}/admin`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get(`${BASE}/admin`);
    expect(res.status).toBe(401);
  });
});

// ─── POST /wellness-content/admin ───────────────────

describe('POST /api/v1/wellness-content/admin', () => {
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    const admin = await createAdminUser();
    adminToken = admin.token;
    const user = await createTestUser();
    userToken = user.token;
  });

  it('returns 200 when admin creates content with valid fields', async () => {
    const uniqueKey = `test-key-${crypto.randomUUID().slice(0, 8)}`;
    const res = await request(app)
      .post(`${BASE}/admin`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'phase_tip',
        key: uniqueKey,
        body: 'This is a test wellness tip for the menstrual phase.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.type).toBe('phase_tip');
    expect(res.body.data.key).toBe(uniqueKey);
  });

  it('returns 400 when required fields are missing (type, key, body)', async () => {
    const res = await request(app)
      .post(`${BASE}/admin`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'phase_tip' });

    expect(res.status).toBe(400);
    expect(res.body.message || res.body.error).toMatch(/type.*key.*body.*required/i);
  });

  it('returns 403 for regular user', async () => {
    const res = await request(app)
      .post(`${BASE}/admin`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        type: 'phase_tip',
        key: 'blocked-key',
        body: 'Should not be created.',
      });

    expect(res.status).toBe(403);
  });

  it('returns 409 for duplicate type+key', async () => {
    const uniqueKey = `dup-key-${crypto.randomUUID().slice(0, 8)}`;
    const payload = {
      type: 'phase_tip',
      key: uniqueKey,
      body: 'First item.',
    };

    // Create the first one
    await request(app)
      .post(`${BASE}/admin`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    // Attempt duplicate
    const res = await request(app)
      .post(`${BASE}/admin`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(res.status).toBe(409);
    expect(res.body.message || res.body.error).toMatch(/already exists/i);
  });
});

// ─── GET /wellness-content?type=phase_tip ───────────

describe('GET /api/v1/wellness-content?type=...', () => {
  let token: string;

  beforeAll(async () => {
    const t = await createTestUser();
    token = t.token;
  });

  it('returns 200 for a valid type query', async () => {
    const res = await request(app)
      .get(`${BASE}?type=phase_tip`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('returns 400 when type parameter is missing', async () => {
    const res = await request(app)
      .get(BASE)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.message || res.body.error).toMatch(/type.*required/i);
  });

  it('returns 400 for an invalid type', async () => {
    const res = await request(app)
      .get(`${BASE}?type=nonexistent_type`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.message || res.body.error).toMatch(/invalid/i);
  });
});
