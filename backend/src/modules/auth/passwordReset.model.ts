import { Schema, model } from 'mongoose';

/**
 * One pending "forgot password" request.
 * Like sessions, only the token's HASH is stored: if the database leaks,
 * nobody can use the stored values to reset accounts.
 */
const passwordResetSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  // TTL index: MongoDB deletes expired requests automatically.
  expiresAt: { type: Date, required: true, expires: 0 },
});

export const PasswordReset = model('PasswordReset', passwordResetSchema);
