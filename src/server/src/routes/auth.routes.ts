// ══════════════════════════════════════════════════════
// routes/auth.routes.ts
// ══════════════════════════════════════════════════════
import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema, otpSendSchema, otpVerifySchema, refreshTokenSchema, forgotPasswordSchema, resetPasswordSchema } from '../validators/auth.validators';
import { authenticate, AuthRequest } from '../middleware/auth';
import { successResponse } from '../utils/response.utils';

const router = Router();
const auth = new AuthService();

router.post('/register', validate(registerSchema), async (req: Request, res: Response, next: NextFunction) => {
  try { successResponse(res, await auth.register(req.body), 'Registration successful', 201); } catch (e) { next(e); }
});

router.post('/login', validate(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try { successResponse(res, await auth.loginWithEmail(req.body.email, req.body.password), 'Login successful'); } catch (e) { next(e); }
});

router.post('/otp/send', validate(otpSendSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await auth.sendOtp(req.body.phone);
    successResponse(res, {
      smsSent: result.smsSent,
    }, result.smsSent ? 'OTP sent via SMS' : 'OTP generated (SMS unavailable)');
  } catch (e) { next(e); }
});

router.post('/otp/verify', validate(otpVerifySchema), async (req: Request, res: Response, next: NextFunction) => {
  try { successResponse(res, await auth.verifyOtp(req.body.phone, req.body.otp), 'OTP verified'); } catch (e) { next(e); }
});

router.post('/refresh', validate(refreshTokenSchema), async (req: Request, res: Response, next: NextFunction) => {
  try { successResponse(res, await auth.refreshAccessToken(req.body.refreshToken), 'Token refreshed'); } catch (e) { next(e); }
});

router.post('/logout', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { await auth.logout(req.user!.id); successResponse(res, null, 'Logged out'); } catch (e) { next(e); }
});

router.post('/google', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { idToken } = req.body;
    if (!idToken) { res.status(400).json({ success: false, error: 'idToken is required' }); return; }
    successResponse(res, await auth.loginWithGoogle(idToken), 'Google login successful');
  } catch (e) { next(e); }
});

router.post('/forgot-password', validate(forgotPasswordSchema), async (req: Request, res: Response, next: NextFunction) => {
  try { await auth.forgotPassword(req.body.email); successResponse(res, null, 'Reset email sent if account exists'); } catch (e) { next(e); }
});

router.post('/reset-password', validate(resetPasswordSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.body;
    await auth.resetPassword(token, password);
    successResponse(res, null, 'Password reset');
  } catch (e) { next(e); }
});

export default router;
