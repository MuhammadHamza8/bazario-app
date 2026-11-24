import 'dotenv/config'; // reads the .env file into process.env
import { z } from 'zod';

/**
 * Describes every environment variable the app needs.
 * Zod checks them at startup, so a missing or wrong value
 * fails immediately with a clear message instead of crashing later.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // process.env values are always strings; `coerce` converts "5000" to 5000
  PORT: z.coerce.number().default(5000),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  // Secret used to sign access tokens. Anyone who knows it can forge logins,
  // so it must be long, random and never committed to git.
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 characters'),
  // Short life limits the damage if an access token is stolen.
  ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
  // Refresh tokens live longer; after this the user must log in again.
  REFRESH_TOKEN_EXPIRES_DAYS: z.coerce.number().default(7),
  // How long a password-reset link stays valid.
  RESET_TOKEN_EXPIRES_MINUTES: z.coerce.number().default(30),
  // Where the reset link points (your app's deep link or a web page).
  CLIENT_URL: z.string().default('http://localhost:3000'),
  // Redis cache. Optional: leave empty and the app works without caching.
  REDIS_URL: z.string().optional(),
  // Email (SMTP). All optional: if SMTP_HOST is empty, we use a free fake
  // inbox (Ethereal) in development and print a preview link in the console.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('Bazario <no-reply@bazario.local>'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  parsed.error.issues.forEach((i) => console.error(` - ${i.path.join('.')}: ${i.message}`));
  process.exit(1); // stop the app: it cannot run without valid config
}

/** Typed, validated config. Import this instead of using process.env directly. */
export const env = parsed.data;
