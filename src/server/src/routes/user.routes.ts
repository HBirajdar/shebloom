// ═══ routes/user.routes.ts ═══
import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { UserService } from '../services/user.service';
import { PrismaClient } from '@prisma/client';

const router = Router();
const svc = new UserService();
const prisma = new PrismaClient();
router.use(authenticate);

router.get('/me', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await svc.getProfile(req.user!.id) }); } catch (e) { next(e); }
});
router.put('/me', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await svc.updateUser(req.user!.id, req.body) }); } catch (e) { next(e); }
});
router.put('/me/profile', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await svc.updateProfile(req.user!.id, req.body) }); } catch (e) { next(e); }
});
router.get('/me/export', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await svc.exportData(req.user!.id) }); } catch (e) { next(e); }
});
router.delete('/me', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { await svc.deleteAccount(req.user!.id); res.json({ success: true, message: 'Account deleted' }); } catch (e) { next(e); }
});

// ─── Mobile OTP Verification (for adding mobile to email/google accounts) ───

router.post('/me/mobile/send-otp', async (req: AuthRequest, res: Response) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, error: 'Phone number is required' });

    // Check phone not already taken by another user
    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing && existing.id !== req.user!.id) {
      return res.status(400).json({ success: false, error: 'This mobile number is already registered to another account' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing OTP for this phone, then create fresh
    await prisma.otpStore.deleteMany({ where: { phone } });
    await prisma.otpStore.create({ data: { phone, otp, expiresAt } });

    // In production, send via SMS. For now log it.
    console.log(`[OTP] Mobile verification for user ${req.user!.id}: phone=${phone} otp=${otp}`);

    // TODO: Send SMS via Twilio/AWS SNS
    // await twilioClient.messages.create({ to: phone, from: process.env.TWILIO_PHONE, body: `Your VedaClue verification code: ${otp}` });

    return res.json({ success: true, message: 'OTP sent to mobile number', ...(process.env.NODE_ENV !== 'production' ? { otp } : {}) });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/me/mobile/confirm', async (req: AuthRequest, res: Response) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ success: false, error: 'Phone and OTP are required' });

    const record = await prisma.otpStore.findFirst({ where: { phone } });
    if (!record) return res.status(400).json({ success: false, error: 'No OTP found for this number. Please request a new one.' });
    if (record.expiresAt < new Date()) return res.status(400).json({ success: false, error: 'OTP has expired. Please request a new one.' });
    if (record.otp !== otp) return res.status(400).json({ success: false, error: 'Invalid OTP. Please try again.' });

    // Save phone to user account
    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: { phone },
      select: { id: true, fullName: true, email: true, phone: true, role: true, authProvider: true },
    });

    // Clean up OTP
    await prisma.otpStore.deleteMany({ where: { phone } }).catch(() => {});

    return res.json({ success: true, message: 'Mobile number verified and saved', data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
