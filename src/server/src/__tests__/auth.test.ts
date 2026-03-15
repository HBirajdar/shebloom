import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app, prisma, createTestUser, generateToken } from './setup';

const API = '/api/v1/auth';

describe('POST /api/v1/auth/register', () => {
  const uniqueEmail = () => `test_register_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`;

  it('valid email + password → 201, returns accessToken + refreshToken + user', async () => {
    const email = uniqueEmail();
    const res = await request(app)
      .post(`${API}/register`)
      .send({ fullName: 'Test User', email, password: 'Password123!' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data).toHaveProperty('user');
    expect(res.body.data.user.email).toBe(email);

    // Cleanup
    await prisma.user.delete({ where: { email } }).catch(() => {});
  });

  it('duplicate email → 409', async () => {
    const email = uniqueEmail();
    // Register first
    await request(app)
      .post(`${API}/register`)
      .send({ fullName: 'First User', email, password: 'Password123!' });

    // Try duplicate
    const res = await request(app)
      .post(`${API}/register`)
      .send({ fullName: 'Second User', email, password: 'Password456!' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);

    // Cleanup
    await prisma.user.delete({ where: { email } }).catch(() => {});
  });

  it('missing fullName → 400 (Zod validation)', async () => {
    const res = await request(app)
      .post(`${API}/register`)
      .send({ email: uniqueEmail(), password: 'Password123!' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Validation failed');
  });

  it('password too short (<8 chars) → 400', async () => {
    const res = await request(app)
      .post(`${API}/register`)
      .send({ fullName: 'Test User', email: uniqueEmail(), password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('missing both email and phone → 400', async () => {
    const res = await request(app)
      .post(`${API}/register`)
      .send({ fullName: 'Test User', password: 'Password123!' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/v1/auth/login', () => {
  const loginEmail = `test_login_${Date.now()}@test.com`;
  const loginPassword = 'ValidPassword123!';

  beforeAll(async () => {
    await request(app)
      .post(`${API}/register`)
      .send({ fullName: 'Login Test', email: loginEmail, password: loginPassword });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { email: loginEmail } }).catch(() => {});
  });

  it('valid credentials → 200, has accessToken', async () => {
    const res = await request(app)
      .post(`${API}/login`)
      .send({ email: loginEmail, password: loginPassword });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
  });

  it('wrong password → 401', async () => {
    const res = await request(app)
      .post(`${API}/login`)
      .send({ email: loginEmail, password: 'WrongPassword!' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('non-existent email → 401', async () => {
    const res = await request(app)
      .post(`${API}/login`)
      .send({ email: 'nonexistent@nowhere.com', password: 'Whatever123!' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('missing email → 400', async () => {
    const res = await request(app)
      .post(`${API}/login`)
      .send({ password: 'Whatever123!' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/v1/auth/otp/send', () => {
  it('valid phone (10 digits starting 6-9) → 200', async () => {
    const res = await request(app)
      .post(`${API}/otp/send`)
      .send({ phone: '9876543210' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('invalid phone format → 400', async () => {
    const res = await request(app)
      .post(`${API}/otp/send`)
      .send({ phone: '1234567890' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/v1/auth/otp/verify', () => {
  it('wrong OTP → 400 "Incorrect OTP"', async () => {
    // First send an OTP so there is a record
    await request(app)
      .post(`${API}/otp/send`)
      .send({ phone: '9876543211' });

    const res = await request(app)
      .post(`${API}/otp/verify`)
      .send({ phone: '9876543211', otp: '000000' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('missing phone → 400', async () => {
    const res = await request(app)
      .post(`${API}/otp/verify`)
      .send({ otp: '123456' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('with valid token → 200', async () => {
    const { user, token } = await createTestUser();

    const res = await request(app)
      .post(`${API}/logout`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Cleanup
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  });

  it('without token → 401', async () => {
    const res = await request(app)
      .post(`${API}/logout`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/v1/auth/forgot-password', () => {
  it('valid email → 200 (always succeeds, does not reveal if email exists)', async () => {
    const res = await request(app)
      .post(`${API}/forgot-password`)
      .send({ email: 'anyone@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('invalid email format → 400', async () => {
    const res = await request(app)
      .post(`${API}/forgot-password`)
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
