import { z } from 'zod';

export const flatErrorEnvelopeSchema = z.object({
  error: z.string(),
  message: z.string(),
});

export type FlatErrorEnvelopeResponse = z.infer<typeof flatErrorEnvelopeSchema>;
