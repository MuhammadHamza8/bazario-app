import { Schema, model } from 'mongoose';

/**
 * One document per logged-in device. Stores the refresh token's HASH,
 * never the token itself (same idea as passwords: if the database leaks,
 * the stolen hashes cannot be used to log in).
 */
const sessionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },

  // TTL index: MongoDB automatically deletes the document once this date passes.
  expiresAt: { type: Date, required: true, expires: 0 },
});

export const Session = model('Session', sessionSchema);
