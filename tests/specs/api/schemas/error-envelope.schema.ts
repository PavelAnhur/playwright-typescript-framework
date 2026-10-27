import { z } from 'zod';

export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.enum([
      'UNAUTHENTICATED',
      'INVALID_QUANTITY',
      'PRODUCT_NOT_FOUND',
      'INSUFFICIENT_STOCK',
      'ORDER_NOT_FOUND',
      'INVALID_SHIPPING',
      'CERTIFICATE_NOT_FOUND',
      'INVALID_STOCK',
      'INVALID_NAME',
      'INVALID_PRICE',
      'FORBIDDEN_NOT_OWNER',
      'CONFLICT',
      'FORBIDDEN_ROLE',
      'VALIDATION_ERROR',
      'INVALID_DISCOUNT_VALUE',
      'NOT_OWNER',
      'INVALID_IMAGE',
    ]),
    message: z.string(),
  }),
});

export type ErrorEnvelopeResponse = z.infer<typeof errorEnvelopeSchema>;

export function parseErrorEnvelope(body: unknown): ErrorEnvelopeResponse {
  const result = errorEnvelopeSchema.safeParse(body);
  if (!result.success) {
    throw new Error(`Invalid error envelope: ${JSON.stringify(result.error.issues)}`);
  }
  return result.data;
}
