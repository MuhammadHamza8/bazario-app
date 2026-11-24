import bcrypt from 'bcryptjs';
import { env } from '../../config/env';
import { AppError } from '../../utils/AppError';
import { generateRefreshToken, hashToken, signAccessToken } from '../../utils/tokens';
import { User } from '../users/user.model';
import { Session } from './session.model';

/**
 * The service layer holds the business rules. It knows nothing about
 * HTTP (req/res), so the same logic could be reused or tested alone.
 */

// Cost factor: how slow hashing is. Higher = safer but slower. 10-12 is typical.
const BCRYPT_ROUNDS = 10;

/** Creates a session row and returns both tokens for the client. */
async function issueTokens(userId: string) {
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

  await Session.create({ userId, tokenHash: hashToken(refreshToken), expiresAt });

  return { accessToken: signAccessToken(userId), refreshToken };
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
  intent: 'buy' | 'sell';
}) {
  // Friendly early check. The unique index on email is the real safety net
  // (it also catches two simultaneous sign-ups).
  if (await User.exists({ email: input.email })) {
    throw new AppError('An account with this email already exists', 409);
  }

  // NEVER store a plain password. bcrypt adds a random salt and hashes it.
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  const user = await User.create({
    name: input.name,
    email: input.email,
    intent: input.intent,
    passwordHash,
    termsAcceptedAt: new Date(),
  });

  return { user, tokens: await issueTokens(user.id) };
}

export async function login(email: string, password: string) {
  // passwordHash is hidden by default, so we ask for it explicitly.
  const user = await User.findOne({ email }).select('+passwordHash');

  // Same message for "no such email" and "wrong password", so attackers
  // cannot use the login form to find out which emails are registered.
  const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !valid) throw new AppError('Invalid email or password', 401);

  return { user, tokens: await issueTokens(user.id) };
}

/**
 * Refresh-token ROTATION: each refresh token works once.
 * We delete the used one and issue a new pair. A stolen, already-used
 * token becomes useless.
 */
export async function refresh(refreshToken: string) {
  const session = await Session.findOneAndDelete({ tokenHash: hashToken(refreshToken) });
  if (!session || session.expiresAt < new Date()) {
    throw new AppError('Invalid or expired refresh token', 401);
  }
  return issueTokens(session.userId.toString());
}

/** Logout = delete the session, so the refresh token stops working. */
export async function logout(refreshToken: string) {
  await Session.deleteOne({ tokenHash: hashToken(refreshToken) });
}
