import { z } from 'zod';

export const addToCartSchema = z.object({
  productId: z.string().min(1, 'productId is required'),
  qty: z.number().int().min(1).max(10).optional(),
}).strict();
