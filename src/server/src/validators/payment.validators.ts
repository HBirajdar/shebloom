import { z } from 'zod';

const deliveryAddressSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  phone: z.string().min(1, 'Phone is required'),
  addressLine1: z.string().min(1, 'Address line 1 is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().min(1, 'Pincode is required'),
}).strict();

const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(10),
});

export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'Cart is empty'),
  deliveryAddress: deliveryAddressSchema,
  notes: z.string().max(500).optional(),
  couponCode: z.string().max(50).optional(),
}).strict();
