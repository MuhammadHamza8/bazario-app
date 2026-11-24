import { RequestHandler } from 'express';
import { AppError } from '../utils/AppError';

/** Runs only if no route matched the request. Turns it into a 404 error. */
export const notFound: RequestHandler = (req, _res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};
