// ══════════════════════════════════════════════════════
// AUTH ROUTES & CONTROLLER
// Files: src/server/src/routes/auth.routes.ts
//        src/server/src/controllers/auth.controller.ts
//        src/server/src/services/auth.service.ts
// ══════════════════════════════════════════════════════

// ── routes/auth.routes.ts ────────────────────────────
import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema, otpSendSchema, otpVerifySchema, refreshSchema } from '../validators/auth.validators';

const router = Router();
const authController = new AuthController();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, email, password]
 *             properties:
 *               fullName: { type: string, example: "Priya Sharma" }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *     responses:
 *       201: { description: User registered successfully }
 *       409: { description: User already exists }
 */
router.post('/register', validate(registerSchema), authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 */
router.post('/login', validate(loginSchema), authController.login);

/**
 * @swagger
 * /auth/otp/send:
 *   post:
 *     summary: Send OTP to phone number
 *     tags: [Auth]
 */
router.post('/otp/send', validate(otpSendSchema), authController.sendOtp);
router.post('/otp/verify', validate(otpVerifySchema), authController.verifyOtp);
router.post('/refresh', validate(refreshSchema), authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/google', authController.googleAuth);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

export default router;


// ── controllers/auth.controller.ts ───────────────────
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { AppError } from '../middleware/errorHandler';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { fullName, email, password, phone } = req.body;
      const result = await authService.register({ fullName, email, password, phone });
      res.status(201).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await authService.loginWithEmail(email, password);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async sendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone } = req.body;
      await authService.sendOtp(phone);
      res.json({ success: true, message: 'OTP sent successfully' });
    } catch (error) { next(error); }
  }

  async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, otp } = req.body;
      const result = await authService.verifyOtp(phone, otp);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshAccessToken(refreshToken);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token) await authService.logout(token);
      res.json({ success: true, message: 'Logged out' });
    } catch (error) { next(error); }
  }

  async googleAuth(req: Request, res: Response, next: NextFunction) {
    try {
      const { idToken } = req.body;
      const result = await authService.loginWithGoogle(idToken);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.forgotPassword(req.body.email);
      res.json({ success: true, message: 'Reset email sent' });
    } catch (error) { next(error); }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.resetPassword(req.body.token, req.body.password);
      res.json({ success: true, message: 'Password reset successful' });
    } catch (error) { next(error); }
  }
}


// ── services/auth.service.ts ─────────────────────────
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { cacheSet, cacheGet, cacheDel } from '../config/redis';
import { logger } from '../config/logger';

interface RegisterInput {
  fullName: string;
  email?: string;
  password?: string;
  phone?: string;
}

export class AuthService {
  private generateTokens(userId: string, role: string) {
    const accessToken = jwt.sign(
      { userId, role },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRY || '15m' }
    );
    const refreshToken = jwt.sign(
      { userId, role, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
    );
    return { accessToken, refreshToken };
  }

