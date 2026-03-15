import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app, prisma, createTestUser, generateToken } from './setup';

const API = '/api/v1/users';

describe('GET /api/v1/users/me', () => {
  it('with valid token → 200, returns user data', async () => {
    const { user, token } = await createTestUser();

    const res = await request(app)
      .get(`${API}/me`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id', user.id);

    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  });

  it('without token → 401', async () => {
    const res = await request(app).get(`${API}/me`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('with invalid token → 401', async () => {
    const res = await request(app)
      .get(`${API}/me`)
      .set('Authorization', 'Bearer invalid.jwt.token');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('with expired token → 401', async () => {
    const { user } = await createTestUser();
    const expiredToken = jwt.sign(
      { userId: user.id, role: 'USER' },
      process.env.JWT_SECRET!,
      { algorithm: 'HS256', expiresIn: '-1h' } as jwt.SignOptions,
    );

    const res = await request(app)
      .get(`${API}/me`)
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);

    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  });
});

describe('PUT /api/v1/users/me', () => {
  it('update fullName → 200', async () => {
    const { user, token } = await createTestUser();

    const res = await request(app)
      .put(`${API}/me`)
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  });

  it('invalid dateOfBirth → 500 (Prisma rejects invalid date)', async () => {
    const { user, token } = await createTestUser();

    const res = await request(app)
      .put(`${API}/me`)
      .set('Authorization', `Bearer ${token}`)
      .send({ dateOfBirth: 'not-a-real-date' });

    expect(res.status).toBe(500);

    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  });

  it('extra unknown field → 400 (schema is strict)', async () => {
    const { user, token } = await createTestUser();

    const res = await request(app)
      .put(`${API}/me`)
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'Valid Name', unknownField: 'should fail' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);

    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  });
});

describe('PUT /api/v1/users/me/profile', () => {
  it('update cycleLength → 200', async () => {
    const { user, token } = await createTestUser();

    const res = await request(app)
      .put(`${API}/me/profile`)
      .set('Authorization', `Bearer ${token}`)
      .send({ cycleLength: 28 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  });

  it('cycleLength out of range (100) → 400', async () => {
    const { user, token } = await createTestUser();

    const res = await request(app)
      .put(`${API}/me/profile`)
      .set('Authorization', `Bearer ${token}`)
      .send({ cycleLength: 100 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);

    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  });

  it('periodLength out of range (15) → 400', async () => {
    const { user, token } = await createTestUser();

    const res = await request(app)
      .put(`${API}/me/profile`)
      .set('Authorization', `Bearer ${token}`)
      .send({ periodLength: 15 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);

    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  });
});

describe('GET /api/v1/users/me/export', () => {
  it('with valid token → 200, returns user data with profile', async () => {
    const { user, token } = await createTestUser();

    const res = await request(app)
      .get(`${API}/me/export`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  });
});

describe('DELETE /api/v1/users/me', () => {
  it('creates a disposable user and deletes → 200', async () => {
    const { user, token } = await createTestUser();

    const res = await request(app)
      .delete(`${API}/me`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify user is gone
    const deleted = await prisma.user.findUnique({ where: { id: user.id } });
    expect(deleted).toBeNull();
  });
});
