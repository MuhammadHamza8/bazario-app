import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

/**
 * ACCESS token: a signed JWT, short-lived, sent with every API request.
 * The server does not store it. It just verifies the signature.
 * The payload only holds the user id (`sub`), because anyone can read a JWT.
 */
export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

/** Returns the user id if the token is valid and not expired; throws otherwise. */
export function verifyAccessToken(token: string): string {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
  return payload.sub as string;
}

/**
 * REFRESH token: a random string (not a JWT), long-lived.
 * The app uses it only to get a new access token without asking for the password.
 * We store its hash in the database so we can revoke it (logout).
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

/** One-way hash (SHA-256). Fast and fine for long random tokens. */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
