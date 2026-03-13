import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../config/database';
import { cacheSet, cacheGet, cacheDel, cacheIncr } from '../config/redis';
import { logger } from '../config/logger';
import { AppError } from '../middleware/errorHandler';

interface RegisterInput { fullName: string; email?: string; password?: string; phone?: string; }

// ─── In-memory OTP store (fallback when Redis unavailable) ──
// Clears automatically since entries include expiry timestamps
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

function otpSet(key: string, otp: string, ttlSeconds: number) {
  otpStore.set(key, { otp, expiresAt: Date.now() + ttlSeconds * 1000 });
  // Auto-cleanup after TTL
  setTimeout(() => otpStore.delete(key), ttlSeconds * 1000);
}

function otpGet(key: string): string | null {
  const entry = otpStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { otpStore.delete(key); return null; }
  return entry.otp;
}

function otpDel(key: string) { otpStore.delete(key); }

// Strip +91 / 91 prefix and validate → always store/lookup as 10 digits
function normalizePhone(raw: string): string {
  const digits = raw.replace(/^\+?91/, '').replace(/\D/g, '');
  if (digits.length !== 10 || !/^[6-9]/.test(digits)) {
    throw new AppError('Enter a valid 10-digit Indian mobile number (6-9 start)', 400);
  }
  return digits;
}

// Phone numbers that should always have ADMIN role
const ADMIN_PHONES = ['9405424185'];

