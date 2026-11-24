import { ErrorRequestHandler } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

/**
 * The single place where ALL errors end up.
 * Express recognises it as an error handler because it has 4 parameters.
 * It must be registered LAST in app.ts.
 *
 * Every error response has the same shape: { success: false, message, errors? }
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // 1. Our own deliberate errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }

  // 2. Validation errors from Zod (bad client input)
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
  }

  // 3. Upload errors from Multer (file too big, too many files)
  if (err instanceof MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Each image must be 5 MB or smaller'
        : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE'
          ? 'You can upload up to 8 images'
          : err.message;
    return res.status(400).json({ success: false, message });
  }

  // 4. MongoDB "duplicate key" error (e.g. email already registered)
  if (err?.code === 11000) {
    const field = Object.keys(err.keyValue ?? {})[0] ?? 'field';
    return res.status(409).json({ success: false, message: `${field} already exists` });
  }

  // 5. Mongoose "invalid id" error (e.g. /listings/not-a-valid-id)
  if (err?.name === 'CastError') {
    return res.status(400).json({ success: false, message: `Invalid ${err.path}` });
  }

  // 6. Anything else is an unexpected bug: log it, hide details from the client
  console.error(err);
  return res.status(500).json({
    success: false,
    message: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
};
