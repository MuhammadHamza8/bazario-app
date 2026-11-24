import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { env } from '../../config/env';
import { AppError } from '../../utils/AppError';
import { sendMail } from '../../utils/mailer';
import { hashToken } from '../../utils/tokens';
import { User } from '../users/user.model';
import { PasswordReset } from './passwordReset.model';
import { Session } from './session.model';

const BCRYPT_ROUNDS = 10;
const HISTORY_SIZE = 5; // how many old passwords we remember

/**
 * Step 1 of the flow: the user types their email.
 *
 * SECURITY: this function never reveals whether the email exists.
 * The controller always answers with the same message. Otherwise an
 * attacker could use this form to discover who has an account.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await User.findOne({ email });
  if (!user) return; // silently do nothing

  // Only one active request per user: remove older ones.
  await PasswordReset.deleteMany({ userId: user.id });

  // The raw token goes in the email; only its hash goes in the database.
  const token = crypto.randomBytes(32).toString('hex');
  await PasswordReset.create({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + env.RESET_TOKEN_EXPIRES_MINUTES * 60 * 1000),
  });

  const link = `${env.CLIENT_URL}/reset-password?token=${token}`;

  // Deliberately NOT awaited: sending an email is slow, and a slower response
  // for existing emails would leak (through timing) that the account exists.
  sendMail(
    user.email,
    'Reset your Bazario password',
    `Hi ${user.name},\n\nUse this link to set a new password (valid for ${env.RESET_TOKEN_EXPIRES_MINUTES} minutes):\n${link}\n\nIf you did not ask for this, ignore this email.`,
  ).catch(() => {});
}

/**
 * Step 2 of the flow: the user opens the link and submits a new password.
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  // Look the request up by hash of the token. Deleting it right away means the
  // link works only once, even if two requests arrive at the same time.
  const request = await PasswordReset.findOneAndDelete({ tokenHash: hashToken(token) });
  if (!request || request.expiresAt < new Date()) {
    throw new AppError('Reset link is invalid or has expired', 400);
  }

  const user = await User.findById(request.userId).select('+passwordHash +passwordHistory');
  if (!user) throw new AppError('Reset link is invalid or has expired', 400);

  // "Must be different from previously used passwords": compare the new
  // password against the current hash and the saved history.
  const oldHashes = [user.passwordHash, ...user.passwordHistory];
  for (const oldHash of oldHashes) {
    if (await bcrypt.compare(newPassword, oldHash)) {
      throw new AppError('New password must be different from your previous passwords', 400);
    }
  }

  // Remember the current hash, keep only the most recent ones, then save the new one.
  user.passwordHistory = [user.passwordHash, ...user.passwordHistory].slice(0, HISTORY_SIZE);
  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await user.save();

  // Log the user out of every device: if someone else had access, they lose it.
  await Session.deleteMany({ userId: user.id });
}
