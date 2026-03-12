// ═══ routes/user.routes.ts ═══
import { Router, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { authenticate, AuthRequest } from '../middleware/auth';
import { UserService } from '../services/user.service';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/response.utils';

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

// ─── Mobile OTP Verification (for adding mobile to email/google accounts) ───

router.post('/me/mobile/send-otp', async (req: AuthRequest, res: Response) => {
  try {
    const { phone } = req.body;
    if (!phone) { errorResponse(res, 'Phone number is required', 400); return; }

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
