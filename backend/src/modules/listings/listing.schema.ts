import { z } from 'zod';

/** Only accept image URLs that WE generated in /uploads (random hex name). */
const imageUrl = z.string().regex(/^\/uploads\/[a-f0-9]{32}\.(jpg|png|webp)$/, 'Invalid image URL');

/** Same MongoDB id format check used for /listings/:id. */
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

/** Fields of the "New listing" screen. Defined once and reused for create and update. */
const fields = {
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().max(2000).optional(),
  categorySlug: z.string().trim().min(1),
  price: z.number().int('Price must be a whole number').positive('Price must be greater than 0').max(1_000_000_000),
  condition: z.enum(['new', 'like_new', 'used']),
  city: z.string().trim().min(2).max(60),
  images: z.array(imageUrl).min(1, 'Add at least 1 photo').max(8, 'Up to 8 photos'),
};

export const createListingSchema = z.object({ body: z.object(fields) });

export const updateListingSchema = z.object({
  params: z.object({ id: objectId }),
  body: z
    .object({
      ...fields,
      // The seller can mark an item as sold or re-activate it.
      status: z.enum(['active', 'sold']),
    })
    .partial() // every field becomes optional: PATCH sends only what changed
    .refine((b) => Object.keys(b).length > 0, { message: 'Nothing to update' }),
});

/** For routes that only need /:id (get, delete). */
export const listingIdSchema = z.object({ params: z.object({ id: objectId }) });

/**
 * Query-string filters for the home feed, e.g.
 *   /listings?category=vehicles&city=lahore&minPrice=1000&sort=price_asc&limit=20
 * Query values arrive as strings, so z.coerce converts them to numbers.
 */
export const feedSchema = z.object({
  query: z
    .object({
      q: z.string().trim().min(1).max(100).optional(),
      category: z.string().trim().min(1).optional(),
      city: z.string().trim().min(1).optional(),
      condition: z.enum(['new', 'like_new', 'used']).optional(),
      minPrice: z.coerce.number().int().min(0).optional(),
      maxPrice: z.coerce.number().int().min(0).optional(),
      sort: z.enum(['newest', 'price_asc', 'price_desc']).default('newest'),
      limit: z.coerce.number().int().min(1).max(50).default(20),
      cursor: z.string().max(300).optional(),
    })
    .refine((q) => q.minPrice === undefined || q.maxPrice === undefined || q.minPrice <= q.maxPrice, {
      message: 'minPrice cannot be greater than maxPrice',
      path: ['minPrice'],
    }),
});
