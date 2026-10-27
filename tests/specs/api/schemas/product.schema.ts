import { z } from 'zod';

export const discountSchema = z.object({
  type: z.enum(['percentage', 'fixed']),
  value: z.number(),
});

export type DiscountResponse = z.infer<typeof discountSchema>;

export const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  sellerName: z.string(),
  category: z.string(),
  priceCents: z.number(),
  discount: discountSchema.nullable(),
  sellerId: z.number().optional(),
  description: z.string().optional(),
  effectiveCents: z.number().optional(),
  onSale: z.boolean().optional(),
  stock: z.number().optional(),
  inStock: z.boolean().optional(),
  published: z.boolean().optional(),
  images: z.array(z.string()).optional(),
  image: z.string().optional(),
});

export type ProductResponse = z.infer<typeof productSchema>;

export const productListSchema = z.object({
  products: z.array(productSchema),
  count: z.number(),
});

export type ProductListResponse = z.infer<typeof productListSchema>;
