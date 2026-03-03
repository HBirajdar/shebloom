import { z } from 'zod';
export const updateUserSchema = z.object({ fullName: z.string().min(2).max(100).optional(), dateOfBirth: z.string().optional(), language: z.enum(['ENGLISH','HINDI','TAMIL','KANNADA','TELUGU','MARATHI']).optional() });
export const updateProfileSchema = z.object({ cycleLength: z.number().int().min(20).max(45).optional(), periodLength: z.number().int().min(1).max(10).optional(), primaryGoal: z.string().optional(), interests: z.array(z.string()).optional() });
