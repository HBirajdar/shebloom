// ── VALIDATORS (src/server/src/validators/) ─────────
import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(100),
    email: z.string().email().optional(),
    phone: z.string().regex(/^[6-9]\d{9}$/).optional(),
    password: z.string().min(8).max(128).optional(),
  }).refine(d => d.email || d.phone, { message: 'Email or phone required' }),
});

export const loginSchema = z.object({
  body: z.object({ email: z.string().email(), password: z.string().min(1) }),
});

export const otpSendSchema = z.object({
  body: z.object({ phone: z.string().regex(/^[6-9]\d{9}$/) }),
});

export const otpVerifySchema = z.object({
  body: z.object({ phone: z.string().regex(/^[6-9]\d{9}$/), otp: z.string().length(4) }),
});

export const refreshSchema = z.object({
  body: z.object({ refreshToken: z.string().min(1) }),
});

export const moodLogSchema = z.object({
  body: z.object({
    mood: z.enum(['GREAT','GOOD','OKAY','LOW','BAD']),
    notes: z.string().max(500).optional(),
  }),
});

export const symptomLogSchema = z.object({
  body: z.object({
    symptoms: z.array(z.string()).min(1),
    severity: z.number().int().min(1).max(10).optional(),
  }),
});

export const appointmentSchema = z.object({
  body: z.object({
    doctorId: z.string(),
    scheduledAt: z.string().datetime(),
    type: z.enum(['consultation','follow_up','emergency']).optional(),
    notes: z.string().max(500).optional(),
  }),
});