  async register(input: RegisterInput) {
    const { fullName, email, password, phone } = input;

    // Check existing user
    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) throw new AppError('Email already registered', 409);
    }
    if (phone) {
      const existing = await prisma.user.findUnique({ where: { phone } });
      if (existing) throw new AppError('Phone already registered', 409);
    }

    // Hash password
    const passwordHash = password ? await bcrypt.hash(password, parseInt(process.env.BCRYPT_SALT_ROUNDS || '12')) : undefined;

    // Create user with profile
    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        phone,
        passwordHash,
        authProvider: phone ? 'PHONE' : 'EMAIL',
        profile: { create: {} },
      },
      select: { id: true, fullName: true, email: true, phone: true, role: true },
    });

    const tokens = this.generateTokens(user.id, user.role);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: { userId: user.id, action: 'register', resource: 'user', resourceId: user.id },
    });

    logger.info(`User registered: ${user.id}`);
    return { user, ...tokens };
  }

  async loginWithEmail(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, fullName: true, email: true, passwordHash: true, role: true, isActive: true },
    });

    if (!user || !user.passwordHash) throw new AppError('Invalid credentials', 401);
    if (!user.isActive) throw new AppError('Account is deactivated', 403);

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) throw new AppError('Invalid credentials', 401);

    const tokens = this.generateTokens(user.id, user.role);

    await prisma.refreshToken.create({
      data: { userId: user.id, token: tokens.refreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const { passwordHash: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, ...tokens };
  }

  async sendOtp(phone: string) {
    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Store OTP in Redis with 5 min TTL
    await cacheSet(`otp:${phone}`, otp, 300);

    // In production, send via Twilio
    if (process.env.NODE_ENV === 'production' && process.env.TWILIO_ACCOUNT_SID) {
      const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await twilio.messages.create({
        body: `Your SheBloom verification code is: ${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: `+91${phone}`,
      });
    } else {
      logger.info(`DEV OTP for ${phone}: ${otp}`);
    }

    return true;
  }

  async verifyOtp(phone: string, otp: string) {
    const storedOtp = await cacheGet(`otp:${phone}`);
    if (!storedOtp || storedOtp !== otp) throw new AppError('Invalid or expired OTP', 400);

    await cacheDel(`otp:${phone}`);

    // Find or create user
    let user = await prisma.user.findUnique({ where: { phone }, select: { id: true, fullName: true, phone: true, role: true } });

    if (!user) {
      user = await prisma.user.create({
        data: { phone, fullName: 'User', authProvider: 'PHONE', isVerified: true, profile: { create: {} } },
        select: { id: true, fullName: true, phone: true, role: true },
      });
    } else {
      await prisma.user.update({ where: { id: user.id }, data: { isVerified: true, lastLoginAt: new Date() } });
    }

    const tokens = this.generateTokens(user.id, user.role);
    await prisma.refreshToken.create({
      data: { userId: user.id, token: tokens.refreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });

    return { user, ...tokens, isNewUser: !user.fullName || user.fullName === 'User' };
  }

  async refreshAccessToken(refreshToken: string) {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { userId: string; role: string };

    const stored = await prisma.refreshToken.findFirst({
      where: { token: refreshToken, isRevoked: false, expiresAt: { gt: new Date() } },
    });
    if (!stored) throw new AppError('Invalid refresh token', 401);

    // Revoke old token and issue new pair
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { isRevoked: true } });

    const tokens = this.generateTokens(decoded.userId, decoded.role);
    await prisma.refreshToken.create({
      data: { userId: decoded.userId, token: tokens.refreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });

    return tokens;
  }

  async logout(token: string) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      await prisma.refreshToken.updateMany({ where: { userId: decoded.userId }, data: { isRevoked: true } });
    } catch { /* token already expired, that's fine */ }
  }

  async loginWithGoogle(idToken: string) {
    // Verify Google ID token (simplified — use google-auth-library in production)
    // const ticket = await googleClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
    // const payload = ticket.getPayload();
    // ... find or create user based on payload.email
    throw new AppError('Google auth not yet configured', 501);
  }

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return; // Don't reveal if email exists
    const resetToken = jwt.sign({ userId: user.id, type: 'reset' }, process.env.JWT_SECRET!, { expiresIn: '1h' });
    await cacheSet(`reset:${user.id}`, resetToken, 3600);
    // Send email with SendGrid
    logger.info(`Password reset requested for: ${email}`);
  }

  async resetPassword(token: string, newPassword: string) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; type: string };
    if (decoded.type !== 'reset') throw new AppError('Invalid reset token', 400);
    const storedToken = await cacheGet(`reset:${decoded.userId}`);
    if (storedToken !== token) throw new AppError('Token expired or already used', 400);
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: decoded.userId }, data: { passwordHash } });
    await cacheDel(`reset:${decoded.userId}`);
  }
}
