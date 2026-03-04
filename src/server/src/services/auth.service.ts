import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { cacheSet, cacheGet, cacheDel } from '../config/redis';
import { logger } from '../config/logger';
import { AppError } from '../middleware/errorHandler';

interface RegisterInput { fullName: string; email?: string; password?: string; phone?: string; }

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
      select: { id: true, fullName: true, email: true, phone: true, role: true },
    });
    const tokens = this.generateTokens(user.id, user.role);
    await prisma.refreshToken.create({ data: { userId: user.id, token: tokens.refreshToken, expiresAt: new Date(Date.now() + 7*24*60*60*1000) } });
    await prisma.auditLog.create({ data: { userId: user.id, action: 'register', resource: 'user', resourceId: user.id } });
    logger.info(`User registered: ${user.id}`);
    return { user, ...tokens };
  }

  async loginWithEmail(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, fullName: true, email: true, passwordHash: true, role: true, isActive: true } });
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

  async sendOtp(phone: string) {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    await cacheSet(`otp:${phone}`, otp, 300);
    if (process.env.NODE_ENV === 'production' && process.env.TWILIO_ACCOUNT_SID) {
      try {
        const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        await twilio.messages.create({ body: `Your SheBloom code: ${otp}`, from: process.env.TWILIO_PHONE_NUMBER, to: `+91${phone}` });
        logger.info(`OTP sent to +91${phone}`);
      } catch (err: any) {
        logger.error(`Twilio error for ${phone}: ${err.message}`);
        throw new AppError('Failed to send OTP. Please try again.', 500);
      }
    } else {
      logger.info(`[DEV] OTP for ${phone}: ${otp}`);
    }
  }

  async verifyOtp(phone: string, otp: string) {
    const stored = await cacheGet(`otp:${phone}`);
    if (!stored || stored !== otp) throw new AppError('Invalid or expired OTP', 400);
    await cacheDel(`otp:${phone}`);
    let user = await prisma.user.findUnique({ where: { phone }, select: { id: true, fullName: true, email: true, phone: true, role: true } });
    const isNew = !user;
    if (!user) {
      user = await prisma.user.create({ data: { phone, fullName: 'User', authProvider: 'PHONE', isVerified: true, profile: { create: {} } }, select: { id: true, fullName: true, email: true, phone: true, role: true } });
    } else { await prisma.user.update({ where: { id: user.id }, data: { isVerified: true, lastLoginAt: new Date() } }); }
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
