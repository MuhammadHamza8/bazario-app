import { Schema, model } from 'mongoose';

/**
 * An item for sale. Every listing is unique (no stock, no variants).
 *
 * Some fields are DENORMALIZED (copied): categorySlug, coverImage, city.
 * Feed cards are the most-read thing in the app; having these on the listing
 * means showing a card needs no extra lookups.
 */
const listingSchema = new Schema(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: '', trim: true, maxlength: 2000 },

    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    categorySlug: { type: String, required: true },

    // Whole rupees stored as an integer. Floats cause rounding bugs with money.
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'PKR' },
    condition: { type: String, enum: ['new', 'like_new', 'used'], required: true },

    location: {
      city: { type: String, required: true, trim: true },
      citySlug: { type: String, required: true }, // lowercase version for filtering
    },

    images: { type: [String], default: [] }, // order = display order
    coverImage: { type: String, required: true }, // first image

    // removed = soft delete: the document stays, but is hidden everywhere.
    status: { type: String, enum: ['active', 'sold', 'removed'], default: 'active' },

    favoritesCount: { type: Number, default: 0 },
    viewsCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

/**
 * Indexes make queries fast (like a book's index). Without them MongoDB
 * must read every document. Each one matches a query we will run:
 */
listingSchema.index({ status: 1, createdAt: -1 }); // home feed: newest first
listingSchema.index({ categorySlug: 1, status: 1, createdAt: -1 }); // feed by category
listingSchema.index({ status: 1, price: 1 }); // feed sorted by price
listingSchema.index({ sellerId: 1, status: 1 }); // "my listings"
listingSchema.index({ title: 'text', description: 'text' }); // search

export const Listing = model('Listing', listingSchema);
