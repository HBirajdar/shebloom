// ══════════════════════════════════════════════════════
// src/server/src/__tests__/setup.ts — Test Setup & Helpers
// ══════════════════════════════════════════════════════

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import app from '../app';
import prisma from '../config/database';

// ─── ENV SETUP ─────────────────────────────────────────

beforeAll(() => {
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'test-secret-for-vitest-32-chars-long';
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ─── TOKEN HELPER ──────────────────────────────────────

/**
 * Sign a JWT with the test secret.
 */
export function generateToken(userId: string, role: string): string {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET!,
    { algorithm: 'HS256', expiresIn: '1h' },
  );
}

// ─── USER FACTORY HELPERS ──────────────────────────────

/**
 * Create a regular USER in the database with unique email/phone.
 * Returns the user record, an access token, and a refresh token.
 */
export async function createTestUser() {
  const uid = crypto.randomUUID();
  const user = await prisma.user.create({
    data: {
      email: `testuser-${uid}@test.vedaclue.com`,
      phone: `+1${uid.replace(/-/g, '').slice(0, 10)}`,
      fullName: `Test User ${uid.slice(0, 8)}`,
      passwordHash: 'hashed-password-placeholder',
      role: 'USER',
      isVerified: true,
      isActive: true,
    },
  });

  const token = generateToken(user.id, user.role);
  const refreshToken = jwt.sign(
    { userId: user.id, role: user.role, type: 'refresh' },
    process.env.JWT_SECRET!,
    { algorithm: 'HS256', expiresIn: '7d' },
  );

  return { user, token, refreshToken };
}

/**
 * Create an ADMIN role user in the database.
 * Returns the user record and an access token.
 */
export async function createAdminUser() {
  const uid = crypto.randomUUID();
  const user = await prisma.user.create({
    data: {
      email: `admin-${uid}@test.vedaclue.com`,
      phone: `+2${uid.replace(/-/g, '').slice(0, 10)}`,
      fullName: `Admin User ${uid.slice(0, 8)}`,
      passwordHash: 'hashed-password-placeholder',
      role: 'ADMIN',
      isVerified: true,
      isActive: true,
    },
  });

  const token = generateToken(user.id, user.role);

  return { user, token };
}

/**
 * Create a DOCTOR role user in the database.
 * Returns the user record and an access token.
 */
export async function createDoctorUser() {
  const uid = crypto.randomUUID();
  const user = await prisma.user.create({
    data: {
      email: `doctor-${uid}@test.vedaclue.com`,
      phone: `+3${uid.replace(/-/g, '').slice(0, 10)}`,
      fullName: `Doctor User ${uid.slice(0, 8)}`,
      passwordHash: 'hashed-password-placeholder',
      role: 'DOCTOR',
      isVerified: true,
      isActive: true,
    },
  });

  const token = generateToken(user.id, user.role);

  return { user, token };
}

// ─── RE-EXPORTS ────────────────────────────────────────

export { app, prisma };
