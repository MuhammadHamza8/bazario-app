import { AppError } from '../../utils/AppError';
import { bumpVersion, cached, getVersion } from '../../utils/cache';
import { encodeCursor } from '../../utils/cursor';
import { slugify } from '../../utils/slug';
import { Category } from '../categories/category.model';
import { User } from '../users/user.model';
import { buildFeed, FeedQuery } from './feed.query';
import { Listing } from './listing.model';

type ListingInput = {
  title: string;
  description?: string;
  categorySlug: string;
  price: number;
  condition: 'new' | 'like_new' | 'used';
  city: string;
  images: string[];
};

/** Turns the "category slug" sent by the app into a real category, or fails. */
async function findCategory(slug: string) {
  const category = await Category.findOne({ slug, isActive: true });
  if (!category) throw new AppError('Unknown category', 400);
  return category;
}

/** Loads a listing and makes sure the logged-in user owns it. */
async function findOwnedListing(userId: string, id: string) {
  const listing = await Listing.findOne({ _id: id, status: { $ne: 'removed' } });
  if (!listing) throw new AppError('Listing not found', 404);
  // 403 = "I know who you are, but you may not do this"
  if (listing.sellerId.toString() !== userId) throw new AppError('You can only change your own listings', 403);
  return listing;
}

export async function createListing(userId: string, input: ListingInput) {
  const category = await findCategory(input.categorySlug);

  const listing = await Listing.create({
    sellerId: userId,
    title: input.title,
    description: input.description ?? '',
    categoryId: category.id,
    categorySlug: category.slug,
    price: input.price,
    condition: input.condition,
    location: { city: input.city, citySlug: slugify(input.city) },
    images: input.images,
    coverImage: input.images[0], // first photo is the cover
  });

  // Bump AFTER saving: bumping first would let a request cache the old data under the new version.
  await bumpVersion('feed'); // cached feeds are now outdated
  return listing;
}

/** Public listing page. Also counts the view. */
export async function getListing(id: string) {
  // $inc is ATOMIC: MongoDB adds 1 safely even if 100 people view at once.
  // (Read-then-write in JS would lose counts.) `new: true` returns the updated doc.
  const listing = await Listing.findOneAndUpdate(
    { _id: id, status: { $ne: 'removed' } },
    { $inc: { viewsCount: 1 } },
    { new: true },
  );
  if (!listing) throw new AppError('Listing not found', 404);

  const seller = await User.findById(listing.sellerId).select('name isVerifiedSeller createdAt');
  return { listing, seller };
}

export async function listMine(userId: string) {
  return Listing.find({ sellerId: userId, status: { $ne: 'removed' } }).sort({ createdAt: -1 });
}

export async function updateListing(userId: string, id: string, input: Partial<ListingInput> & { status?: 'active' | 'sold' }) {
  const listing = await findOwnedListing(userId, id);

  if (input.title !== undefined) listing.title = input.title;
  if (input.description !== undefined) listing.description = input.description;
  if (input.price !== undefined) listing.price = input.price;
  if (input.condition !== undefined) listing.condition = input.condition;
  if (input.status !== undefined) listing.status = input.status;

  if (input.categorySlug !== undefined) {
    const category = await findCategory(input.categorySlug);
    listing.categoryId = category._id;
    listing.categorySlug = category.slug;
  }
  // Keep the copied (denormalized) fields in sync with their source:
  if (input.city !== undefined) listing.location = { city: input.city, citySlug: slugify(input.city) };
  if (input.images !== undefined) {
    listing.images = input.images;
    listing.coverImage = input.images[0];
  }

  await listing.save();
  await bumpVersion('feed');
  return listing;
}

/** Soft delete: keep the document (orders/favourites may refer to it), hide it. */
export async function removeListing(userId: string, id: string) {
  const listing = await findOwnedListing(userId, id);
  listing.status = 'removed';
  await listing.save();
  await bumpVersion('feed');
}

/** Only the fields a feed card needs. Smaller documents = faster and lighter. */
const CARD_FIELDS = 'title price currency condition categorySlug location.city coverImage favoritesCount createdAt';

/**
 * The home / search feed. Results are cached for 60 seconds per unique query.
 * The cache key includes the "feed" version, which we bump whenever a listing
 * changes, so users never see stale data for long.
 */
export async function getFeed(query: FeedQuery) {
  const version = await getVersion('feed');
  const key = `feed:${version}:${JSON.stringify(query)}`;
  return cached(key, 60, () => queryFeed(query));
}

async function queryFeed(query: FeedQuery) {
  const { filter, sort, field } = buildFeed(query);

  // Ask for ONE extra item: if we get it, we know another page exists.
  const docs = await Listing.find(filter)
    .sort(sort)
    .limit(query.limit + 1)
    .select(CARD_FIELDS)
    .lean(); // plain JS objects, faster than full Mongoose documents

  const hasMore = docs.length > query.limit;
  const page = docs.slice(0, query.limit);
  const last: any = page[page.length - 1];

  const nextCursor =
    hasMore && last ? encodeCursor(field === 'createdAt' ? last.createdAt.toISOString() : last.price, String(last._id)) : null;

  const items = page.map((l: any) => ({
    id: String(l._id),
    title: l.title,
    price: l.price,
    currency: l.currency,
    condition: l.condition,
    category: l.categorySlug,
    city: l.location.city,
    coverImage: l.coverImage,
    favoritesCount: l.favoritesCount,
    createdAt: l.createdAt,
  }));

  return { items, nextCursor, hasMore };
}
