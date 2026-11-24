import { RequestHandler } from 'express';
import { AppError } from '../utils/AppError';
import { verifyAccessToken } from '../utils/tokens';

/**
 * Guards a route: only requests with a valid access token get through.
 * The app sends it as a header:  Authorization: Bearer <accessToken>
 *
 * Usage: router.get('/me', authenticate, controller);
 * Afterwards the controller can read `req.userId`.
 */
export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError('Authentication required', 401);
  }

  try {
    req.userId = verifyAccessToken(header.slice(7));
    next();
  } catch {
    // Expired or tampered token. The app should call /auth/refresh then retry.
    throw new AppError('Invalid or expired token', 401);
  }
};
