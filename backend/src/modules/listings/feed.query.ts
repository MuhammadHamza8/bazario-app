import { AppError } from '../../utils/AppError';
import { decodeCursor } from '../../utils/cursor';
import { slugify } from '../../utils/slug';

export type FeedQuery = {
  q?: string;
  category?: string;
  city?: string;
  condition?: 'new' | 'like_new' | 'used';
  minPrice?: number;
  maxPrice?: number;
  sort: 'newest' | 'price_asc' | 'price_desc';
  limit: number;
  cursor?: string;
};

/** Which field each sort order uses (also what the cursor remembers). */
export const sortField = (sort: FeedQuery['sort']) => (sort === 'newest' ? 'createdAt' : 'price');

/**
 * Turns the request's filters into a MongoDB filter + sort.
 * Pure function (no database access), so it is easy to reason about and test.
 *
 * WHY CURSOR PAGINATION instead of skip/limit?
 *  - skip(1000) makes MongoDB walk past 1000 documents: slower on every page.
 *  - If a new listing appears between page 1 and page 2, skip-based paging
 *    shows a duplicate. A cursor ("items older than THIS one") never does.
 */
export function buildFeed(q: FeedQuery) {
  // Only active listings are public (hides sold and removed ones).
  const filter: Record<string, any> = { status: 'active' };

  if (q.q) filter.$text = { $search: q.q }; // uses the text index
  if (q.category) filter.categorySlug = q.category;
  if (q.city) filter['location.citySlug'] = slugify(q.city);
  if (q.condition) filter.condition = q.condition;

  if (q.minPrice !== undefined || q.maxPrice !== undefined) {
    filter.price = {};
    if (q.minPrice !== undefined) filter.price.$gte = q.minPrice;
    if (q.maxPrice !== undefined) filter.price.$lte = q.maxPrice;
  }

  const field = sortField(q.sort);
  const direction = q.sort === 'price_asc' ? 1 : -1;

  // The second sort key (_id) breaks ties, so two items with the same price
  // or the same timestamp always keep a stable, predictable order.
  const sort: Record<string, 1 | -1> = { [field]: direction, _id: -1 };

  if (q.cursor) {
    const c = decodeCursor(q.cursor);
    const value = field === 'createdAt' ? new Date(c.v) : c.v;
    if ((field === 'createdAt' && isNaN((value as Date).getTime())) || (field === 'price' && typeof value !== 'number')) {
      throw new AppError('Invalid cursor', 400);
    }
    // "Items that come AFTER the cursor item in the sort order":
    //   either strictly further along on the sort field,
    //   or the same value but with a smaller _id (the tie-breaker).
    filter.$and = [
      { $or: [{ [field]: { [direction === 1 ? '$gt' : '$lt']: value } }, { [field]: value, _id: { $lt: c.id } }] },
    ];
  }

  return { filter, sort, field };
}
