import { InferSchemaType, Schema, model } from 'mongoose';

/**
 * A Mongoose Schema describes the shape of documents in a collection.
 * Mongoose also uses it to validate data before saving.
 */
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },

    // unique: true creates an index so two users cannot share an email.
    // lowercase: true stores "A@x.com" and "a@x.com" as the same email.
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },

    // select: false = never returned by queries unless explicitly requested.
    // Prevents accidentally sending the hash to the client.
    passwordHash: { type: String, required: true, select: false },

    // Hashes of the user's recent previous passwords. Used to enforce the
    // reset screen's rule "must be different from previously used passwords".
    passwordHistory: { type: [String], default: [], select: false },

    // The register screen's "I want to buy / sell" toggle. It is a preference,
    // not a permission: every user can do both.
    intent: { type: String, enum: ['buy', 'sell'], default: 'buy' },

    termsAcceptedAt: { type: Date, required: true },
    isVerifiedSeller: { type: Boolean, default: false },
  },
  // timestamps: true adds createdAt and updatedAt automatically
  { timestamps: true },
);

/** TypeScript type generated from the schema (no need to write it twice). */
export type UserDoc = InferSchemaType<typeof userSchema>;

export const User = model('User', userSchema);
