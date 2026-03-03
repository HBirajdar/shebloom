import { z } from 'zod';
export const createAppointmentSchema = z.object({ doctorId: z.string(), scheduledAt: z.string(), type: z.enum(['consultation','follow_up','emergency']).default('consultation'), notes: z.string().max(500).optional() });
export const cancelAppointmentSchema = z.object({ reason: z.string().max(500).optional() });
