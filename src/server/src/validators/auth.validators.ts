import { z } from 'zod';
export const registerSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email().optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/).optional(),
  password: z.string().min(8).max(128).optional(),
}).refine(d => d.email || d.phone, { message: 'Email or phone required' });
export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
export const otpSendSchema = z.object({ phone: z.string().regex(/^[6-9]\d{9}$/) });
export const otpVerifySchema = z.object({ phone: z.string().regex(/^[6-9]\d{9}$/), otp: z.string().length(4) });
export const refreshTokenSchema = z.object({ refreshToken: z.string().min(1) });
