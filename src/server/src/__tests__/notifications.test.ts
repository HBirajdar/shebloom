// ══════════════════════════════════════════════════════
// src/server/src/__tests__/notifications.test.ts
// Tests for /api/v1/notifications endpoints
// ══════════════════════════════════════════════════════

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app, prisma, createTestUser, generateToken } from './setup';

const BASE = '/api/v1/notifications';

// ─── GET /vapid-key (public) ─────────────────────────

describe('GET /api/v1/notifications/vapid-key', () => {
  it('returns 200 or 503 depending on VAPID config', async () => {
    const res = await request(app).get(`${BASE}/vapid-key`);
    expect([200, 503]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('publicKey');
    } else {
      expect(res.body.success).toBe(false);
    }
  });
});

// ─── GET / (list notifications) ──────────────────────

describe('GET /api/v1/notifications', () => {
  let token: string;

  beforeAll(async () => {
    const t = await createTestUser();
    token = t.token;
  });

  it('returns 200 with notifications array and unreadCount when authenticated', async () => {
    const res = await request(app)
      .get(BASE)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(typeof res.body.unreadCount).toBe('number');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });
});

// ─── GET /preferences ───────────────────────────────

describe('GET /api/v1/notifications/preferences', () => {
  let token: string;

  beforeAll(async () => {
    const t = await createTestUser();
    token = t.token;
  });

  it('returns 200 and auto-creates default preferences when authenticated', async () => {
    const res = await request(app)
      .get(`${BASE}/preferences`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('pushEnabled');
    expect(res.body.data).toHaveProperty('periodReminder');
    expect(res.body.data).toHaveProperty('waterReminder');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get(`${BASE}/preferences`);
    expect(res.status).toBe(401);
  });
});

// ─── PUT /preferences ───────────────────────────────

describe('PUT /api/v1/notifications/preferences', () => {
  let token: string;

  beforeAll(async () => {
    const t = await createTestUser();
    token = t.token;
  });

  it('returns 200 for a valid update (waterReminder: false)', async () => {
    const res = await request(app)
      .put(`${BASE}/preferences`)
      .set('Authorization', `Bearer ${token}`)
      .send({ waterReminder: false });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.waterReminder).toBe(false);
  });

  it('returns 400 for invalid periodReminderDays (10)', async () => {
    const res = await request(app)
      .put(`${BASE}/preferences`)
      .set('Authorization', `Bearer ${token}`)
      .send({ periodReminderDays: 10 });

    expect(res.status).toBe(400);
    expect(res.body.message || res.body.error).toMatch(/periodReminderDays must be 1-7/i);
  });

  it('returns 400 for invalid waterIntervalHours (10)', async () => {
    const res = await request(app)
      .put(`${BASE}/preferences`)
      .set('Authorization', `Bearer ${token}`)
      .send({ waterIntervalHours: 10 });

    expect(res.status).toBe(400);
    expect(res.body.message || res.body.error).toMatch(/waterIntervalHours must be 0\.5-6/i);
  });

  it('returns 400 for invalid waterStartHour (25)', async () => {
    const res = await request(app)
      .put(`${BASE}/preferences`)
      .set('Authorization', `Bearer ${token}`)
      .send({ waterStartHour: 25 });

    expect(res.status).toBe(400);
    expect(res.body.message || res.body.error).toMatch(/waterStartHour must be 0-23/i);
  });

  it('returns 400 for invalid moodReminderHour (-1)', async () => {
    const res = await request(app)
      .put(`${BASE}/preferences`)
      .set('Authorization', `Bearer ${token}`)
      .send({ moodReminderHour: -1 });

    expect(res.status).toBe(400);
    expect(res.body.message || res.body.error).toMatch(/moodReminderHour must be 0-23/i);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .put(`${BASE}/preferences`)
      .send({ waterReminder: false });

    expect(res.status).toBe(401);
  });
});

// ─── PUT /read-all ──────────────────────────────────

describe('PUT /api/v1/notifications/read-all', () => {
  let token: string;

  beforeAll(async () => {
    const t = await createTestUser();
    token = t.token;
  });

  it('returns 200 when authenticated', async () => {
    const res = await request(app)
      .put(`${BASE}/read-all`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).put(`${BASE}/read-all`);
    expect(res.status).toBe(401);
  });
});

// ─── POST /subscribe ────────────────────────────────

describe('POST /api/v1/notifications/subscribe', () => {
  let token: string;

  beforeAll(async () => {
    const t = await createTestUser();
    token = t.token;
  });

  it('returns 400 when subscription.endpoint is missing', async () => {
    const res = await request(app)
      .post(`${BASE}/subscribe`)
      .set('Authorization', `Bearer ${token}`)
      .send({ subscription: {} });

    expect(res.status).toBe(400);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post(`${BASE}/subscribe`)
      .send({ subscription: { endpoint: 'https://example.com' } });

    expect(res.status).toBe(401);
  });
});
