import { z } from 'zod';

/** Password rules from the design: 8+ characters, 1 number, 1 symbol. */
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[0-9]/, 'Password must contain a number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a symbol');

export const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().toLowerCase().email(),
    password,
    intent: z.enum(['buy', 'sell']).default('buy'),
    // The checkbox on the register screen. Must be exactly `true`.
    acceptTerms: z.literal(true, { message: 'You must accept the Terms of Service' }),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email(),
    // No strength rules on login: we only compare against the stored hash.
    password: z.string().min(1, 'Password is required'),
  }),
});

/** Used by both /refresh and /logout. */
export const refreshSchema = z.object({
  body: z.object({ refreshToken: z.string().min(1) }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({ email: z.string().trim().toLowerCase().email() }),
});

export const resetPasswordSchema = z.object({
  body: z
    .object({
      token: z.string().min(1, 'Token is required'),
      password, // same strength rules as registration
      confirmPassword: z.string(),
    })
    // refine = custom rule across several fields (the "Confirm password" input)
    .refine((b) => b.password === b.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),
});
