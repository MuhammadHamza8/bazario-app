import { RequestHandler } from 'express';
import { z } from 'zod';

/**
 * Validates incoming request data against a Zod schema BEFORE the controller runs.
 * Never trust data from the client: check type, length and format first.
 *
 * Usage (from Step 2):
 *   const schema = z.object({ body: z.object({ email: z.string().email() }) });
 *   router.post('/login', validate(schema), controller);
 *
 * On failure a ZodError is thrown and our error handler returns a 400.
 * On success the cleaned data replaces req.body / req.query / req.params.
 */
export const validate =
  (schema: z.ZodObject<{ body?: z.ZodTypeAny; query?: z.ZodTypeAny; params?: z.ZodTypeAny }>): RequestHandler =>
  (req, _res, next) => {
    const result = schema.parse({ body: req.body, query: req.query, params: req.params }) as {
      body?: unknown;
      query?: any;
      params?: any;
    };
    if (result.body !== undefined) req.body = result.body;
    if (result.query !== undefined) req.query = result.query;
    if (result.params !== undefined) req.params = result.params;
    next();
  };
