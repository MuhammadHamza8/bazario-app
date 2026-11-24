import { Request, Response } from 'express';
import { AppError } from '../../utils/AppError';
import { User } from '../users/user.model';
import * as authService from './auth.service';
import * as passwordService from './password.service';

/**
 * Controllers translate HTTP <-> service calls:
 * read the request, call the service, send the response.
 * No business rules here. (Errors are handled by asyncHandler in the routes.)
 */

/** Only expose safe fields to the client. */
const publicUser = (u: { id: string; name: string; email: string; intent?: string | null; isVerifiedSeller?: boolean | null }) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  intent: u.intent,
  isVerifiedSeller: u.isVerifiedSeller,
});

export async function register(req: Request, res: Response) {
  const { user, tokens } = await authService.register(req.body);
  res.status(201).json({ success: true, data: { user: publicUser(user), ...tokens } });
}

export async function login(req: Request, res: Response) {
  const { user, tokens } = await authService.login(req.body.email, req.body.password);
  res.json({ success: true, data: { user: publicUser(user), ...tokens } });
}

export async function refresh(req: Request, res: Response) {
  const tokens = await authService.refresh(req.body.refreshToken);
  res.json({ success: true, data: tokens });
}

export async function logout(req: Request, res: Response) {
  await authService.logout(req.body.refreshToken);
  res.json({ success: true, message: 'Logged out' });
}

/** Returns the logged-in user (the Home screen's "Good morning, Ayesha"). */
export async function me(req: Request, res: Response) {
  const user = await User.findById(req.userId);
  if (!user) throw new AppError('User not found', 404);
  res.json({ success: true, data: { user: publicUser(user) } });
}

/** Always the same answer, whether or not the email exists (see password.service). */
export async function forgotPassword(req: Request, res: Response) {
  await passwordService.requestPasswordReset(req.body.email);
  res.json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
}

export async function resetPassword(req: Request, res: Response) {
  await passwordService.resetPassword(req.body.token, req.body.password);
  res.json({ success: true, message: 'Password updated. Please log in.' });
}
