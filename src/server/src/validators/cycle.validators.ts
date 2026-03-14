import { z } from 'zod';
export const logPeriodSchema = z.object({ startDate: z.string(), endDate: z.string().optional(), notes: z.string().max(500).optional(), flow: z.string().optional(), painLevel: z.number().int().min(0).max(10).optional(), mood: z.array(z.string()).optional(), symptoms: z.array(z.string()).optional() });
export const logSymptomsSchema = z.object({ symptoms: z.array(z.string()).min(1), severity: z.number().int().min(1).max(10).optional() });
export const logMoodSchema = z.object({ mood: z.enum(['GREAT','GOOD','OKAY','LOW','BAD']), notes: z.string().max(500).optional() });
