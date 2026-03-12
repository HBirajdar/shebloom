// ═══ routes/user.routes.ts ═══
import { Router, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { authenticate, AuthRequest } from '../middleware/auth';
import { UserService } from '../services/user.service';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/response.utils';
import { sendOTPEmail } from '../services/email.service';

const router = Router();
const svc = new UserService();
router.use(authenticate);

router.get('/me', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { successResponse(res, await svc.getProfile(req.user!.id)); } catch (e) { next(e); }
});
router.put('/me', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { successResponse(res, await svc.updateUser(req.user!.id, req.body), 'Profile updated'); } catch (e) { next(e); }
});
router.put('/me/profile', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { successResponse(res, await svc.updateProfile(req.user!.id, req.body), 'Profile updated'); } catch (e) { next(e); }
});
router.get('/me/export', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { successResponse(res, await svc.exportData(req.user!.id)); } catch (e) { next(e); }
});
router.delete('/me', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { await svc.deleteAccount(req.user!.id); successResponse(res, null, 'Account deleted'); } catch (e) { next(e); }
});

// ─── Email Change Verification (OTP-based) ─────────────────────────────────

router.post('/me/email/send-otp', async (req: AuthRequest, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) { errorResponse(res, 'Email address is required', 400); return; }

    // Check caller's auth provider — email-auth users cannot change their login email
    const caller = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { authProvider: true, email: true } });
    if (caller?.authProvider === 'EMAIL') {
      errorResponse(res, 'Cannot change login email. Contact support.', 400);
      return;
    }

    // Check email not already taken by another user
    const existing = await prisma.user.findFirst({ where: { email, id: { not: req.user!.id } } });
    if (existing) { errorResponse(res, 'This email is already registered to another account', 400); return; }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP keyed by email (reuse otpStore table with phone field for email)
    await prisma.otpStore.deleteMany({ where: { phone: `email:${email}` } });
    await prisma.otpStore.create({ data: { phone: `email:${email}`, otp, expiresAt } });

    // Send OTP email
    try { await sendOTPEmail(email, otp); } catch (e: any) {
      console.error('[Email OTP] Send failed:', e.message);
    }

    console.log(`[OTP] Email verification for user ${req.user!.id}: email=${email} otp=${otp}`);

    successResponse(res, {
      ...(process.env.NODE_ENV !== 'production' ? { otp } : {}),
    }, 'Verification code sent to email');
  } catch (err: any) { errorResponse(res, err.message, 500); }
});

router.post('/me/email/confirm', async (req: AuthRequest, res: Response) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) { errorResponse(res, 'Email and OTP are required', 400); return; }

    const record = await prisma.otpStore.findFirst({ where: { phone: `email:${email}` } });
    if (!record) { errorResponse(res, 'No verification code found. Please request a new one.', 400); return; }
    if (record.expiresAt < new Date()) { errorResponse(res, 'Code has expired. Please request a new one.', 400); return; }
    if (record.otp !== otp) { errorResponse(res, 'Invalid code. Please try again.', 400); return; }

    // Save email to user account
    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: { email },
      select: { id: true, fullName: true, email: true, phone: true, role: true, authProvider: true },
    });

    // Clean up OTP
    await prisma.otpStore.deleteMany({ where: { phone: `email:${email}` } }).catch(() => {});

    successResponse(res, updated, 'Email verified and saved');
  } catch (err: any) { errorResponse(res, err.message, 500); }
});

// ─── Mobile OTP Verification (for adding mobile to email/google accounts) ───

router.post('/me/mobile/send-otp', async (req: AuthRequest, res: Response) => {
  try {
    const { phone } = req.body;
    if (!phone) { errorResponse(res, 'Phone number is required', 400); return; }

    // Phone-auth users cannot change their login phone
    const caller = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { authProvider: true } });
    if (caller?.authProvider === 'PHONE') {
      errorResponse(res, 'Cannot change login phone number. Contact support.', 400);
      return;
    }

    // Check phone not already taken by another user
    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing && existing.id !== req.user!.id) {
      errorResponse(res, 'This mobile number is already registered to another account', 400);
      return;
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing OTP for this phone, then create fresh
    await prisma.otpStore.deleteMany({ where: { phone } });
    await prisma.otpStore.create({ data: { phone, otp, expiresAt } });

    // In production, send via SMS. For now log it.
    console.log(`[OTP] Mobile verification for user ${req.user!.id}: phone=${phone} otp=${otp}`);

    // TODO: Send SMS via Twilio/AWS SNS

    successResponse(res, {
      ...(process.env.NODE_ENV !== 'production' ? { otp } : {}),
    }, 'OTP sent to mobile number');
  } catch (err: any) {
    errorResponse(res, err.message, 500);
  }
});

router.post('/me/mobile/confirm', async (req: AuthRequest, res: Response) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) { errorResponse(res, 'Phone and OTP are required', 400); return; }

    const record = await prisma.otpStore.findFirst({ where: { phone } });
    if (!record) { errorResponse(res, 'No OTP found for this number. Please request a new one.', 400); return; }
    if (record.expiresAt < new Date()) { errorResponse(res, 'OTP has expired. Please request a new one.', 400); return; }
    if (record.otp !== otp) { errorResponse(res, 'Invalid OTP. Please try again.', 400); return; }

    // Save phone to user account
    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: { phone },
      select: { id: true, fullName: true, email: true, phone: true, role: true, authProvider: true },
    });

    // Clean up OTP
    await prisma.otpStore.deleteMany({ where: { phone } }).catch(() => {});

    successResponse(res, updated, 'Mobile number verified and saved');
  } catch (err: any) {
    errorResponse(res, err.message, 500);
  }
});

export default router;
