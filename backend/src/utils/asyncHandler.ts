import { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Express 4 does not catch errors thrown inside async functions.
 * This wrapper catches them and passes them to `next(err)`,
 * which sends them to our central error handler.
 *
 * Usage: router.get('/', asyncHandler(async (req, res) => { ... }));
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };
