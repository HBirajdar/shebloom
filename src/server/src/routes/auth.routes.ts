// ══════════════════════════════════════════════════════
// routes/auth.routes.ts
// ══════════════════════════════════════════════════════
import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema, otpSendSchema, otpVerifySchema, refreshTokenSchema } from '../validators/auth.validators';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const auth = new AuthService();

router.post('/register', validate(registerSchema), async (req: Request, res: Response, next: NextFunction) => {
  try { const r = await auth.register(req.body); res.status(201).json({ success: true, data: r }); } catch (e) { next(e); }
});

router.post('/login', validate(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try { const r = await auth.loginWithEmail(req.body.email, req.body.password); res.json({ success: true, data: r }); } catch (e) { next(e); }
});

router.post('/otp/send', validate(otpSendSchema), async (req: Request, res: Response, next: NextFunction) => {
  try { await auth.sendOtp(req.body.phone); res.json({ success: true, message: 'OTP sent' }); } catch (e) { next(e); }
});

router.post('/otp/verify', validate(otpVerifySchema), async (req: Request, res: Response, next: NextFunction) => {
  try { const r = await auth.verifyOtp(req.body.phone, req.body.otp); res.json({ success: true, data: r }); } catch (e) { next(e); }
});

router.post('/refresh', validate(refreshTokenSchema), async (req: Request, res: Response, next: NextFunction) => {
  try { const r = await auth.refreshAccessToken(req.body.refreshToken); res.json({ success: true, data: r }); } catch (e) { next(e); }
});

router.post('/logout', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { await auth.logout(req.user!.id); res.json({ success: true, message: 'Logged out' }); } catch (e) { next(e); }
});

router.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  try { await auth.forgotPassword(req.body.email); res.json({ success: true, message: 'Reset email sent if account exists' }); } catch (e) { next(e); }
});

router.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try { await auth.resetPassword(req.body.token, req.body.password); res.json({ success: true, message: 'Password reset' }); } catch (e) { next(e); }
});

export default router;
