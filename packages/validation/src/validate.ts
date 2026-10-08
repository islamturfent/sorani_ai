import { z } from 'zod';
import { ValidationError } from '@sorani/shared';

export { z };

/** Validate and throw ValidationError (mapped to 400 at the API layer). */
export function validateOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    }));
    throw new ValidationError('Invalid request payload', details);
  }
  return result.data;
}

/** Validate returning either data or the zod error (no throw). */
export function validate<T>(schema: z.ZodType<T>, data: unknown): { ok: true; data: T } | { ok: false; error: string } {
  const result = schema.safeParse(data);
  return result.success
    ? { ok: true, data: result.data }
    : { ok: false, error: result.error.issues.map((i) => i.message).join('; ') };
}

export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  return validateOrThrow(schema, data);
}
