import { z } from 'zod';

/** Every API request body is validated with zod before it touches any logic. */

export const MIN_CV_CHARS = 80;
export const MAX_CV_CHARS = 20_000;

export const ingestTextSchema = z.object({
  text: z
    .string()
    .min(MIN_CV_CHARS, 'Please paste at least a few lines of your CV.')
    .max(MAX_CV_CHARS),
  consent: z.boolean().refine((v) => v === true, 'Consent is required before analysing a CV.'),
  filename: z.string().max(200).optional(),
});

export const analyzeSchema = z.object({
  cvId: z.string().uuid().optional(),
  text: z.string().min(MIN_CV_CHARS).max(MAX_CV_CHARS).optional(),
  sampleKey: z.string().max(64).optional(),
  targetOccupationId: z.string().uuid().nullish(),
  locale: z.enum(['en', 'bn']).default('bn'),
  consent: z.boolean().optional(),
});

export const pathSchema = z.object({
  locale: z.enum(['en', 'bn']).default('bn'),
});

export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Invalid request.';
}