export class AuthService {
  private generateTokens(userId: string, role: string) {
    const accessToken = jwt.sign({ userId, role }, process.env.JWT_SECRET!, { expiresIn: process.env.JWT_EXPIRY || '15m' } as any);
    const refreshToken = jwt.sign({ userId, role, type: 'refresh' }, process.env.JWT_REFRESH_SECRET!, { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' } as any);
    return { accessToken, refreshToken };
  }

  async register(input: RegisterInput) {
    const { fullName, email, password, phone } = input;
    if (email) { const e = await prisma.user.findUnique({ where: { email } }); if (e) throw new AppError('Email already registered', 409); }
    if (phone) { const p = await prisma.user.findUnique({ where: { phone } }); if (p) throw new AppError('Phone already registered', 409); }
    const passwordHash = password ? await bcrypt.hash(password, parseInt(process.env.BCRYPT_SALT_ROUNDS || '12')) : undefined;
    const user = await prisma.user.create({
      data: { fullName, email, phone, passwordHash, authProvider: phone ? 'PHONE' : 'EMAIL', profile: { create: {} } },
      select: { id: true, fullName: true, email: true, phone: true, role: true, authProvider: true },
    });
    const tokens = this.generateTokens(user.id, user.role);
    await prisma.refreshToken.create({ data: { userId: user.id, token: tokens.refreshToken, expiresAt: new Date(Date.now() + 7*24*60*60*1000) } });
    await prisma.auditLog.create({ data: { userId: user.id, action: 'register', resource: 'user', resourceId: user.id } });
    logger.info(`User registered: ${user.id}`);
    return { user, ...tokens };
  }

  async loginWithEmail(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, fullName: true, email: true, passwordHash: true, role: true, isActive: true, authProvider: true } });
    if (!user || !user.passwordHash) throw new AppError('Invalid credentials', 401);
    if (!user.isActive) throw new AppError('Account deactivated', 403);
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) throw new AppError('Invalid credentials', 401);
    const tokens = this.generateTokens(user.id, user.role);
    await prisma.refreshToken.create({ data: { userId: user.id, token: tokens.refreshToken, expiresAt: new Date(Date.now() + 7*24*60*60*1000) } });
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const { passwordHash: _, ...safe } = user;
    return { user: safe, ...tokens };
  }

  async sendOtp(phone: string): Promise<{ smsSent: boolean }> {
    const normalized = normalizePhone(phone);

    // Per-phone rate limit: max 5 OTP requests per 15 minutes
    const attempts = await cacheIncr(`otp_rate:${normalized}`, 900);
    if (attempts > 5) throw new AppError('Too many OTP requests. Please try again after 15 minutes.', 429);

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    // Store in all three layers: Redis → in-memory → DB
    await cacheSet(`otp:${normalized}`, otp, 300);
    otpSet(`otp:${normalized}`, otp, 300);
    await prisma.otpStore.deleteMany({ where: { phone: normalized } }).catch(() => {});
    await prisma.otpStore.create({ data: { phone: normalized, otp, expiresAt } }).catch(() => {});
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[OTP] Sending to: ${normalized}, OTP: ${otp}`);
    }
    const twilioReady = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
    if (twilioReady) {
      try {
        const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        await twilio.messages.create({ body: `Your VedaClue OTP: ${otp}. Valid for 5 minutes.`, from: process.env.TWILIO_PHONE_NUMBER, to: `+91${normalized}` });
        logger.info(`OTP sent via Twilio to +91${normalized}`);
        return { smsSent: true };
      } catch (err: any) {
        logger.error(`Twilio send failed for ${normalized}: ${err.message}`);
      }
    }
    logger.info(`[NO-SMS] OTP for +91${normalized}: ${otp}`);
    return { smsSent: false };
  }

  async verifyOtp(phone: string, otp: string) {
    const normalized = normalizePhone(phone);
    // Try Redis → in-memory → DB (in that priority order)
    let stored = await cacheGet<string>(`otp:${normalized}`);
    if (!stored) stored = otpGet(`otp:${normalized}`);
    if (!stored) {
      // DB fallback — look up without expiry filter so we can give the right error
      const dbOtp = await prisma.otpStore.findFirst({ where: { phone: normalized }, orderBy: { createdAt: 'desc' } }).catch(() => null);
      if (dbOtp) {
        if (dbOtp.expiresAt < new Date()) throw new AppError('OTP has expired. Please request a new one.', 400);
        stored = dbOtp.otp;
      }
    }
    if (!stored) throw new AppError('OTP not found. Please request a new one.', 400);
    if (stored !== otp) throw new AppError('Incorrect OTP. Please try again.', 400);
    // Clear used OTP from all stores
    await cacheDel(`otp:${normalized}`);
    otpDel(`otp:${normalized}`);
    await prisma.otpStore.deleteMany({ where: { phone: normalized } }).catch(() => {});
    // Find or create user
    const isAdmin = ADMIN_PHONES.includes(normalized);
    let user = await prisma.user.findUnique({ where: { phone: normalized }, select: { id: true, fullName: true, email: true, phone: true, role: true, authProvider: true } });
    const isNew = !user;
    if (!user) {
      user = await prisma.user.create({ data: { phone: normalized, fullName: 'User', authProvider: 'PHONE', isVerified: true, ...(isAdmin ? { role: 'ADMIN' } : {}), profile: { create: {} } }, select: { id: true, fullName: true, email: true, phone: true, role: true, authProvider: true } });
    } else {
      const updateData: any = { isVerified: true, lastLoginAt: new Date() };
      if (isAdmin && user.role !== 'ADMIN') updateData.role = 'ADMIN';
      user = await prisma.user.update({ where: { id: user.id }, data: updateData, select: { id: true, fullName: true, email: true, phone: true, role: true, authProvider: true } });
    }
    const tokens = this.generateTokens(user.id, user.role);
    await prisma.refreshToken.create({ data: { userId: user.id, token: tokens.refreshToken, expiresAt: new Date(Date.now() + 7*24*60*60*1000) } });
    return { user, ...tokens, isNewUser: isNew };
  }

  async refreshAccessToken(refreshToken: string) {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { userId: string; role: string };
    const stored = await prisma.refreshToken.findFirst({ where: { token: refreshToken, isRevoked: false, expiresAt: { gt: new Date() } } });
    if (!stored) throw new AppError('Invalid refresh token', 401);
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { isRevoked: true } });
    const tokens = this.generateTokens(decoded.userId, decoded.role);
    await prisma.refreshToken.create({ data: { userId: decoded.userId, token: tokens.refreshToken, expiresAt: new Date(Date.now() + 7*24*60*60*1000) } });
    return tokens;
  }

  async logout(userId: string) {
    await prisma.refreshToken.updateMany({ where: { userId }, data: { isRevoked: true } });
  }

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return;
    const token = jwt.sign({ userId: user.id, type: 'reset' }, process.env.JWT_SECRET!, { expiresIn: '1h' } as any);
    await cacheSet(`reset:${user.id}`, token, 3600);
    logger.info(`Password reset for: ${email}`);
  }

  async loginWithGoogle(idToken: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) throw new AppError('Google Sign-In is not configured', 500);
    let payload: any;
    // Try as ID token first, then as access token
    try {
      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({ idToken, audience: clientId });
      payload = ticket.getPayload();
    } catch {
      // Might be an access token — verify via Google userinfo API
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (!res.ok) throw new Error('Invalid token');
        payload = await res.json();
        // Map userinfo fields to match ID token payload shape
        payload.name = payload.name || `${payload.given_name || ''} ${payload.family_name || ''}`.trim();
      } catch {
        throw new AppError('Invalid Google token', 401);
      }
    }
    if (!payload?.email) throw new AppError('Google account has no email', 400);
    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: payload.email },
      select: { id: true, fullName: true, email: true, phone: true, role: true, isActive: true, authProvider: true },
    });
    const isNew = !user;
    if (user) {
      if (!user.isActive) throw new AppError('Account deactivated', 403);
      // Update name/avatar if missing
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date(), authProvider: 'GOOGLE', avatarUrl: payload.picture || undefined },
      });
    } else {
      user = await prisma.user.create({
        data: {
          fullName: payload.name || payload.email.split('@')[0],
          email: payload.email,
          authProvider: 'GOOGLE',
          isVerified: true,
          avatarUrl: payload.picture || null,
          profile: { create: {} },
        },
        select: { id: true, fullName: true, email: true, phone: true, role: true, isActive: true, authProvider: true },
      });
    }
    const tokens = this.generateTokens(user.id, user.role);
    await prisma.refreshToken.create({ data: { userId: user.id, token: tokens.refreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
    logger.info(`Google login: ${user.email} (${isNew ? 'new' : 'existing'})`);
    const { isActive: _, ...safe } = user as any;
    return { user: safe, ...tokens, isNewUser: isNew };
  }

  async resetPassword(token: string, newPassword: string) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; type: string };
    if (decoded.type !== 'reset') throw new AppError('Invalid reset token', 400);
    const stored = await cacheGet(`reset:${decoded.userId}`);
    if (stored !== token) throw new AppError('Token expired', 400);
    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: decoded.userId }, data: { passwordHash: hash } });
    await cacheDel(`reset:${decoded.userId}`);
  }
}
