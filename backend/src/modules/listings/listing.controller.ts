import { Request, Response } from 'express';
import * as listingService from './listing.service';

/** Shape of a listing in API responses (only the fields the app needs). */
const toDto = (l: any) => ({
  id: l.id,
  title: l.title,
  description: l.description,
  price: l.price,
  currency: l.currency,
  condition: l.condition,
  category: l.categorySlug,
  city: l.location.city,
  images: l.images,
  coverImage: l.coverImage,
  status: l.status,
  favoritesCount: l.favoritesCount,
  viewsCount: l.viewsCount,
  createdAt: l.createdAt,
});

// req.userId is set by the `authenticate` middleware; "!" tells TypeScript it exists.

export async function create(req: Request, res: Response) {
  const listing = await listingService.createListing(req.userId!, req.body);
  res.status(201).json({ success: true, data: { listing: toDto(listing) } });
}

export async function getOne(req: Request, res: Response) {
  const { listing, seller } = await listingService.getListing(req.params.id);
  res.json({
    success: true,
    data: {
      listing: toDto(listing),
      seller: seller && { id: seller.id, name: seller.name, isVerifiedSeller: seller.isVerifiedSeller },
    },
  });
}

export async function mine(req: Request, res: Response) {
  const listings = await listingService.listMine(req.userId!);
  res.json({ success: true, data: { listings: listings.map(toDto) } });
}

export async function update(req: Request, res: Response) {
  const listing = await listingService.updateListing(req.userId!, req.params.id, req.body);
  res.json({ success: true, data: { listing: toDto(listing) } });
}

export async function remove(req: Request, res: Response) {
  await listingService.removeListing(req.userId!, req.params.id);
  res.json({ success: true, message: 'Listing removed' });
}

/** GET /api/v1/listings : the feed. `req.query` was already cleaned by validate(feedSchema). */
export async function feed(req: Request, res: Response) {
  const result = await listingService.getFeed(req.query as any);
  res.json({ success: true, data: result });
}
